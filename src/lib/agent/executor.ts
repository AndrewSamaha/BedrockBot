import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { StateGraph, END, START } from '@langchain/langgraph';
import type { Client } from 'bedrock-protocol';
import type { GameState } from '../GameState.js';
import type { AgentState } from './types.js';
import { updateGameStateSnapshot, addMessage, addMessages } from './graph.js';
import { createAllTools } from './tools/index.js';
import { log } from '../log.js';
import { env } from '@/config/env.js';
import { getLangfuseHandler, flushLangfuse } from './observability/langfuse.js';

/**
 * Agent executor that runs LangGraph workflows with tool calling
 */
export class AgentExecutor {
  private graph: any; // Compiled LangGraph
  private gameState: GameState;
  private client: Client;
  private username: string;
  private tools: ReturnType<typeof createAllTools>;
  private chatModel: ChatOpenAI;
  private langfuseHandler: ReturnType<typeof getLangfuseHandler>;

  constructor(gameState: GameState, client: Client, username: string) {
    this.gameState = gameState;
    this.client = client;
    this.username = username;
    this.tools = createAllTools(client, gameState, username);

    // Get Langfuse callback handler for observability
    this.langfuseHandler = getLangfuseHandler();
    const callbacks = this.langfuseHandler ? [this.langfuseHandler] : undefined;

    const openAIConfig = {
      modelName: 'gpt-5-mini',
      temperature: 1,
      maxTokens: 1000,
      callbacks, // Langfuse will automatically track LLM calls and tool executions
    }
    // Create LLM model with tools bound and Langfuse callbacks
    this.chatModel = new ChatOpenAI(openAIConfig).bindTools(this.tools);
    log({
      agentExecutor: 'Initialized',
      config: {
        ...openAIConfig,
        callbacks: callbacks ? callbacks.length : 0,
        langfuseEnabled: !!this.langfuseHandler,
      }
    });
    // Create graph with node implementations
    this.graph = this.createGraphWithNodes();
  }

