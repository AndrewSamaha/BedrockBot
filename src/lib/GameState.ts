import { EventEmitter } from 'events';
import { type Client } from 'bedrock-protocol';
import PrismarineRegistryLoader, { type RegistryBedrock } from "prismarine-registry";

import { ConversationManager } from './chat/conversation.js';
import { createConnection } from './connection.js';
import { log } from './log.js';
import { buildAuthInputPacket, createRandomMoveVectorGenerator } from './playerInput/movement.js';
import { type Vec3 } from './types.js';
import { gameStateBroadcaster } from './websocket/server.js';

import { botConfig, type BotConfig } from '@/config/bot'
import { env } from '@/config/env';
import { World, type World } from './World';
import { subchunkRequest } from './serverCommands/index';
import { WorldStateRequestManager } from './agent/WorldStateRequestManager.js';

const TIC_INTERVAL = 50;
const MINECRAFT_DAY_LENGTH_IN_TICS = 24_000;

export type DAY_PHASE = 'day' | 'night' | 'sunset' | 'sunrise' | 'noon' | 'midnight';

const getDayPhase: DAY_PHASE = (gameTime: number) => {
  const timeOfDay = (
    (gameTime % MINECRAFT_DAY_LENGTH_IN_TICS) +
    MINECRAFT_DAY_LENGTH_IN_TICS
  ) % MINECRAFT_DAY_LENGTH_IN_TICS;
  if (timeOfDay < 12000) return 'day';
  if (timeOfDay < 13000) return 'sunset';
  if (timeOfDay < 23000) return 'night';
  return 'sunrise';
}

export class GameState extends EventEmitter {
  private static instance: GameState | null = null;
  botConfig: BotConfig;
  playerPosition: Vec3 | undefined;
  pitch: number | undefined;
  yaw: number | undefined;
  headYaw: number | undefined;
  rotation: unknown;
  entityId: number | undefined;
  runtimeEntityId: number | undefined;
  permissionLevel: string | undefined;
  lastTic: number;
  client: Client | undefined;
  spawned: boolean;
  seed: string | undefined;
  currentTick: bigint | undefined;
  nextRandomMove: void;
  commandsEnabled: boolean | undefined;
  gameRules: unknown | undefined;
  attributes: unknown | undefined;
  conversationManager: undefined | ConversationManager;
  agentExecutor: undefined | any; // AgentExecutor - avoid circular import
  sleeping: boolean | undefined;
  reconnectTimeout: NodeJS.Timeout | null = null;
  isReconnecting: boolean;
  gameTime: number | undefined;
  lastGameTimeRealTime: number | undefined;
  dayPhase: DAY_PHASE | undefined;
  overworldPlayerCount: number | undefined;
  sleepingPlayerCount: number | undefined;
  ableToSleep: number | undefined;
  world: World;
  registry: RegistryBedrock | undefined;
  receivedSubChunks: number[][];
  playerList: unknown[];
  worldStateRequestManager: WorldStateRequestManager | undefined;

  private ticInterval: NodeJS.Timeout | null = null;
  private lastBroadcastTime: number = 0;
  private readonly BROADCAST_THROTTLE_MS = 50; // Broadcast at most every 50ms (~20fps)
  private lastHeartbeatTime: number = 0;
  private readonly HEARTBEAT_INTERVAL_MS = 5000; // Run heartbeat every 5 seconds

  private constructor() {
    super(); // Initialize EventEmitter
    this.world = new World();
    this.spawned = false;
    this.lastTic = 0;
    this.headYaw = 0;
    this.nextRandomMove = createRandomMoveVectorGenerator(botConfig.movement);
    this.conversationManager = new ConversationManager(env.BEDROCK_USERNAME);
    this.sleeping = false;
    this.isReconnecting = false;
    this.botConfig = botConfig;
    this.receivedSubChunks = [];
    this.playerList = [];
    // Initialize RequestManager with EventEmitter subscriptions
    this.worldStateRequestManager = new WorldStateRequestManager(this);
  }

