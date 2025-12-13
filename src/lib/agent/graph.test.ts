import { describe, it, expect, beforeEach } from 'vitest';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import type { GameState } from '../GameState.js';
import {
  createInitialAgentState,
  updateGameStateSnapshot,
  addMessage,
  addMessages,
  createAgentGraph,
} from './graph.js';
import { createGameStateSnapshot } from './snapshot.js';
import { EventEmitter } from 'events';
import { SpatialMemory } from '../spatialMemory/index.js';

// Mock GameState
class MockGameState extends EventEmitter {
  spawned = false;
  playerPosition = { x: 100, y: 64, z: 200 };
  pitch = 0;
  yaw = 90;
  headYaw = 90;
  gameTime = 12000;
  dayPhase = 'day';
  currentTick = 1000n;
  world: any;
  registry: any = {};
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.world = {
      getChunkCount: () => 5,
      getAllChunkCoords: () => [[0, 0]],
    };
    this.spatialMemory = new SpatialMemory();
  }
}

describe('Agent Graph Utilities', () => {
  let mockGameState: MockGameState;

  beforeEach(() => {
    mockGameState = new MockGameState();
  });

  describe('createInitialAgentState', () => {
    it('should create initial state with empty messages and pending requests', () => {
      const state = createInitialAgentState(mockGameState as any);

      expect(state.messages).toEqual([]);
      expect(state.pendingRequests.size).toBe(0);
      expect(state.gameState.spawned).toBe(false);
      expect(state.gameState.playerPosition).toEqual({ x: 100, y: 64, z: 200 });
      expect(state.lastUpdate).toBeTypeOf('number');
    });

    it('should include gameState snapshot', () => {
      const state = createInitialAgentState(mockGameState as any);

      expect(state.gameState).toBeDefined();
      expect(state.gameState.timestamp).toBeTypeOf('number');
      expect(state.gameState.playerPosition).toEqual({ x: 100, y: 64, z: 200 });
    });

    it('should set lastUpdate timestamp', () => {
      const before = Date.now();
      const state = createInitialAgentState(mockGameState as any);
      const after = Date.now();

      expect(state.lastUpdate).toBeGreaterThanOrEqual(before);
      expect(state.lastUpdate).toBeLessThanOrEqual(after);
    });
  });

  describe('updateGameStateSnapshot', () => {
    it('should update gameState snapshot', () => {
      const initialState = createInitialAgentState(mockGameState as any);
      mockGameState.playerPosition = { x: 200, y: 70, z: 300 };

      const updatedState = updateGameStateSnapshot(
        initialState,
        mockGameState as any
      );

      expect(updatedState.gameState.playerPosition).toEqual({
        x: 200,
        y: 70,
        z: 300,
      });
      expect(updatedState.gameState.playerPosition).not.toEqual(
        initialState.gameState.playerPosition
      );
    });

    it('should update lastUpdate timestamp', () => {
      const initialState = createInitialAgentState(mockGameState as any);
      const oldUpdate = initialState.lastUpdate;

      // Wait a bit to ensure timestamp changes
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const updatedState = updateGameStateSnapshot(
            initialState,
            mockGameState as any
          );

          expect(updatedState.lastUpdate).toBeGreaterThan(oldUpdate);
          resolve();
        }, 10);
      });
    });

    it('should preserve other state fields', () => {
      const initialState = createInitialAgentState(mockGameState as any);
      initialState.messages = [new HumanMessage('test')];
      initialState.pendingRequests.set('test', {
        type: 'subchunk',
        coordinates: { x: 1, y: 2, z: 3 },
        timestamp: Date.now(),
        timeoutMs: 5000,
      });

      const updatedState = updateGameStateSnapshot(
        initialState,
        mockGameState as any
      );

      expect(updatedState.messages).toEqual(initialState.messages);
      expect(updatedState.pendingRequests.size).toBe(1);
      expect(updatedState.pendingRequests.get('test')).toBeDefined();
    });
  });

  describe('addMessage', () => {
    it('should add a single message to state', () => {
      const state = createInitialAgentState(mockGameState as any);
      const message = new HumanMessage('Hello');

      const updatedState = addMessage(state, message);

      expect(updatedState.messages).toHaveLength(1);
      expect(updatedState.messages[0]).toBe(message);
    });

    it('should preserve existing messages', () => {
      const state = createInitialAgentState(mockGameState as any);
      const message1 = new HumanMessage('First');
      const message2 = new SystemMessage('Second');

      const state1 = addMessage(state, message1);
      const state2 = addMessage(state1, message2);

      expect(state2.messages).toHaveLength(2);
      expect(state2.messages[0]).toBe(message1);
      expect(state2.messages[1]).toBe(message2);
    });

    it('should not mutate original state', () => {
      const state = createInitialAgentState(mockGameState as any);
      const message = new HumanMessage('Test');

      addMessage(state, message);

      expect(state.messages).toHaveLength(0);
    });

    it('should handle different message types', () => {
      const state = createInitialAgentState(mockGameState as any);

      const humanMsg = new HumanMessage('Human');
      const aiMsg = new AIMessage('AI');
      const systemMsg = new SystemMessage('System');

      let updatedState = addMessage(state, humanMsg);
      updatedState = addMessage(updatedState, aiMsg);
      updatedState = addMessage(updatedState, systemMsg);

      expect(updatedState.messages).toHaveLength(3);
      expect(updatedState.messages[0]).toBeInstanceOf(HumanMessage);
      expect(updatedState.messages[1]).toBeInstanceOf(AIMessage);
      expect(updatedState.messages[2]).toBeInstanceOf(SystemMessage);
    });
  });

  describe('addMessages', () => {
    it('should add multiple messages to state', () => {
      const state = createInitialAgentState(mockGameState as any);
      const messages = [
        new HumanMessage('First'),
        new AIMessage('Second'),
        new SystemMessage('Third'),
      ];

      const updatedState = addMessages(state, messages);

      expect(updatedState.messages).toHaveLength(3);
      expect(updatedState.messages).toEqual(messages);
    });

    it('should preserve existing messages', () => {
      const state = createInitialAgentState(mockGameState as any);
      const existingMessage = new HumanMessage('Existing');
      const stateWithExisting = addMessage(state, existingMessage);

      const newMessages = [new AIMessage('New1'), new AIMessage('New2')];
      const updatedState = addMessages(stateWithExisting, newMessages);

      expect(updatedState.messages).toHaveLength(3);
      expect(updatedState.messages[0]).toBe(existingMessage);
      expect(updatedState.messages[1]).toBe(newMessages[0]);
      expect(updatedState.messages[2]).toBe(newMessages[1]);
    });

    it('should handle empty array', () => {
      const state = createInitialAgentState(mockGameState as any);
      const updatedState = addMessages(state, []);

      expect(updatedState.messages).toHaveLength(0);
      expect(updatedState).toEqual(state);
    });

    it('should not mutate original state', () => {
      const state = createInitialAgentState(mockGameState as any);
      const messages = [new HumanMessage('Test')];

      addMessages(state, messages);

      expect(state.messages).toHaveLength(0);
    });
  });

  describe('createAgentGraph', () => {
    it('should create a compiled graph', () => {
      const graph = createAgentGraph();

      expect(graph).toBeDefined();
      expect(typeof graph.invoke).toBe('function');
    });

    it('should create graph without checkpoint saver', () => {
      const graph = createAgentGraph();

      expect(graph).toBeDefined();
    });

    it('should accept optional checkpoint saver', () => {
      const mockCheckpointSaver = {}; // Mock checkpoint saver
      const graph = createAgentGraph(mockCheckpointSaver);

      expect(graph).toBeDefined();
    });

    it('should have correct state schema', async () => {
      const graph = createAgentGraph();
      const initialState = createInitialAgentState(mockGameState as any);

      // Graph should accept AgentState
      const result = await graph.invoke(initialState);

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      expect(result.gameState).toBeDefined();
      expect(result.pendingRequests).toBeDefined();
      expect(result.lastUpdate).toBeDefined();
    });

    it('should execute placeholder nodes', async () => {
      const graph = createAgentGraph();
      const initialState = createInitialAgentState(mockGameState as any);

      const result = await graph.invoke(initialState);

      // Placeholder nodes should return state unchanged
      expect(result.messages).toEqual(initialState.messages);
      expect(result.gameState).toEqual(initialState.gameState);
    });
  });
});
