import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';

/**
 * Query imagined blocks from spatial memory
 */
export function createGetImaginedBlocksTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'get_imagined_blocks',
    description:
      'Get information about imagined blocks. Can query all blocks, blocks from a specific engram, or blocks in a world region.',
    schema: z.object({
      engramId: z
        .string()
        .optional()
        .describe('Optional: ID of specific engram to query. If not provided, returns all engrams info.'),
      worldRegion: z
        .object({
          minX: z.number().describe('Minimum X coordinate (world coordinates)'),
          minY: z.number().describe('Minimum Y coordinate (world coordinates)'),
          minZ: z.number().describe('Minimum Z coordinate (world coordinates)'),
          maxX: z.number().describe('Maximum X coordinate (world coordinates)'),
          maxY: z.number().describe('Maximum Y coordinate (world coordinates)'),
          maxZ: z.number().describe('Maximum Z coordinate (world coordinates)'),
        })
        .optional()
        .describe('Optional: World region to query blocks in. If not provided, returns all blocks.'),
    }),
    func: async ({ engramId, worldRegion }) => {
      try {
        if (engramId) {
          // Query specific engram
          const entry = gameState.spatialMemory.getEngram(engramId);
          if (!entry) {
            return JSON.stringify({
              error: `Engram with ID "${engramId}" not found`,
              engramId,
            });
          }

          const blocks = entry.engram.getAllBlocks();
          const worldPos = entry.worldPosition;

          // Convert local coords to world coords
          const worldBlocks = blocks.map((block) => ({
            x: worldPos.x + block.x,
            y: worldPos.y + block.y,
            z: worldPos.z + block.z,
            blockType: block.blockType,
            localPosition: { x: block.x, y: block.y, z: block.z },
          }));

          // Filter by world region if provided
          let filteredBlocks = worldBlocks;
          if (worldRegion) {
            filteredBlocks = worldBlocks.filter(
              (block) =>
                block.x >= worldRegion.minX &&
                block.x <= worldRegion.maxX &&
                block.y >= worldRegion.minY &&
                block.y <= worldRegion.maxY &&
                block.z >= worldRegion.minZ &&
                block.z <= worldRegion.maxZ
            );
          }

          return JSON.stringify({
            engramId,
            name: entry.engram.name,
            description: entry.engram.description,
            worldPosition: entry.worldPosition,
            blockCount: blocks.length,
            blocksInRegion: filteredBlocks.length,
            blocks: filteredBlocks.slice(0, 100), // Limit to first 100 for response size
            totalBlocks: filteredBlocks.length,
            note: filteredBlocks.length > 100 ? 'Showing first 100 blocks. Use worldRegion to filter.' : undefined,
          });
        } else {
          // Query all engrams
          const allEngrams = gameState.spatialMemory.getAllEngrams();

          if (worldRegion) {
            // Get blocks in region from all engrams
            const blocks = gameState.spatialMemory.getBlocksInRegion(
              { x: worldRegion.minX, y: worldRegion.minY, z: worldRegion.minZ },
              { x: worldRegion.maxX, y: worldRegion.maxY, z: worldRegion.maxZ }
            );

            return JSON.stringify({
              engramsInRegion: blocks.length > 0 ? [...new Set(blocks.map((b) => b.engramId))] : [],
              blockCount: blocks.length,
              blocks: blocks.slice(0, 100), // Limit to first 100
              totalBlocks: blocks.length,
              note: blocks.length > 100 ? 'Showing first 100 blocks.' : undefined,
            });
          } else {
            // Return summary of all engrams
            const engramSummaries = allEngrams.map((entry) => ({
              id: entry.engram.id,
              name: entry.engram.name,
              description: entry.engram.description,
              worldPosition: entry.worldPosition,
              blockCount: entry.engram.getBlockCount(),
            }));

            return JSON.stringify({
              engramCount: allEngrams.length,
              engrams: engramSummaries,
              note: 'Use engramId parameter to get detailed block information for a specific engram.',
            });
          }
        }
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          engramId,
          worldRegion,
        });
      }
    },
  });
}
