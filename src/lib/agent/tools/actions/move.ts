import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Client } from 'bedrock-protocol';
import type { GameState } from '../../../GameState.js';
import { move as moveServerCmd } from '../../../serverCommands/move.js';
import { log } from '../../../log.js';
import type { Vec3, LookVector } from '../../../types.js';

/**
 * Move the bot to a new position
 */
export function createMoveTool(client: Client, gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'move',
    description:
      'Move the bot to a new position. Specify the target position (x, y, z) and optionally the direction to look (yaw, pitch). The bot will move towards the target position.',
    schema: z.object({
      x: z.number().describe('Target X coordinate'),
      y: z.number().describe('Target Y coordinate'),
      z: z.number().describe('Target Z coordinate'),
      yaw: z
        .number()
        .optional()
        .describe('Direction to look (yaw angle in degrees, 0-360)'),
      pitch: z
        .number()
        .optional()
        .describe('Pitch angle in degrees (-90 to 90, negative is down)'),
    }),
    func: async ({ x, y, z, yaw, pitch }) => {
      if (!gameState.playerPosition) {
        return JSON.stringify({ error: 'Player position not available' });
      }

      if (!gameState.client) {
        return JSON.stringify({ error: 'Client not connected' });
      }

      // Calculate movement vector (direction to move)
      const dx = x - gameState.playerPosition.x;
      const dy = y - gameState.playerPosition.y;
      const dz = z - gameState.playerPosition.z;

      // Normalize movement vector (limit to reasonable speed)
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const maxMoveDistance = 0.1; // Limit per tick
      const moveVector: Vec3 = {
        x: distance > maxMoveDistance ? (dx / distance) * maxMoveDistance : dx,
        y: distance > maxMoveDistance ? (dy / distance) * maxMoveDistance : dy,
        z: distance > maxMoveDistance ? (dz / distance) * maxMoveDistance : dz,
      };

      // Use provided yaw/pitch or current rotation
      const lookVector: LookVector = {
        yaw: yaw ?? gameState.yaw ?? 0,
        pitch: pitch ?? gameState.pitch ?? 0,
        head_yaw: yaw ?? gameState.headYaw ?? 0,
      };

      try {
        moveServerCmd(client, gameState, moveVector, lookVector);
        log({ agentTool: 'move', target: { x, y, z }, moveVector, lookVector });

        return JSON.stringify({
          success: true,
          target: { x, y, z },
          currentPosition: gameState.playerPosition,
          distance: Math.sqrt(
            Math.pow(x - gameState.playerPosition.x, 2) +
              Math.pow(y - gameState.playerPosition.y, 2) +
              Math.pow(z - gameState.playerPosition.z, 2)
          ),
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          target: { x, y, z },
        });
      }
    },
  });
}