  /**
   * Create graph with actual node implementations
   */
  private createGraphWithNodes() {
    const graph = new StateGraph<AgentState>({
      channels: {
        messages: {
          reducer: (x: any[], y: any[]) => [...x, ...y],
          default: () => [],
        },
        gameState: {
          reducer: (x, y) => y ?? x,
          default: () => ({
            spawned: false,
            timestamp: Date.now(),
          }),
        },
        pendingRequests: {
          reducer: (x: Map<string, any>, y: Map<string, any>) => {
            const merged = new Map(x);
            for (const [key, value] of y.entries()) {
              merged.set(key, value);
            }
            return merged;
          },
          default: () => new Map(),
        },
        lastUpdate: {
          reducer: (x: number, y: number) => y ?? x,
          default: () => Date.now(),
        },
      },
    });

    // Update state node - refreshes GameState snapshot
    graph.addNode('update_state', async (state: AgentState) => {
      return updateGameStateSnapshot(state, this.gameState);
    });

    // LLM call node - calls LLM with tools
    graph.addNode('llm_call', async (state: AgentState) => {
      try {
        // Filter messages to ensure tool_calls are followed by ToolMessages
        // OpenAI requires that every AIMessage with tool_calls has corresponding ToolMessages
        const preFilterMessageCount = state.messages.length;
        const filteredMessages = this.filterMessagesForLLM(state.messages);

        // Prepare messages for LLM (include system prompt with game state context)
        const systemPrompt = this.createSystemPrompt(state.gameState);
        const messages = [
          new SystemMessage(systemPrompt),
          ...filteredMessages,
        ];

        // Pass callbacks to invoke explicitly (LangChain supports callbacks in invoke options)
        const callbacks = this.langfuseHandler ? [this.langfuseHandler] : undefined;

        log({
          agentExecutor: 'llm_call_start',
          preFilterMessageCount,
          messageCount: messages.length,
          hasCallbacks: !!callbacks,
          callbackHandlerType: this.langfuseHandler?.constructor?.name,
          langfuseHandlerExists: !!this.langfuseHandler,
        });

        // Call LLM with tools and callbacks
        // LangChain invoke accepts callbacks in the second parameter options object
        const invokeOptions = callbacks ? { callbacks } : {};
        const response = await this.chatModel.invoke(messages, invokeOptions);

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
    });

    // Execute tools node - executes tool calls from LLM
    graph.addNode('execute_tools', async (state: AgentState) => {
      const lastMessage = state.messages[state.messages.length - 1];

      // Check if last message has tool calls
      if (!lastMessage || !('tool_calls' in lastMessage) || !lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        // No tool calls, we're done
        return state;
      }

      // Execute each tool call
      const toolMessages: ToolMessage[] = [];
      for (const toolCall of lastMessage.tool_calls || []) {
        try {
          const tool = this.tools.find((t) => t.name === toolCall.name);
          if (!tool) {
            toolMessages.push(
              new ToolMessage({
                content: JSON.stringify({ error: `Tool ${toolCall.name} not found` }),
                tool_call_id: toolCall.id,
              })
            );
            continue;
          }

          log({
            agentExecutor: 'tool_call',
            toolName: toolCall.name,
            args: toolCall.args,
          });

          // Execute tool
          const result = await tool.invoke(toolCall.args);
          toolMessages.push(
            new ToolMessage({
              content: result,
              tool_call_id: toolCall.id,
            })
          );

          log({
            agentExecutor: 'tool_result',
            toolName: toolCall.name,
            result: result.substring(0, 200), // Log first 200 chars
          });
        } catch (error) {
          log({
            agentExecutor: 'tool_error',
            toolName: toolCall.name,
            error: (error as Error).message,
          });
          toolMessages.push(
            new ToolMessage({
              content: JSON.stringify({
                error: (error as Error).message,
              }),
              tool_call_id: toolCall.id,
            })
          );
        }
      }

      // Add tool result messages to state
      return addMessages(state, toolMessages);
    });

    // Set up graph edges
    graph.addEdge(START, 'update_state');
    graph.addEdge('update_state', 'llm_call');

    // Conditional: if tool calls exist, execute them and loop back; otherwise end
    graph.addConditionalEdges(
      'llm_call',
      (state: AgentState) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (
          lastMessage &&
          'tool_calls' in lastMessage &&
          lastMessage.tool_calls &&
          lastMessage.tool_calls.length > 0
        ) {
          return 'continue';
        }
        return 'end';
      },
      {
        continue: 'execute_tools',
        end: END,
      }
    );

    graph.addEdge('execute_tools', 'llm_call'); // Loop back to LLM after tool execution

    return graph.compile();
  }

  /**
   * Filter messages to ensure tool_calls are properly followed by ToolMessages
   * OpenAI requires that every AIMessage with tool_calls has corresponding ToolMessages
   * This filters out incomplete tool call sequences to prevent API errors
   */
  private filterMessagesForLLM(messages: any[]): any[] {
    const filtered: any[] = [];
    let i = 0;

    while (i < messages.length) {
      const message = messages[i];

      // Check if this is an AIMessage with tool_calls
      if (message && 'tool_calls' in message && message.tool_calls && message.tool_calls.length > 0) {
        const toolCallIds = new Set(message.tool_calls.map((tc: any) => tc.id));
        const aiMessage = message;
        const aiMessageIndex = i;
        i++;

        // Look for corresponding ToolMessages immediately following
        const toolMessages: any[] = [];
        while (i < messages.length) {
          const nextMessage = messages[i];

          // Check if it's a ToolMessage for one of our tool_call_ids
          // Use instanceof check for ToolMessage or check the class name
          const isToolMessage =
            nextMessage &&
            (nextMessage instanceof ToolMessage ||
             nextMessage.constructor?.name === 'ToolMessage') &&
            nextMessage.tool_call_id &&
            toolCallIds.has(nextMessage.tool_call_id);

          if (isToolMessage) {
            toolMessages.push(nextMessage);
            toolCallIds.delete(nextMessage.tool_call_id);
            i++;

            // If all tool calls are responded to, we're done with this sequence
            if (toolCallIds.size === 0) {
              break;
            }
          } else {
            // Not a matching ToolMessage, stop looking
            break;
          }
        }

        // Only include the AIMessage and ToolMessages if all tool calls were responded to
        if (toolCallIds.size === 0) {
          // All tool calls responded to, include the AIMessage and ToolMessages
          filtered.push(aiMessage);
          filtered.push(...toolMessages);
        } else {
          // Incomplete sequence - skip this AIMessage and its partial ToolMessages
          // This prevents sending incomplete sequences to OpenAI API
          log({
            agentExecutor: 'filtering_incomplete_tool_sequence',
            skippedAIMessage: aiMessageIndex,
            missingToolCallIds: Array.from(toolCallIds),
          });
          // Continue processing from where we stopped (don't increment i, already done)
        }
      } else {
        // Regular message (HumanMessage, AIMessage without tool_calls, etc.)
        // Only include if we're not in the middle of an incomplete tool call sequence
        filtered.push(message);
        i++;
      }
    }

    return filtered;
  }