  static getInstance(): GameState {
    if (!GameState.instance) {
      GameState.instance = new GameState();
    }

    return GameState.instance;
  }

  setTime(gameTime: number) {
    if (this.gameTime !== undefined) {
      const gameTimeDiff = gameTime - this.gameTime;
      const realTimeDiff = Date.now() - this.lastGameTimeRealTime;
    }
    this.gameTime = gameTime;
    this.lastGameTimeRealTime = Date.now();
    this.dayPhase = getDayPhase(this.gameTime);
    this.broadcastUpdate();
  }

  checkAutoReconnect() {
    if (!this.botConfig.night.autoDisconnectAtNight) return;
    if (this.sleepingPlayerCount <= 0) return;

    if ((this.overworldPlayerCount ?? 0) - (this.sleepingPlayerCount ?? 0) > 1) return;

    const durationMs = this.botConfig.night.autoDisconnectAtNightDurationMs;
    this.reconnect(durationMs).catch((err) => {
      console.error('Reconnect error:', err);
      log({ reconnect_error: err });
    });
  }

  startGame(client: Client, packet: any) {
    this.client = client;
    if (this.spawned) {
      return;
    }

    // Initialize registry
    this.registry = PrismarineRegistryLoader('bedrock_1.21.111');
    const block_network_ids_are_hashes = packet?.block_network_ids_are_hashes ?? true;
    this.registry.handleStartGame({ itemstates: [], block_network_ids_are_hashes });

    this.spawned = true;
    this.seed = packet?.seed;
    this.entityId = packet?.entity_id;
    this.runtimeEntityId = packet?.runtime_entity_id;
    this.playerPosition = packet?.player_position as Vec3;
    this.rotation = packet?.rotation;
    this.permissionLevel = packet?.permission_level;
    this.currentTick = packet?.current_tick;
    this.startTic();
    this.broadcastUpdate();
  }

  playerHasDied() {
    this.spawned = false;
    setTimeout(() => {
      console.log(`Sending respawn command for runtimeEntityId ${this.runtimeEntityId}`)
      this.client.write('respawn',  {
        position: {
          x: 0,
          y: 0,
          z: 0
        } ,
        state: 2,
        runtime_entity_id: `${this.runtimeEntityId}`
      });
    }, 1500);


    setTimeout(() => {
      console.log(`Sending player_action command for runtimeEntityId ${this.runtimeEntityId}`);
      this.client.write('player_action', {
        runtime_entity_id: `${this.runtimeEntityId}`,
        action: 7,
        position: {
          x: 0,
          y: 0,
          z: 0
        },
        result_position: {
          x: 0,
          y: 0,
          z: 0
        },
        face: -1
      });
    }, 2500);
  }

  spawn() {
    this.spawned = true;
  }

  startTic() {
    if (this.ticInterval) {
      console.log('Tic interval already running, clearing previous interval');
      clearInterval(this.ticInterval);
    }

    this.ticInterval = setInterval(() => {
      this.tic();
    }, TIC_INTERVAL);

    console.log(`Started tic interval with ${TIC_INTERVAL}ms interval`);
  }

  randomMove() {
    // Check if we have a valid position before trying to move
    if (!this.playerPosition || typeof this.playerPosition !== 'object' ||
        typeof this.playerPosition.x !== 'number' ||
        typeof this.playerPosition.y !== 'number' ||
        typeof this.playerPosition.z !== 'number') {
      console.log('No valid position available for movement');
      return;
    }

    const moveVector = this.nextRandomMove();
    const { newState, packet } = buildAuthInputPacket({
      currentPos: this.playerPosition,
      currentRot: {
        yaw: this.yaw || 0,
        pitch: this.pitch || 0,
        head_yaw: this.headYaw || 0,
      },
      moveVector,
      tick: this.currentTick ? this.currentTick + 1n : 0n,
      sprint: false
    });

    // Update state
    this.playerPosition = newState.position;
    this.pitch = newState.rotation.pitch;
    this.yaw = newState.rotation.yaw;
    this.headYaw = newState.rotation.headYaw || 0;

    log({ player_auth_input: packet });
    this.client.queue('player_auth_input', packet.params);
  }

