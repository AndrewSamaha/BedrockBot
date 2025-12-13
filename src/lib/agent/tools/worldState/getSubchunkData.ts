import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';

/**
 * Get subchunk data (blocks in a 16x16x16 region)
 */
export function createGetSubchunkDataTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_subchunk_data',
    description:
      'Get block data from a specific subchunk (16x16x16 block region). Subchunks are identified by chunk coordinates (x, z) and subchunk Y index. This may require waiting for the server to send the data.',
    schema: z.object({
      chunkX: z
        .number()
        .describe('Chunk X coordinate (world X / 16, rounded down)'),
      chunkY: z
        .number()
        .describe('Subchunk Y index (world Y / 16, rounded down)'),
      chunkZ: z
        .number()
        .describe('Chunk Z coordinate (world Z / 16, rounded down)'),
    }),
    func: async ({ chunkX, chunkY, chunkZ }) => {
      if (!gameState.worldStateRequestManager) {
        return JSON.stringify({
          error: 'Request manager not initialized',
        });
      }

      try {
        const blockData = await gameState.worldStateRequestManager.requestSubchunk(
          chunkX,
          chunkY,
          chunkZ
        );

        return JSON.stringify({
          chunkX,
          chunkY,
          chunkZ,
          blockCount: blockData.length,
          blocks: blockData.slice(0, 100), // Limit to first 100 blocks for response size
          totalBlocks: blockData.length,
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          chunkX,
          chunkY,
          chunkZ,
        });
      }
    },
  });
}
