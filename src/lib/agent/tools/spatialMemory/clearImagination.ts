import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { GameState } from '../../../GameState.js';
import { log } from '../../../log.js';

/**
 * Clear all imagined structures from working memory
 */
export function createClearImaginationTool(gameState: GameState) {
  return new DynamicStructuredTool({
    name: 'clear_imagination',
    description:
      'Clear all imagined structures from working memory. This removes all engrams but does not affect long-term memory (saved files).',
    schema: z.object({}),
    func: async () => {
      try {
        const countBefore = gameState.spatialMemory.getEngramCount();
        gameState.spatialMemory.clearWorkingMemory();

        log({
          agentTool: 'clear_imagination',
          engramsCleared: countBefore,
        });

        return JSON.stringify({
          success: true,
          engramsCleared: countBefore,
          note: 'All imagined structures cleared from working memory.',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
        });
      }
    },
  });
}
