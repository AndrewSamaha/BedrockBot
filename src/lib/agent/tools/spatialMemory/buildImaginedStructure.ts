import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Client } from 'bedrock-protocol';
import type { GameState } from '../../../GameState.js';
import { fill } from '../../../serverCommands/index.js';
import { log } from '../../../log.js';
import type { Vec3 } from '../../../types.js';

/**
 * Build an imagined structure in the game world
 */
export function createBuildImaginedStructureTool(client: Client, gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'build_imagined_structure',
    description:
      'Build an imagined structure in the game world at the specified world coordinates. The structure center (0,0,0) will be placed at the given world position.',
    schema: z.object({
      engramId: z.string().describe('ID of the engram to build'),
      worldX: z.number().describe('World X coordinate where structure center (0,0,0) should be placed'),
      worldY: z.number().describe('World Y coordinate where structure center (0,0,0) should be placed'),
      worldZ: z.number().describe('World Z coordinate where structure center (0,0,0) should be placed'),
    }),
    func: async ({ engramId, worldX, worldY, worldZ }) => {
      try {
        const entry = gameState.spatialMemory.getEngram(engramId);
        if (!entry) {
          return JSON.stringify({
            error: `Engram with ID "${engramId}" not found`,
            engramId,
          });
        }

        const blocks = entry.engram.getAllBlocks();
        const blockCount = blocks.length;

        if (blockCount === 0) {
          return JSON.stringify({
            error: 'Engram has no blocks to build',
            engramId,
          });
        }

        // Warn if structure is large (Bedrock fill command limit is 32,768 blocks)
        if (blockCount > 32768) {
          return JSON.stringify({
            error: `Structure too large (${blockCount} blocks). Bedrock fill command limit is 32,768 blocks. Consider splitting the structure.`,
            engramId,
            blockCount,
          });
        }

        // Group blocks by blockType for efficient fill commands
        const blocksByType = new Map<string, Array<{ x: number; y: number; z: number }>>();

        for (const block of blocks) {
          // Convert local coords to world coords
          const worldBlockX = worldX + block.x;
          const worldBlockY = worldY + block.y;
          const worldBlockZ = worldZ + block.z;

          if (!blocksByType.has(block.blockType)) {
            blocksByType.set(block.blockType, []);
          }
          blocksByType.get(block.blockType)!.push({
            x: worldBlockX,
            y: worldBlockY,
            z: worldBlockZ,
          });
        }

        // Build blocks using fill commands
        // For now, we'll place each block individually (can be optimized later)
        let placedCount = 0;
        let errorCount = 0;

        for (const block of blocks) {
          const worldBlockX = worldX + block.x;
          const worldBlockY = worldY + block.y;
          const worldBlockZ = worldZ + block.z;

          try {
            const pos: Vec3 = { x: worldBlockX, y: worldBlockY, z: worldBlockZ };
            fill(client, pos, pos, block.blockType);
            placedCount++;
          } catch (error) {
            errorCount++;
            console.error(`Error placing block at (${worldBlockX}, ${worldBlockY}, ${worldBlockZ}):`, error);
          }
        }

        log({
          agentTool: 'build_imagined_structure',
          engramId,
          worldPosition: { x: worldX, y: worldY, z: worldZ },
          blockCount,
          placedCount,
          errorCount,
        });

        return JSON.stringify({
          success: true,
          engramId,
          name: entry.engram.name,
          worldPosition: { x: worldX, y: worldY, z: worldZ },
          blockCount,
          placedCount,
          errorCount,
          note: 'Build commands sent. Blocks will be placed when server processes the commands.',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          engramId,
          worldPosition: { x: worldX, y: worldY, z: worldZ },
        });
      }
    },
  });
}
