import { StateGraph, END, START } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { GameState } from '../GameState.js';
import type { AgentState } from './types.js';
import { createGameStateSnapshot } from './snapshot.js';

// Checkpoint saver type (optional, can be MemorySaver or other checkpoint implementations)
type CheckpointSaver = any;

/**
 * Create initial AgentState from GameState
 */
export function createInitialAgentState(gameState: GameState): AgentState {
  return {
    messages: [],
    gameState: createGameStateSnapshot(gameState),
    pendingRequests: new Map(),
    lastUpdate: Date.now(),
  };
}

/**
 * Update the gameState snapshot in AgentState
 */
export function updateGameStateSnapshot(
  state: AgentState,
  gameState: GameState
): AgentState {
  return {
    ...state,
    gameState: createGameStateSnapshot(gameState),
    lastUpdate: Date.now(),
  };
}

/**
 * Add a message to the agent state
 */
export function addMessage(state: AgentState, message: BaseMessage): AgentState {
  return {
    ...state,
    messages: [...state.messages, message],
  };
}

/**
 * Add multiple messages to the agent state
 */
export function addMessages(
  state: AgentState,
  messages: BaseMessage[]
): AgentState {
  return {
    ...state,
    messages: [...state.messages, ...messages],
  };
}

/**
 * Create the LangGraph state graph for the agent
 * 
 * This sets up the basic structure. Actual nodes will be added in Phase 3/4.
 * 
 * @param checkpointSaver - Optional checkpoint saver for state persistence
 * @returns Compiled graph ready for execution
 */
export function createAgentGraph(checkpointSaver?: CheckpointSaver) {
  // Define the state schema
  const graph = new StateGraph<AgentState>({
    channels: {
      messages: {
        reducer: (x: BaseMessage[], y: BaseMessage[]) => [...x, ...y],
        default: () => [],
      },
      gameState: {
        reducer: (x, y) => y ?? x, // Always use the latest snapshot
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

  // Placeholder nodes - will be implemented in Phase 3/4
  graph.addNode('update_state', async (state: AgentState) => {
    // This will update the gameState snapshot before LLM calls
    return state;
  });

  graph.addNode('llm_call', async (state: AgentState) => {
    // This will call the LLM with tools
    return state;
  });

  graph.addNode('execute_tools', async (state: AgentState) => {
    // This will execute tool calls
    return state;
  });

  // Set up the graph edges
  graph.addEdge(START, 'update_state');
  graph.addEdge('update_state', 'llm_call');
  graph.addEdge('llm_call', 'execute_tools');
  graph.addEdge('execute_tools', END);

  // Compile with optional checkpointing
  if (checkpointSaver) {
    return graph.compile({ checkpointer: checkpointSaver });
  }

  return graph.compile();
}
