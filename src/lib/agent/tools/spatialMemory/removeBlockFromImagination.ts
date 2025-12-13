import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { log } from '../../../log.js';

/**
 * Remove a block from an existing imagined structure (engram)
 */
export function createRemoveBlockFromImaginationTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'remove_block_from_imagination',
    description:
      'Remove a block from an existing imagined structure. Uses local coordinates relative to the structure center (0,0,0).',
    schema: z.object({
      engramId: z.string().describe('ID of the engram to remove the block from'),
      x: z.number().describe('Local X coordinate (relative to structure center at 0,0,0)'),
      y: z.number().describe('Local Y coordinate (relative to structure center at 0,0,0)'),
      z: z.number().describe('Local Z coordinate (relative to structure center at 0,0,0)'),
    }),
    func: async ({ engramId, x, y, z }) => {
      try {
        const entry = gameState.spatialMemory.getEngram(engramId);
        if (!entry) {
          return JSON.stringify({
            error: `Engram with ID "${engramId}" not found`,
            engramId,
          });
        }

        const removed = entry.engram.removeBlock(x, y, z);

        log({
          agentTool: 'remove_block_from_imagination',
          engramId,
          position: { x, y, z },
          removed,
        });

        return JSON.stringify({
          success: removed,
          engramId,
          position: { x, y, z },
          blockCount: entry.engram.getBlockCount(),
          note: removed
            ? 'Block removed successfully'
            : 'No block found at this position',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          engramId,
          position: { x, y, z },
        });
      }
    },
  });
}
