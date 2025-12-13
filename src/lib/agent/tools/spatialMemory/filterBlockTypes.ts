import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { log } from '../../../log.js';

/**
 * Filter out specific block types from an imagined structure (engram)
 */
export function createFilterBlockTypesTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'filter_block_types',
    description:
      'Remove all blocks of specific types from an imagined structure. Useful for removing air blocks, water blocks, or any other unwanted block types.',
    schema: z.object({
      engramId: z.string().describe('ID of the engram to filter'),
      blockTypes: z
        .array(z.string())
        .describe('Array of block types to remove (e.g., ["air"], ["water", "flowing_water"], ["air", "cave_air"])'),
    }),
    func: async ({ engramId, blockTypes }) => {
      try {
        const entry = gameState.spatialMemory.getEngram(engramId);
        if (!entry) {
          return JSON.stringify({
            error: `Engram with ID "${engramId}" not found`,
            engramId,
          });
        }

        const blockTypesSet = new Set(blockTypes.map((bt) => bt.toLowerCase()));
        let removedCount = 0;

        // Get all blocks and filter out matching types
        const allBlocks = entry.engram.getAllBlocks();
        const blocksToRemove: Array<{ x: number; y: number; z: number }> = [];

        for (const block of allBlocks) {
          if (blockTypesSet.has(block.blockType.toLowerCase())) {
            blocksToRemove.push({ x: block.x, y: block.y, z: block.z });
          }
        }

        // Remove the blocks
        for (const pos of blocksToRemove) {
          if (entry.engram.removeBlock(pos.x, pos.y, pos.z)) {
            removedCount++;
          }
        }

        log({
          agentTool: 'filter_block_types',
          engramId,
          blockTypes,
          removedCount,
          remainingBlocks: entry.engram.getBlockCount(),
        });

        return JSON.stringify({
          success: true,
          engramId,
          blockTypes,
          removedCount,
          remainingBlocks: entry.engram.getBlockCount(),
          note: `Removed ${removedCount} blocks of type(s) ${blockTypes.join(', ')}`,
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          engramId,
          blockTypes,
        });
      }
    },
  });
}
