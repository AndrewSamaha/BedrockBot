import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { log } from '../../../log.js';

/**
 * Add a single block to an existing imagined structure (engram)
 */
export function createAddBlockToImaginationTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'add_block_to_imagination',
    description:
      'Add a single block to an existing imagined structure. Uses local coordinates relative to the structure center (0,0,0).',
    schema: z.object({
      engramId: z.string().describe('ID of the engram to add the block to'),
      x: z.number().describe('Local X coordinate (relative to structure center at 0,0,0)'),
      y: z.number().describe('Local Y coordinate (relative to structure center at 0,0,0)'),
      z: z.number().describe('Local Z coordinate (relative to structure center at 0,0,0)'),
      blockType: z.string().describe('Block type to place (e.g., "stone", "oak_planks", "dirt")'),
    }),
    func: async ({ engramId, x, y, z, blockType }) => {
      try {
        const entry = gameState.spatialMemory.getEngram(engramId);
        if (!entry) {
          return JSON.stringify({
            error: `Engram with ID "${engramId}" not found`,
            engramId,
          });
        }

        const added = entry.engram.addBlock(x, y, z, blockType);

        log({
          agentTool: 'add_block_to_imagination',
          engramId,
          position: { x, y, z },
          blockType,
          added,
        });

        if (!added) {
          return JSON.stringify({
            success: false,
            engramId,
            position: { x, y, z },
            blockType,
            note: 'Block not added. May have reached maxBlocks limit or block already exists at this position.',
            blockCount: entry.engram.getBlockCount(),
          });
        }

        return JSON.stringify({
          success: true,
          engramId,
          position: { x, y, z },
          blockType,
          blockCount: entry.engram.getBlockCount(),
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          engramId,
          position: { x, y, z },
          blockType,
        });
      }
    },
  });
}
