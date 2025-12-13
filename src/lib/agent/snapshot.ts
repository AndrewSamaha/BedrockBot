import type { GameState } from '../GameState.js';
import type { GameStateSnapshot } from '../websocket/server.js';

/**
 * Create a snapshot of GameState for agent use.
 * This provides a point-in-time, read-only view of the current game state.
 * 
 * @param gameState - The GameState instance to snapshot
 * @returns A snapshot object with current state
 */
export function createGameStateSnapshot(gameState: GameState): GameStateSnapshot {
  const snapshot: GameStateSnapshot = {
    spawned: gameState.spawned,
    timestamp: Date.now(),
  };

  // Player position and rotation
  if (gameState.playerPosition) {
    snapshot.playerPosition = {
      x: gameState.playerPosition.x,
      y: gameState.playerPosition.y,
      z: gameState.playerPosition.z,
    };
  }

  if (gameState.pitch !== undefined) snapshot.pitch = gameState.pitch;
  if (gameState.yaw !== undefined) snapshot.yaw = gameState.yaw;
  if (gameState.headYaw !== undefined) snapshot.headYaw = gameState.headYaw;

  // Entity information
  if (gameState.entityId !== undefined) snapshot.entityId = gameState.entityId;
  if (gameState.runtimeEntityId !== undefined) {
    snapshot.runtimeEntityId = gameState.runtimeEntityId;
  }

  // Game time and day phase
  if (gameState.gameTime !== undefined) snapshot.gameTime = gameState.gameTime;
  if (gameState.dayPhase !== undefined) {
    snapshot.dayPhase = gameState.dayPhase;
  }

  // Handle BigInt serialization for currentTick
  if (gameState.currentTick !== undefined) {
    snapshot.currentTick = gameState.currentTick.toString();
  }

  // Player counts
  if (gameState.overworldPlayerCount !== undefined) {
    snapshot.overworldPlayerCount = gameState.overworldPlayerCount;
  }
  if (gameState.sleepingPlayerCount !== undefined) {
    snapshot.sleepingPlayerCount = gameState.sleepingPlayerCount;
  }
  if (gameState.ableToSleep !== undefined) {
    snapshot.ableToSleep = gameState.ableToSleep;
  }

  // World/chunk information
  snapshot.chunkCount = gameState.world.getChunkCount();
  snapshot.chunkCoords = gameState.world.getAllChunkCoords();

  // Player's current chunk information
  if (gameState.playerPosition && gameState.registry) {
    const cx = Math.floor(gameState.playerPosition.x / 16);
    const cz = Math.floor(gameState.playerPosition.z / 16);
    const cy = Math.floor(gameState.playerPosition.y / 16);

    try {
      const highestBlocks = gameState.world.getHighestBlocksInChunk(cx, cz);
      snapshot.playerChunkHighestBlocks = highestBlocks.map(([lx, ly, lz]) => ({
        x: cx * 16 + lx,
        y: ly,
        z: cz * 16 + lz,
      }));

      const blockStats = gameState.world.getChunkBlockStats(cx, cz);
      snapshot.playerChunkBlockStats = blockStats;

      // Get blocks from player's current subchunk
      snapshot.playerSubchunkBlocks = gameState.world.getAllBlocksInSubchunk(
        cx,
        cy,
        cz,
        gameState.registry
      );
    } catch (error) {
      // If chunk data not available, leave undefined
      // This is expected if chunks haven't loaded yet
    }
  }

  // Player list
  if (gameState.playerList && Array.isArray(gameState.playerList)) {
    snapshot.playerList = gameState.playerList.map((player: any) => {
      const playerData: GameStateSnapshot['playerList']![0] = {
        username: player.username || 'Unknown',
        position: {
          x: player.position?.x ?? 0,
          y: player.position?.y ?? 0,
          z: player.position?.z ?? 0,
        },
      };

      if (player.pitch !== undefined) playerData.pitch = player.pitch;
      if (player.yaw !== undefined) playerData.yaw = player.yaw;
      if (player.head_yaw !== undefined) playerData.head_yaw = player.head_yaw;

      return playerData;
    });
  }

  return snapshot;
}
