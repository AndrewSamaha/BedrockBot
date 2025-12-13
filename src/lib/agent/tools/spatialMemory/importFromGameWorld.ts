import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { log } from '../../../log.js';

/**
 * Import a region from the game world into spatial memory
 */
export function createImportFromGameWorldTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'import_from_game_world',
    description:
      'Copy a region from the game world into spatial memory as a new imagined structure. The structure will be centered at the middle of the specified region.',
    schema: z.object({
      name: z.string().describe('Name for the imported structure (e.g., "Copied Building", "Imported House")'),
      description: z
        .string()
        .describe('Description of what was imported (e.g., "A building copied from the game world")'),
      minX: z.number().describe('Minimum X coordinate (world coordinates)'),
      minY: z.number().describe('Minimum Y coordinate (world coordinates)'),
      minZ: z.number().describe('Minimum Z coordinate (world coordinates)'),
      maxX: z.number().describe('Maximum X coordinate (world coordinates)'),
      maxY: z.number().describe('Maximum Y coordinate (world coordinates)'),
      maxZ: z.number().describe('Maximum Z coordinate (world coordinates)'),
    }),
    func: async ({ name, description, minX, minY, minZ, maxX, maxY, maxZ }) => {
      try {
        if (!gameState.registry) {
          return JSON.stringify({
            error: 'Registry not initialized. Cannot import blocks.',
          });
        }

        const bounds = {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ },
        };

        const engramId = gameState.spatialMemory.importFromGameWorld(
          bounds,
          name,
          description,
          gameState
        );

        const entry = gameState.spatialMemory.getEngram(engramId);
        const blockCount = entry?.engram.getBlockCount() ?? 0;

        log({
          agentTool: 'import_from_game_world',
          engramId,
          name,
          description,
          bounds,
          blockCount,
        });

        return JSON.stringify({
          success: true,
          engramId,
          name,
          description,
          bounds,
          blockCount,
          worldPosition: entry?.worldPosition,
          note: 'Region imported into spatial memory. Use build_imagined_structure to build it elsewhere in the game world.',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          bounds: {
            min: { x: minX, y: minY, z: minZ },
            max: { x: maxX, y: maxY, z: maxZ },
          },
          name,
          description,
        });
      }
    },
  });
}