  sendPlayerAuthInputPacket() {
    // Check if we have a valid position before trying to move
    if (!this.playerPosition || typeof this.playerPosition !== 'object' ||
        typeof this.playerPosition.x !== 'number' ||
        typeof this.playerPosition.y !== 'number' ||
        typeof this.playerPosition.z !== 'number') {
      console.log('No valid position available for movement');
      return;
    }

    const moveVector = {
      x: 0,
      y: 0,
      z: 0
    };

    const { newState, packet } = buildAuthInputPacket({
      currentPos: this.playerPosition,
      currentRot: {
        yaw: this.yaw || 0,
        pitch: this.pitch || 0,
        head_yaw: this.headYaw || 0,
      },
      moveVector,
      tick: this.currentTick ? this.currentTick + 1n : 0n,
      sprint: false
    });

    // Update state
    this.playerPosition = newState.position;
    this.pitch = newState.rotation.pitch;
    this.yaw = newState.rotation.yaw;
    this.headYaw = newState.rotation.headYaw || 0;
    packet.params.input_data.vertical_collision = this.sleeping ? false : packet.params.input_data.vertical_collision;

    log({ player_auth_input: packet });
    this.client.queue('player_auth_input', packet.params);
  }


  setPositionFromServer({ position, pitch, yaw, head_yaw }: any) {
    if (position) this.playerPosition = {
      x: position.x ?? this.playerPosition.x,
      y: position.y ?? this.playerPosition.y,
      z: position.z ?? this.playerPosition.z
    };
    if (pitch) this.pitch = pitch;
    if (yaw) this.yaw = yaw;
    if (head_yaw) this.headYaw = head_yaw;
    this.broadcastUpdate();
  }

  move(newPosition: any, newRotation: any) {
    // Check if we have a valid runtime entity ID
    if (!this.runtimeEntityId) {
      console.error('Cannot move: runtimeEntityId is not set');
      return;
    }

    // https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.18.0&d=protocol#packet_move_player
    const movePlayerObj = {
      runtime_id: Number(this.runtimeEntityId), // Convert BigInt to number
      position: newPosition,
      pitch: newRotation?.pitch || 0, // Provide default value instead of undefined
      yaw: newRotation?.yaw || 0, // Provide default value instead of undefined
      head_yaw: newRotation?.head_yaw || newRotation?.yaw || 0, // Use yaw as fallback for head_yaw
      mode: 0,
      on_ground: true,
      ridden_runtime_id: 0,
      tick: this.currentTick, // + 5n, // Use BigInt arithmetic
      //teleport:
    };
    //log({ sending: movePlayerObj })
    this.client.queue('move_player', movePlayerObj);
  }

  /**
   * Heartbeat method that runs periodically (every 5 seconds)
   * Contains logic that should run on a regular schedule regardless of server tick timing
   */
  heartbeat() {
    const now = Date.now();

    // Log position and rotation
    if (this.playerPosition) {
      const { x, y, z } = this.playerPosition;
      const { yaw, pitch, headYaw } = this;
      console.log(`${this.currentTick} - ${new Date().toISOString()} - ${x}, ${y}, ${z} - ${yaw} ${pitch} ${headYaw}`);
    }

    // Request subchunk data
    if (this.playerPosition && this.spawned && this.client) {
      subchunkRequest(this.client, this);
    }
  }

  tic() {
    this.lastTic = Date.now();

    // Check if it's time to run heartbeat (every 5 seconds)
    const now = Date.now();
    if (now - this.lastHeartbeatTime >= this.HEARTBEAT_INTERVAL_MS) {
      this.lastHeartbeatTime = now;
      this.heartbeat();
    }

    // Add additional tic logic here
    if (this.playerPosition && this.spawned) {
      this.sendPlayerAuthInputPacket();
      this.broadcastUpdate();
      return;
    } else {
      console.log('waiting to spawn')
    }
  }

