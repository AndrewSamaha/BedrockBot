import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { AgentExecutor } from './executor.js';
import type { GameState } from '../GameState.js';
import type { Client } from 'bedrock-protocol';
import { EventEmitter } from 'events';

// Mock dependencies - must be defined inside vi.mock factory
vi.mock('@langchain/openai', () => {
  const mockChatOpenAI = vi.fn().mockImplementation(() => ({
    bindTools: vi.fn().mockReturnThis(),
    invoke: vi.fn(),
  }));
  return {
    ChatOpenAI: mockChatOpenAI,
    __mockChatOpenAI: mockChatOpenAI, // Export for test access
  };
});

vi.mock('./tools/index.js', () => {
  const mockCreateAllTools = vi.fn(() => [
    {
      name: 'get_player_position',
      invoke: vi.fn().mockResolvedValue(JSON.stringify({ x: 100, y: 64, z: 200 })),
    },
    {
      name: 'move',
      invoke: vi.fn().mockResolvedValue(JSON.stringify({ success: true })),
    },
  ]);
  return {
    createAllTools: mockCreateAllTools,
    __mockCreateAllTools: mockCreateAllTools, // Export for test access
  };
});

vi.mock('./graph.js', () => ({
  updateGameStateSnapshot: vi.fn((state, gameState) => ({
    ...state,
    gameState: {
      spawned: true,
      timestamp: Date.now(),
      playerPosition: { x: 100, y: 64, z: 200 },
      dayPhase: 'day',
      overworldPlayerCount: 1,
    },
    lastUpdate: Date.now(),
  })),
  addMessage: vi.fn((state, message) => ({
    ...state,
    messages: [...state.messages, message],
  })),
  addMessages: vi.fn((state, messages) => ({
    ...state,
    messages: [...state.messages, ...messages],
  })),
}));

vi.mock('../log.js', () => ({
  log: vi.fn(),
}));

vi.mock('@/config/env.js', () => ({
  env: {
    OPENAI_API_KEY: 'test-key',
    BEDROCK_USERNAME: 'TestBot',
  },
}));

// Mock LangGraph
const mockGraph = {
  invoke: vi.fn(),
};

vi.mock('@langchain/langgraph', async () => {
  const actual = await vi.importActual('@langchain/langgraph');
  const mockStateGraph = vi.fn().mockImplementation(() => {
    const graph: any = {
      addNode: vi.fn().mockReturnThis(),
      addEdge: vi.fn().mockReturnThis(),
      addConditionalEdges: vi.fn().mockReturnThis(),
      compile: vi.fn().mockReturnValue(mockGraph),
    };
    return graph;
  });
  return {
    ...actual,
    StateGraph: mockStateGraph,
    __mockStateGraph: mockStateGraph, // Export for test access
    START: 'START',
    END: 'END',
  };
});

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
  client: any = {};

  constructor() {
    super();
    this.world = {
      getChunkCount: () => 5,
      getAllChunkCoords: () => [[0, 0]],
    };
  }
}

