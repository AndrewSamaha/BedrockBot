import { observe, updateActiveObservation } from "@langfuse/tracing";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { ChatOpenAI } from '@langchain/openai';
import type { CallbackHandler } from '@langfuse/langchain';
import type { AgentState } from '../types.js';
import { addMessage } from '../graph.js';
import { log } from '../../log.js';

/**
 * Dependencies for llm_call node
 */
export interface LlmCallDependencies {
  chatModel: ChatOpenAI;
  langfuseHandler: CallbackHandler | null;
  filterMessagesForLLM: (messages: any[]) => any[];
  createSystemPrompt: (gameStateSnapshot: AgentState['gameState']) => string;
  username: string;
}

/**
 * LLM call node - calls LLM with tools
 */
async function llmCallNode(
  state: AgentState,
  deps: LlmCallDependencies
): Promise<AgentState> {
  try {
    updateActiveObservation({ metadata: { node: "llm_call" } });
    
    // Filter messages to ensure tool_calls are followed by ToolMessages
    // OpenAI requires that every AIMessage with tool_calls has corresponding ToolMessages
    const preFilterMessageCount = state.messages.length;
    const filteredMessages = deps.filterMessagesForLLM(state.messages);

    // Prepare messages for LLM (include system prompt with game state context)
    const systemPrompt = deps.createSystemPrompt(state.gameState);
    const messages = [
      new SystemMessage(systemPrompt),
      ...filteredMessages,
    ];

    // Pass callbacks to invoke explicitly (LangChain supports callbacks in invoke options)
    const callbacks = deps.langfuseHandler ? [deps.langfuseHandler] : undefined;

    log({
      agentExecutor: 'llm_call_start',
      preFilterMessageCount,
      messageCount: messages.length,
      hasCallbacks: !!callbacks,
      callbackHandlerType: deps.langfuseHandler?.constructor?.name,
      langfuseHandlerExists: !!deps.langfuseHandler,
    });

    // Call LLM with tools and callbacks
    // LangChain invoke accepts callbacks in the second parameter options object
    const invokeOptions = callbacks ? { callbacks } : {};
    const response = await deps.chatModel.invoke(messages, invokeOptions);

    log({
      agentExecutor: 'llm_call',
      responseContent: response.content,
      toolCalls: response.tool_calls?.length || 0,
    });

    // Add AI response to state
    return addMessage(state, response);
  } catch (error) {
    log({
      agentExecutor: 'llm_call_error',
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    // Return state with error message
    return addMessage(
      state,
      new AIMessage(`I encountered an error: ${(error as Error).message}`)
    );
  }
}

/**
 * Create wrapped llm_call node with Langfuse tracing
 * Returns a function that matches LangGraph node signature: (state: AgentState) => Promise<AgentState>
 */
export function createLlmCallNode(deps: LlmCallDependencies): (state: AgentState) => Promise<AgentState> {
  // Create a function that binds the dependencies
  const nodeWithDeps = async (state: AgentState): Promise<AgentState> => {
    return llmCallNode(state, deps);
  };

  // Wrap with observe for Langfuse tracing
  return observe(
    nodeWithDeps,
    {
      name: "llm_call",
    }
  );
}
