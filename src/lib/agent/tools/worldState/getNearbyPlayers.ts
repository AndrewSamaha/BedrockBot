import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { roundPosition } from './getPlayerPosition';

/**
 * Get nearby players
 */
export function createGetNearbyPlayersTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_nearby_players',
    description:
      'Get a list of players currently in the world, including their positions and rotations. Useful for understanding who is nearby.',
    schema: z.object({
      maxDistance: z
        .number()
        .optional()
        .describe(
          'Maximum distance to search for players. If not provided, returns all players.'
        ),
    }),
    func: async ({ maxDistance }) => {
      if (!gameState.playerList || gameState.playerList.length === 0) {
        return JSON.stringify({ players: [] });
      }

      let players = gameState.playerList as Array<{
        username: string;
        position: { x: number; y: number; z: number };
        pitch?: number;
        yaw?: number;
        head_yaw?: number;
      }>;

      // Filter by distance if maxDistance provided
      if (maxDistance && gameState.playerPosition) {
        const botPos = gameState.playerPosition;
        players = players.filter((player) => {
          const dx = player.position.x - botPos.x;
          const dy = player.position.y - botPos.y;
          const dz = player.position.z - botPos.z;
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
          return distance <= maxDistance;
        });
      }

      return JSON.stringify({
        players: players.map((p) => ({
          username: p.username,
          position: p.position,
          pitch: p.pitch,
          yaw: p.yaw,
          head_yaw: p.head_yaw,
        })),
        count: players.length,
      });
    },
  });
}
