import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Client } from 'bedrock-protocol';
import type { GameState } from '../../../GameState.js';
import { move as moveServerCmd } from '../../../serverCommands/move.js';
import { log } from '../../../log.js';
import { botConfig } from '@/config/bot.js';
import type { Vec3, LookVector } from '../../../types.js';

/**
 * Look in a specific direction
 */
export function createLookTool(client: Client, gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'look',
    description:
      'Change the bot\'s viewing direction (where it is looking). Specify yaw (horizontal rotation) and pitch (vertical angle).',
    schema: z.object({
      yaw: z
        .number()
        .optional()
        .describe('Horizontal rotation in degrees (0-360, 0 is north)'),
      pitch: z
        .number()
        .optional()
        .describe('Vertical angle in degrees (-90 to 90, negative is down)'),
      direction: z
        .enum(['forward', 'down'])
        .optional()
        .describe('Preset direction: forward (straight ahead) or down (look down)'),
    }),
    func: async ({ yaw, pitch, direction }) => {
      if (!gameState.playerPosition || !gameState.client) {
        return JSON.stringify({ error: 'Player position or client not available' });
      }

      let finalYaw = yaw ?? gameState.yaw ?? 0;
      let finalPitch = pitch;

      // Handle preset directions
      if (direction === 'down') {
        finalPitch = botConfig.look.downOneBlockPitch;
      } else if (direction === 'forward') {
        finalPitch = botConfig.look.forwardPitch;
      } else {
        finalPitch = finalPitch ?? gameState.pitch ?? 0;
      }

      const moveVector: Vec3 = { x: 0, y: 0, z: 0 }; // No movement, just looking
      const lookVector: LookVector = {
        yaw: finalYaw,
        pitch: finalPitch,
        head_yaw: finalYaw,
      };

      try {
        moveServerCmd(client, gameState, moveVector, lookVector);
        log({ agentTool: 'look', lookVector });

        return JSON.stringify({
          success: true,
          yaw: finalYaw,
          pitch: finalPitch,
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
        });
      }
    },
  });
}
