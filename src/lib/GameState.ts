import { buildAuthInputPacket, createRandomMoveVectorGenerator, type Vec3 } from './playerInput/movement.js'

const TIC_INTERVAL = 50;

class GameState {
  playerPosition: unknown;
  pitch: number | undefined;
  yaw: number | undefined;
  headYaw: number | undefined;
  rotation: unknown;
  entityId: number | undefined;
  runtimeEntityId: number | undefined;
  permissionLevel: string | undefined;
  lastTic: number;
  client: unknown;
  spawned: boolean;
  seed: string | undefined;
  currentTick: bigint | undefined;
  nextRandomMove: void;
  commandsEnabled: boolean | undefined;
  gameRules: unknown | undefined;
  attributes: unknown | undefined;


  private ticInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.spawned = false;
    this.lastTic = 0;
    this.headYaw = 0;
    this.nextRandomMove = createRandomMoveVectorGenerator({
      maxSpeedBps: 4.3,
      wanderPerTick: 0.10,
      friction: 0.14
    });
  }

  startGame(client: unknown, packet: any) {
    this.client = client;
    if (this.spawned) {
      return;
    }

    this.spawned = true;
    this.seed = packet?.seed;
    this.entityId = packet?.entity_id;
    this.runtimeEntityId = packet?.runtime_entity_id;
    this.playerPosition = packet?.player_position as Vec3;
    this.rotation = packet?.rotation;
    this.permissionLevel = packet?.permission_level;
    this.currentTick = packet?.current_tick;
    this.startTic();
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

    //log({ player_auth_input: packet });
    this.client.queue('player_auth_input', packet);
  }

  setPositionFromServer({ position, pitch, yaw, head_yaw }: any) {
    this.playerPosition = position;
    this.pitch = pitch;
    this.yaw = yaw;
    this.headYaw = head_yaw;
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

  tic() {
    if (this.currentTick % 50n === 0n) {
      const { x, y, z } = this.playerPosition;
      const { yaw, pitch, headYaw } = this;
      console.log(`${this.currentTick} - ${new Date().toISOString()} - ${x}, ${y}, ${z} - ${yaw} ${pitch} ${headYaw}`);
    }
    this.lastTic = Date.now();
    // Add your tic logic here
    if (this.playerPosition) {
      this.randomMove();
      return;
    }
    console.log(`Tic executed at ${new Date().toISOString()} - no position reported`);
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
}

export const gameState = new GameState();

