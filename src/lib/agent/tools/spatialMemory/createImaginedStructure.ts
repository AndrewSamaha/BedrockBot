import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { SpatialEngram } from '../../../spatialMemory/SpatialEngram.js';
import { log } from '../../../log.js';

/**
 * Create a new imagined structure (SpatialEngram) from scratch
 */
export function createCreateImaginedStructureTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'create_imagined_structure',
    description:
      'Create a new imagined structure (engram) with blocks. The structure uses local coordinates centered at (0,0,0). You can add blocks to it later using add_block_to_imagination. The structure can have up to 512 blocks by default.',
    schema: z.object({
      name: z.string().describe('Name of the imagined structure (e.g., "Small House", "Tower")'),
      description: z
        .string()
        .describe('Description of what this structure represents (e.g., "A small stone house with a wooden roof")'),
      blocks: z
        .array(
          z.object({
            x: z.number().describe('Local X coordinate (relative to structure center at 0,0,0)'),
            y: z.number().describe('Local Y coordinate (relative to structure center at 0,0,0)'),
            z: z.number().describe('Local Z coordinate (relative to structure center at 0,0,0)'),
            blockType: z.string().describe('Block type (e.g., "stone", "oak_planks", "dirt")'),
          })
        )
        .describe('Array of blocks to add to the structure'),
      maxBlocks: z
        .number()
        .optional()
        .describe('Maximum number of blocks allowed (defaults to 512)'),
    }),
    func: async ({ name, description, blocks, maxBlocks }) => {
      try {
        const engram = new SpatialEngram(name, description, maxBlocks ?? 512);

        let addedCount = 0;
        let skippedCount = 0;

        for (const block of blocks) {
          const added = engram.addBlock(block.x, block.y, block.z, block.blockType);
          if (added) {
            addedCount++;
          } else {
            skippedCount++;
          }
        }

        // Add engram to spatial memory at origin (0,0,0) - can be repositioned later
        const engramId = gameState.spatialMemory.addEngram(engram, { x: 0, y: 0, z: 0 });

        log({
          agentTool: 'create_imagined_structure',
          engramId,
          name,
          description,
          blocksAdded: addedCount,
          blocksSkipped: skippedCount,
        });

        return JSON.stringify({
          success: true,
          engramId,
          name,
          description,
          blocksAdded: addedCount,
          blocksSkipped: skippedCount,
          totalBlocks: engram.getBlockCount(),
          note: 'Structure created. Use add_block_to_imagination to add more blocks, or use build_imagined_structure to build it in the game world.',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          name,
          description,
        });
      }
    },
  });
}
