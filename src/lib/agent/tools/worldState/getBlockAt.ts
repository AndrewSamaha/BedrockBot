import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';

/**
 * Get block at specific world coordinates
 */
export function createGetBlockAtTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_block_at',
    description:
      'Get information about a specific block at world coordinates (x, y, z). Returns the block type if the chunk is loaded. Note: This only works for blocks in loaded chunks. Use get_subchunk_data to load chunk data first.',
    schema: z.object({
      x: z.number().describe('World X coordinate'),
      y: z.number().describe('World Y coordinate'),
      z: z.number().describe('World Z coordinate'),
    }),
    func: async ({ x, y, z }) => {
      // Check if we have chunk data for this location
      const chunkX = Math.floor(x / 16);
      const chunkZ = Math.floor(z / 16);

      const chunk = gameState.world.getChunk(chunkX, chunkZ);
      if (!chunk) {
        return JSON.stringify({
          x,
          y,
          z,
          found: false,
          note: 'Chunk not loaded. Use get_chunk_data or get_subchunk_data to load it first.',
          chunkX,
          chunkZ,
        });
      }

      // Try to get block state ID
      try {
        if (gameState.registry) {
          const stateId = gameState.world.getBlockStateIdAt(x, y, z);
          if (stateId !== undefined) {
            const block = gameState.registry.blocksByStateId[stateId];
            return JSON.stringify({
              x,
              y,
              z,
              found: true,
              stateId,
              blockName: block?.name || 'unknown',
              chunkX,
              chunkZ,
            });
          }
        }
      } catch (error) {
        // Block lookup failed
      }

      return JSON.stringify({
        x,
        y,
        z,
        found: false,
        note: 'Could not retrieve block data',
        chunkX,
        chunkZ,
      });
    },
  });
}
