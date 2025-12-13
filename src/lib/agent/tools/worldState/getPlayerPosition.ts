import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';


export const roundToNearestHalf = (num) => {
  return Math.round(num * 2) / 2;
}

export const roundPosition = (position) => {
  return {
    x: roundToNearestHalf(position.x),
    y: roundToNearestHalf(position.y),
    z: roundToNearestHalf(position.z)
  }
}

/**
 * Get the bot's current position
 */
export function createGetPlayerPositionTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_player_position',
    description:
      'Get the current position (x, y, z coordinates) of the bot in the world. Returns the exact world coordinates.',
    schema: z.object({}), // No parameters needed
    func: async () => {
      if (!gameState.playerPosition) {
        return JSON.stringify({ error: 'Player position not available' });
      }

      return JSON.stringify({
        /*x: roundToNearestHalf(gameState.playerPosition.x),
        y: roundToNearestHalf(gameState.playerPosition.y),
        z: roundToNearestHalf(gameState.playerPosition.z),*/
        ...roundPosition(gameState.playerPosition),
        pitch: gameState.pitch,
        yaw: gameState.yaw,
        headYaw: gameState.headYaw,
      });
    },
  });
}
