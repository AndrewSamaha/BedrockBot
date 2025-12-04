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

  constructor(gameState: GameState, client: Client, username: string) {
    this.gameState = gameState;
    this.client = client;
    this.username = username;
    this.tools = createAllTools(client, gameState, username);
    
    // Create LLM model with tools bound
    this.chatModel = new ChatOpenAI({
      modelName: env.OPENAI_API_KEY ? 'gpt-4o' : 'gpt-4.1-nano', // Use better model if API key available
      temperature: 0.7,
      maxTokens: 500,
    }).bindTools(this.tools);

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
        // Prepare messages for LLM (include system prompt with game state context)
        const systemPrompt = this.createSystemPrompt(state.gameState);
        const messages = [
          new SystemMessage(systemPrompt),
          ...state.messages,
        ];

        // Call LLM with tools
        const response = await this.chatModel.invoke(messages);
        
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
      if (lastMessage && 'content' in lastMessage && lastMessage.content) {
        const response = typeof lastMessage.content === 'string' 
          ? lastMessage.content 
          : String(lastMessage.content);
        
        log({
          agentExecutor: 'process_message_complete',
          response,
          totalMessages: finalState.messages.length,
        });

        return response;
      }

      // If no content, check if there were tool calls
      if (lastMessage && 'tool_calls' in lastMessage && lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return `I executed ${lastMessage.tool_calls.length} action(s). Check the results!`;
      }

      return "I'm processing your request...";
    } catch (error) {
      log({
        agentExecutor: 'process_message_error',
        error: (error as Error).message,
        stack: (error as Error).stack,
      });
      return `Sorry, I encountered an error: ${(error as Error).message}`;
    }
  }
}