describe('AgentExecutor', () => {
  let mockGameState: MockGameState;
  let mockClient: Client;
  let executor: AgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = new MockGameState();
    mockClient = {} as Client;
    executor = new AgentExecutor(mockGameState as any, mockClient, 'TestBot');
  });

  describe('constructor', () => {
    it('should initialize with gameState, client, and username', () => {
      expect(executor).toBeInstanceOf(AgentExecutor);
    });

    it('should create tools', async () => {
      const { __mockCreateAllTools } = await import('./tools/index.js');
      expect(__mockCreateAllTools).toHaveBeenCalledWith(mockClient, mockGameState, 'TestBot');
    });

    it('should create chat model with tools bound', async () => {
      const { __mockChatOpenAI } = await import('@langchain/openai');
      expect(__mockChatOpenAI).toHaveBeenCalled();
    });

    it('should create graph with nodes', async () => {
      const { __mockStateGraph } = await import('@langchain/langgraph');
      expect(__mockStateGraph).toHaveBeenCalled();
    });
  });

  describe('processMessage', () => {
    it('should process a simple message without tool calls', async () => {
      const mockResponse = new AIMessage('Hello!');
      mockGraph.invoke.mockResolvedValue({
        messages: [new HumanMessage('User: Hello'), mockResponse],
        gameState: { spawned: true, timestamp: Date.now() },
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      });

      const result = await executor.processMessage('Hello', 'User');

      expect(mockGraph.invoke).toHaveBeenCalled();
      expect(result).toBe('Hello!');
    });

    it('should handle messages with tool calls', async () => {
      const toolCall = {
        id: 'call_123',
        name: 'get_player_position',
        args: {},
      };
      const aiMessage = new AIMessage({
        content: '',
        tool_calls: [toolCall],
      });
      const toolMessage = new ToolMessage({
        content: JSON.stringify({ x: 100, y: 64, z: 200 }),
        tool_call_id: 'call_123',
      });
      const finalResponse = new AIMessage('I am at coordinates 100, 64, 200');

      // Graph will loop until no tool calls - simulate final response
      mockGraph.invoke.mockResolvedValue({
        messages: [
          new HumanMessage('User: Where are you?'),
          aiMessage,
          toolMessage,
          finalResponse,
        ],
        gameState: { spawned: true, timestamp: Date.now() },
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      });

      const result = await executor.processMessage('Where are you?', 'User');

      expect(mockGraph.invoke).toHaveBeenCalled();
      expect(result).toBe('I am at coordinates 100, 64, 200');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Graph execution failed');
      mockGraph.invoke.mockRejectedValue(error);

      const result = await executor.processMessage('Test', 'User');

      expect(result).toContain('error');
      expect(result).toContain('Graph execution failed');
    });

    it('should handle response without content but with tool calls', async () => {
      const toolCall = {
        id: 'call_123',
        name: 'move',
        args: { x: 100, y: 64, z: 200 },
      };
      const aiMessage = new AIMessage({
        content: '',
        tool_calls: [toolCall],
      });

      mockGraph.invoke.mockResolvedValue({
        messages: [new HumanMessage('User: Move'), aiMessage],
        gameState: { spawned: true, timestamp: Date.now() },
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      });

      const result = await executor.processMessage('Move', 'User');

      expect(result).toContain('executed');
      expect(result).toContain('action');
    });

    it('should handle empty response', async () => {
      // Response with AI message but no content
      const aiMessage = new AIMessage('');
      mockGraph.invoke.mockResolvedValue({
        messages: [new HumanMessage('User: Test'), aiMessage],
        gameState: { spawned: true, timestamp: Date.now() },
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      });

      const result = await executor.processMessage('Test', 'User');

      expect(result).toBe("I'm processing your request...");
    });

    it('should create initial state with user message', async () => {
      mockGraph.invoke.mockResolvedValue({
        messages: [new HumanMessage('User: Hello'), new AIMessage('Hi!')],
        gameState: { spawned: true, timestamp: Date.now() },
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      });

      await executor.processMessage('Hello', 'User');

      const invokeCall = mockGraph.invoke.mock.calls[0][0];
      expect(invokeCall.messages).toHaveLength(1);
      expect(invokeCall.messages[0]).toBeInstanceOf(HumanMessage);
      expect(invokeCall.messages[0].content).toContain('User: Hello');
    });

    it('should include gameState snapshot in initial state', async () => {
      mockGraph.invoke.mockResolvedValue({
        messages: [new HumanMessage('User: Test'), new AIMessage('Response')],
        gameState: { spawned: true, timestamp: Date.now() },
        pendingRequests: new Map(),
        lastUpdate: Date.now(),
      });

      await executor.processMessage('Test', 'User');

      const invokeCall = mockGraph.invoke.mock.calls[0][0];
      expect(invokeCall.gameState).toBeDefined();
      expect(invokeCall.pendingRequests).toBeInstanceOf(Map);
      expect(invokeCall.lastUpdate).toBeTypeOf('number');
    });
  });

  describe('graph node implementations', () => {
    it('should have update_state node that refreshes snapshot', async () => {
      // The graph is created in constructor, nodes are added
      // We verify the graph was created with StateGraph
      const { __mockStateGraph } = await import('@langchain/langgraph');
      expect(__mockStateGraph).toHaveBeenCalled();
      const graphInstance = __mockStateGraph.mock.results[0].value;
      expect(graphInstance.addNode).toHaveBeenCalledWith('update_state', expect.any(Function));
    });

    it('should have llm_call node that calls LLM', async () => {
      // Graph structure is verified through StateGraph mock
      const { __mockStateGraph } = await import('@langchain/langgraph');
      expect(__mockStateGraph).toHaveBeenCalled();
      const graphInstance = __mockStateGraph.mock.results[0].value;
      expect(graphInstance.addNode).toHaveBeenCalledWith('llm_call', expect.any(Function));
    });

    it('should have execute_tools node for tool execution', async () => {
      // Graph structure is verified through StateGraph mock
      const { __mockStateGraph } = await import('@langchain/langgraph');
      expect(__mockStateGraph).toHaveBeenCalled();
      const graphInstance = __mockStateGraph.mock.results[0].value;
      expect(graphInstance.addNode).toHaveBeenCalledWith('execute_tools', expect.any(Function));
    });
  });
});
