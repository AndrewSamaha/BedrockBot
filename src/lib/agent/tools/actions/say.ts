import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type { Client } from 'bedrock-protocol';
import { say } from '../../../serverCommands/index.js';
import { log } from '../../../log.js';

/**
 * Send a chat message
 */
export function createSayTool(client: Client, username: string) {
  return new DynamicStructuredTool({
    name: 'say',
    description:
      'Send a chat message to all players in the world. Use this to communicate with players.',
    schema: z.object({
      message: z.string().describe('The message to send to all players'),
    }),
    func: async ({ message }) => {
      try {
        say(client, username, message);
        log({ agentTool: 'say', message });

        return JSON.stringify({
          success: true,
          message,
        });
      } catch (error) {
        return JSON.stringify({
          error: (error as Error).message,
          message,
        });
      }
    },
  });
}
