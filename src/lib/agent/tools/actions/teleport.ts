import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Client } from 'bedrock-protocol';
import { teleport as teleportServerCmd } from '../../../serverCommands/index.js';
import { log } from '../../../log.js';

/**
 * Teleport the bot to a destination
 */
export function createTeleportTool(client: Client) {
  return new DynamicStructuredTool({
    name: 'teleport',
    description:
      'Teleport the bot to a destination. Can use coordinates (x y z) or a player name. This is instant movement.',
    schema: z.object({
      destination: z
        .string()
        .describe(
          'Destination: either coordinates like "100 64 200" or a player name'
        ),
    }),
    func: async ({ destination }) => {
      try {
        teleportServerCmd(client, destination);
        log({ agentTool: 'teleport', destination });

        return JSON.stringify({
          success: true,
          destination,
          note: 'Teleport command sent. Position will update when server responds.',
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          destination,
        });
      }
    },
  });
}
