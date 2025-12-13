import type { BaseMessage } from '@langchain/core/messages';
import type { GameStateSnapshot } from '../websocket/server.js';

/**
 * Status of a pending async request
 */
export interface RequestStatus {
  type: 'subchunk' | 'chunk';
  coordinates: { x: number; y?: number; z: number };
  timestamp: number;
  timeoutMs: number;
}

/**
 * State structure for LangGraph agent
 */
export interface AgentState {
  /** Conversation history with the LLM */
  messages: BaseMessage[];
  
  /** Read-only snapshot of current GameState */
  gameState: GameStateSnapshot;
  
  /** Track pending async requests */
  pendingRequests: Map<string, RequestStatus>;
  
  /** Timestamp of last state update */
  lastUpdate: number;
}
