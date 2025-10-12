import { log } from './log';

const TIC_INTERVAL = 5_000;

class GameState {
  playerPosition: unknown;
  rotation: unknown;
  entityId: number | undefined;
  runtimeEntityId: number | undefined;
  permissionLevel: string | undefined;
  lastTic: number;
  client: unknown;
  spawned: boolean;
  seed: string | undefined;
  currentTick: bigint | undefined;

  private ticInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.spawned = false;
    this.lastTic = 0;
  }

  startGame(client: unknown, packet: unknown) {
    this.client = client;
    if (this.spawned) {
      return;
    }

    this.spawned = true;
    this.seed = packet?.seed;
    this.entityId = packet?.entity_id;
    this.runtimeEntityId = packet?.runtime_entity_id;
    this.playerPosition = packet?.player_position;
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
    const newPosition = {
      x: this.playerPosition.x + (Math.random() - 0.5) * 2, // Add some random movement
      y: this.playerPosition.y,
      z: this.playerPosition.z + (Math.random() - 0.5) * 2
    };
    const newRotation = {
      yaw: Math.floor(Math.random() * 360),
      pitch: 0,
      headYaw: Math.floor(Math.random() * 360) // Add headYaw for head_yaw field
    }
    this.move(newPosition, newRotation);
  }

  move(newPosition, newRotation) {
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
      head_yaw: newRotation?.headYaw || newRotation?.yaw || 0, // Use yaw as fallback for head_yaw
      mode: 0,
      on_ground: true,
      ridden_runtime_id: 0,
      tick: this.currentTick, // + 5n, // Use BigInt arithmetic
      //teleport:
    };
    log({ sending: movePlayerObj })
    this.client.queue('move_player', movePlayerObj);
  }

  tic() {
    this.lastTic = Date.now();
    // Add your tic logic here
    if (this.playerPosition) {
      const { x, y, z } = this.playerPosition;
      console.log(`${this.currentTick} Tic executed at ${new Date().toISOString()} ${x}, ${y}, ${z} `);
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

  setTick(packet: unknown) {
    this.currentTick = packet?.tick;
    //this.position = position;
    //console.log({ currentTick: this.currentTick })
  }
}

export const gameState = new GameState();

