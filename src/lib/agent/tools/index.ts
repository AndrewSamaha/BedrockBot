/**
 * Agent Tools
 * 
 * This module exports all LangChain tools for the agent.
 * Tools are organized into:
 * - World State Query Tools: Read current game state
 * - Action Tools: Perform actions in the game
 */

import type { Client } from 'bedrock-protocol';
import type { GameState } from '../../GameState.js';
import {
  createGetPlayerPositionTool,
  createGetNearbyPlayersTool,
  createGetSubchunkDataTool,
  createGetChunkDataTool,
  createGetBlockAtTool,
  createGetGameStateSummaryTool,
} from './worldState/index.js';
import {
  createMoveTool,
  createTeleportTool,
  createLookTool,
  createFillTool,
  createSayTool,
} from './actions/index.js';

/**
 * Create all tools for the agent
 */
export function createAllTools(
  client: Client,
  gameState: GameState,
  username: string
) {
  return [
    // World State Query Tools
    createGetPlayerPositionTool(gameState),
    createGetNearbyPlayersTool(gameState),
    createGetSubchunkDataTool(gameState),
    createGetChunkDataTool(gameState),
    createGetBlockAtTool(gameState),
    createGetGameStateSummaryTool(gameState),

    // Action Tools
    createMoveTool(client, gameState),
    createTeleportTool(client),
    createLookTool(client, gameState),
    createFillTool(client),
    createSayTool(client, username),
  ];
}

// Export individual tool creators for testing/customization
export * from './worldState/index.js';
export * from './actions/index.js';