  // Method to stop the tic interval (useful for cleanup)
  stopTic() {
    if (this.ticInterval) {
      clearInterval(this.ticInterval);
      this.ticInterval = null;
      console.log('Tic interval stopped');
    }
  }

  // Method to check if tic is running
  isTicRunning(): boolean {
    return this.ticInterval !== null;
  }

  setTick(packet: any) {
    this.currentTick = packet?.tick;
    //this.position = position;
    //console.log({ currentTick: this.currentTick })
  }

  /**
   * Broadcasts gamestate updates to connected WebSocket clients.
   * Throttled to avoid excessive updates.
   */
  private broadcastUpdate(): void {
    const now = Date.now();
    if (now - this.lastBroadcastTime < this.BROADCAST_THROTTLE_MS) {
      return; // Throttle updates
    }
    this.lastBroadcastTime = now;
    gameStateBroadcaster.broadcast(this);
  }

  /**
   * Disconnects from the server
   */
  disconnect(): void {
    // Cancel any pending reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.client) {
      console.log('Disconnecting from server...');
      this.stopTic();
      this.spawned = false;

      // Close the client connection
      try {
        this.client.close();
      } catch (err) {
        console.error('Error closing client:', err);
      }

      this.client = undefined;
      console.log('Disconnected from server');
    }

    // Reset reconnecting flag if we're manually disconnecting
    this.isReconnecting = false;
  }

  /**
   * Disconnects, waits for the specified duration, then reconnects
   * @param pauseDurationMs - Duration to wait before reconnecting in milliseconds (default: 30000)
   */
  async reconnect(pauseDurationMs: number = 30000): Promise<void> {
    if (this.isReconnecting) {
      console.log('Reconnection already in progress, skipping...');
      return;
    }

    this.isReconnecting = true;
    console.log(`Initiating reconnect: disconnecting, waiting ${pauseDurationMs}ms, then reconnecting...`);

    // Disconnect first
    this.disconnect();

    // Wait for the specified duration
    await new Promise<void>((resolve) => {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        resolve();
      }, pauseDurationMs);
    });

    // Reconnect
    console.log('Attempting to reconnect...');
    const newClient = await createConnection();

    if (newClient) {
      console.log('Reconnection successful');
      // The client will be set in gameState via the start_game handler
      // when the server sends the start_game packet
    } else {
      console.error('Reconnection failed');
    }

    this.isReconnecting = false;
  }

  /**
   * Add a received subchunk and emit event for RequestManager.
   * This method should be called by packet handlers instead of directly mutating receivedSubChunks.
   * @param x Chunk X coordinate
   * @param y Subchunk Y index
   * @param z Chunk Z coordinate
   */
  addReceivedSubchunk(x: number, y: number, z: number): void {
    // Check if already in array to avoid duplicates
    const alreadyReceived = this.receivedSubChunks.some(
      ([cx, cy, cz]) => cx === x && cy === y && cz === z
    );

    if (!alreadyReceived) {
      this.receivedSubChunks.push([x, y, z]);
    }

    // Emit event for RequestManager and other subscribers
    this.emit('subchunk-received', { x, y, z });
    // log({ gameState: 'subchunk-added', coords: { x, y, z }, alreadyReceived });
  }

  /**
   * Add a received chunk and emit event for RequestManager.
   * This method should be called by packet handlers after setting chunk data in world.
   * @param x Chunk X coordinate
   * @param z Chunk Z coordinate
   */
  addReceivedChunk(x: number, z: number): void {
    // Emit event for RequestManager and other subscribers
    // Note: Chunk data is already stored in this.world by the handler
    this.emit('chunk-received', { x, z });
    //log({ gameState: 'chunk-added', coords: { x, z } });
  }
}

export const gameState = GameState.getInstance();

