import { observe } from "@langfuse/tracing";
import type { AgentState } from '../types.js';
import type { GameState } from '../../GameState.js';
import { updateGameStateSnapshot } from '../graph.js';

/**
 * Dependencies for update_state node
 */
export interface UpdateStateDependencies {
  gameState: GameState;
}

/**
 * Update state node - refreshes GameState snapshot
 */
async function updateStateNode(
  state: AgentState,
  deps: UpdateStateDependencies
): Promise<AgentState> {
  return updateGameStateSnapshot(state, deps.gameState);
}

/**
 * Create wrapped update_state node with Langfuse tracing
 * Returns a function that matches LangGraph node signature: (state: AgentState) => Promise<AgentState>
 */
export function createUpdateStateNode(deps: UpdateStateDependencies): (state: AgentState) => Promise<AgentState> {
  // Create a function that binds the dependencies
  const nodeWithDeps = async (state: AgentState): Promise<AgentState> => {
    return updateStateNode(state, deps);
  };

  // Wrap with observe for Langfuse tracing
  return observe(
    nodeWithDeps,
    {
      name: "update_state",
    }
  );
}
