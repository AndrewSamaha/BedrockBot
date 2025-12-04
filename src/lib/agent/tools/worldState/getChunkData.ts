import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';

/**
 * Get chunk data
 */
export function createGetChunkDataTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_chunk_data',
    description:
      'Get data for an entire chunk (16x16 blocks horizontally, full height). Chunks are identified by chunk coordinates (x, z). This may require waiting for the server to send the data.',
    schema: z.object({
      chunkX: z
        .number()
        .describe('Chunk X coordinate (world X / 16, rounded down)'),
      chunkZ: z
        .number()
        .describe('Chunk Z coordinate (world Z / 16, rounded down)'),
    }),
    func: async ({ chunkX, chunkZ }) => {
      if (!gameState.worldStateRequestManager) {
        return JSON.stringify({
          error: 'Request manager not initialized',
        });
      }

      try {
        const chunk = await gameState.worldStateRequestManager.requestChunk(
          chunkX,
          chunkZ
        );

        return JSON.stringify({
          chunkX,
          chunkZ,
          loaded: !!chunk,
          chunkType: chunk ? 'ChunkColumn' : 'none',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          chunkX,
          chunkZ,
        });
      }
    },
  });
}