  /**
   * Create system prompt with game state context
   */
  private createSystemPrompt(gameStateSnapshot: AgentState['gameState']): string {
    const position = gameStateSnapshot.playerPosition
      ? `at (${gameStateSnapshot.playerPosition.x}, ${gameStateSnapshot.playerPosition.y}, ${gameStateSnapshot.playerPosition.z})`
      : 'position unknown';

    const dayPhase = gameStateSnapshot.dayPhase || 'unknown';
    const playerCount = gameStateSnapshot.overworldPlayerCount || 0;

    return `You are ${this.username}, an intelligent agent in a Minecraft world. You can interact with the world using tools.

Current situation:
- Position: ${position}
- Time of day: ${dayPhase}
- Players online: ${playerCount}
- Spawned: ${gameStateSnapshot.spawned ? 'yes' : 'no'}

You have access to tools that let you:
- Query world state (get position, players, blocks, chunks)
- Move and teleport
- Look around
- Build structures (fill blocks)
- Communicate (say messages)

Use tools to accomplish tasks. When asked to do something, use the appropriate tools to:
1. Understand the current situation
2. Plan your actions
3. Execute the plan
4. Verify results

Be helpful and efficient. If you need more information, use query tools first before taking action.`;
  }

  /**
   * Process a user message through the agent
   */
  async processMessage(userMessage: string, speakerName: string): Promise<string> {
    try {
      // Create initial state
      const initialState = {
        messages: [new HumanMessage(`${speakerName}: ${userMessage}`)],
        gameState: updateGameStateSnapshot(
          {
            messages: [],
            gameState: { spawned: false, timestamp: Date.now() },
            pendingRequests: new Map(),
            lastUpdate: Date.now(),
          },
          this.gameState
        ).gameState,
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      };

      log({
        agentExecutor: 'process_message_start',
        speakerName,
        message: userMessage,
      });

      // Run the graph - it will automatically loop until no more tool calls
      const finalState = await this.graph.invoke(initialState);

      // Extract final AI response
      const lastMessage = finalState.messages[finalState.messages.length - 1];
      let response: string;
      
      if (lastMessage && 'content' in lastMessage && lastMessage.content) {
        response = typeof lastMessage.content === 'string'
          ? lastMessage.content
          : String(lastMessage.content);

        log({
          agentExecutor: 'process_message_complete',
          response,
          totalMessages: finalState.messages.length,
        });
      } else if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        // If no content, check if there were tool calls
        response = `I executed ${lastMessage.tool_calls.length} action(s). Check the results!`;
      } else {
        response = "I'm processing your request...";
      }

      // Flush Langfuse traces to ensure they are sent before returning
      await flushLangfuse();

      return response;
    } catch (error) {
      log({
        agentExecutor: 'process_message_error',
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      
      // Flush traces even on error to capture error traces
      await flushLangfuse();
      
      return `Sorry, I encountered an error: ${(error as Error).message}`;
    }
  }
}
