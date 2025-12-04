import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Client } from 'bedrock-protocol';
import { fill } from '../../../serverCommands/index.js';
import { log } from '../../../log.js';
import type { Vec3 } from '../../../types.js';

/**
 * Fill a region with blocks
 */
export function createFillTool(client: Client) {
  return new DynamicStructuredTool({
    name: 'fill',
    description:
      'Fill a rectangular region with blocks. Specify the start and end coordinates and the block type to place.',
    schema: z.object({
      startX: z.number().describe('Start X coordinate'),
      startY: z.number().describe('Start Y coordinate'),
      startZ: z.number().describe('Start Z coordinate'),
      endX: z.number().describe('End X coordinate'),
      endY: z.number().describe('End Y coordinate'),
      endZ: z.number().describe('End Z coordinate'),
      blockType: z
        .string()
        .describe(
          'Block type to place (e.g., "stone", "dirt", "cobblestone", "air" to remove blocks)'
        ),
    }),
    func: async ({ startX, startY, startZ, endX, endY, endZ, blockType }) => {
      try {
        const startPos: Vec3 = { x: startX, y: startY, z: startZ };
        const endPos: Vec3 = { x: endX, y: endY, z: endZ };

        fill(client, startPos, endPos, blockType);
        log({ agentTool: 'fill', startPos, endPos, blockType });

        return JSON.stringify({
          success: true,
          region: {
            start: startPos,
            end: endPos,
          },
          blockType,
          note: 'Fill command sent. Blocks will be placed when server processes the command.',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          region: {
            start: { x: startX, y: startY, z: startZ },
            end: { x: endX, y: endY, z: endZ },
          },
          blockType,
        });
      }
    },
  });
}
