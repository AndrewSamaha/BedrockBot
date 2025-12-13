import type { Client } from 'bedrock-protocol';
import type { GameState } from '../GameState.js';
import { AgentExecutor } from './executor.js';
import { log } from '../log.js';

/**
 * Initialize agent executor for GameState
 * Should be called after client is connected
 */
export function initializeAgentExecutor(
  gameState: GameState,
  client: Client,
  username: string
): void {
  if (!gameState.client) {
    log({ agentIntegration: 'error', message: 'Cannot initialize agent: client not set' });
    return;
  }

  try {
    const executor = new AgentExecutor(gameState, client, username);
    (gameState as any).agentExecutor = executor;
    log({ agentIntegration: 'initialized', username });
  } catch (error) {
    log({
      agentIntegration: 'initialization_error',
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
  }
}

/**
 * Process a chat message through the agent (if available) or fall back to simple chat
 */
export async function processChatMessage(
  gameState: GameState,
  message: string,
  speakerName: string,
  client: Client,
  username: string
): Promise<string | null> {
  // Check if agent executor is available
  const executor = (gameState as any).agentExecutor as AgentExecutor | undefined;

  if (executor) {
    try {
      log({ agentIntegration: 'using_agent', speakerName, message });
      const response = await executor.processMessage(message, speakerName);
      return response;
    } catch (error) {
      log({
        agentIntegration: 'agent_error',
        error: (error as Error).message,
        fallback: 'simple_chat',
      });
      // Fall back to simple chat
    }
  }

  // Fall back to simple chat if agent not available
  if (gameState.conversationManager) {
    try {
      const conversation = gameState.conversationManager.newMessage(speakerName, message);
      if (!conversation) {
        return null;
      }
      const chatResponse = await gameState.conversationManager.generateChatResponse(conversation);
      return chatResponse || null;
    } catch (error) {
      log({
        agentIntegration: 'simple_chat_error',
        error: (error as Error).message,
      });
      return null;
    }
  }

  return null;
}
