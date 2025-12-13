import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { log } from '../../../log.js';

/**
 * Fill a rectangular region in an imagined structure with blocks
 */
export function createFillImaginedRegionTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'fill_imagined_region',
    description:
      'Fill a rectangular region in an imagined structure with blocks. Uses local coordinates relative to the structure center (0,0,0).',
    schema: z.object({
      engramId: z.string().describe('ID of the engram to fill'),
      startX: z.number().describe('Start X coordinate (local, relative to structure center)'),
      startY: z.number().describe('Start Y coordinate (local, relative to structure center)'),
      startZ: z.number().describe('Start Z coordinate (local, relative to structure center)'),
      endX: z.number().describe('End X coordinate (local, relative to structure center)'),
      endY: z.number().describe('End Y coordinate (local, relative to structure center)'),
      endZ: z.number().describe('End Z coordinate (local, relative to structure center)'),
      blockType: z.string().describe('Block type to fill with (e.g., "stone", "oak_planks", "dirt")'),
    }),
    func: async ({ engramId, startX, startY, startZ, endX, endY, endZ, blockType }) => {
      try {
        const entry = gameState.spatialMemory.getEngram(engramId);
        if (!entry) {
          return JSON.stringify({
            error: `Engram with ID "${engramId}" not found`,
            engramId,
          });
        }

        // Ensure start <= end for each dimension
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        const minZ = Math.min(startZ, endZ);
        const maxZ = Math.max(startZ, endZ);

        let addedCount = 0;
        let skippedCount = 0;

        for (let x = minX; x <= maxX; x++) {
          for (let y = minY; y <= maxY; y++) {
            for (let z = minZ; z <= maxZ; z++) {
              const added = entry.engram.addBlock(x, y, z, blockType);
              if (added) {
                addedCount++;
              } else {
                skippedCount++;
              }
            }
          }
        }

        log({
          agentTool: 'fill_imagined_region',
          engramId,
          region: {
            start: { x: minX, y: minY, z: minZ },
            end: { x: maxX, y: maxY, z: maxZ },
          },
          blockType,
          blocksAdded: addedCount,
          blocksSkipped: skippedCount,
        });

        return JSON.stringify({
          success: true,
          engramId,
          region: {
            start: { x: minX, y: minY, z: minZ },
            end: { x: maxX, y: maxY, z: maxZ },
          },
          blockType,
          blocksAdded: addedCount,
          blocksSkipped: skippedCount,
          totalBlocks: entry.engram.getBlockCount(),
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          engramId,
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
