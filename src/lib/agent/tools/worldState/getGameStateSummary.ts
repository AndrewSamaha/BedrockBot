import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';

/**
 * Get current game state summary
 */
export function createGetGameStateSummaryTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_game_state_summary',
    description:
      'Get a summary of the current game state including position, time of day, player count, and loaded chunks. Useful for understanding the current situation.',
    schema: z.object({}),
    func: async () => {
      return JSON.stringify({
        spawned: gameState.spawned,
        position: gameState.playerPosition,
        rotation: {
          pitch: gameState.pitch,
          yaw: gameState.yaw,
          headYaw: gameState.headYaw,
        },
        gameTime: gameState.gameTime,
        dayPhase: gameState.dayPhase,
        playerCounts: {
          overworld: gameState.overworldPlayerCount,
          sleeping: gameState.sleepingPlayerCount,
          ableToSleep: gameState.ableToSleep,
        },
        world: {
          chunkCount: gameState.world.getChunkCount(),
          loadedChunks: gameState.world.getAllChunkCoords().length,
        },
        timestamp: Date.now(),
      });
    },
  });
}
