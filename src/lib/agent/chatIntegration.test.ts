import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeAgentExecutor, processChatMessage } from './chatIntegration.js';
import { AgentExecutor } from './executor.js';
import type { GameState } from '../GameState.js';
import type { Client } from 'bedrock-protocol';
import { EventEmitter } from 'events';
import { SpatialMemory } from '../spatialMemory/index.js';

// Mock dependencies
vi.mock('./executor.js', () => ({
  AgentExecutor: vi.fn().mockImplementation(() => ({
    processMessage: vi.fn().mockResolvedValue('Agent response'),
  })),
}));

vi.mock('../log.js', () => {
  const mockLog = vi.fn();
  return {
    log: mockLog,
    __mockLog: mockLog,
  };
});

// Mock ConversationManager
class MockConversationManager {
  newMessage = vi.fn().mockReturnValue({
    messages: [],
    pushHumanMsg: vi.fn(),
    pushAiMsg: vi.fn(),
  });
  generateChatResponse = vi.fn().mockResolvedValue('Simple chat response');
}

// Mock GameState
class MockGameState extends EventEmitter {
  client: Client | null = null;
  conversationManager: MockConversationManager | null = null;
  agentExecutor: AgentExecutor | undefined = undefined;
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.conversationManager = new MockConversationManager();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('chatIntegration', () => {
  let mockGameState: MockGameState;
  let mockClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = new MockGameState();
    mockClient = {} as Client;
  });

  describe('initializeAgentExecutor', () => {
    it('should initialize executor when client is set', () => {
      mockGameState.client = mockClient;

      initializeAgentExecutor(mockGameState as any, mockClient, 'TestBot');

      expect(AgentExecutor).toHaveBeenCalledWith(mockGameState, mockClient, 'TestBot');
      expect((mockGameState as any).agentExecutor).toBeDefined();
      expect((mockGameState as any).agentExecutor.processMessage).toBeDefined();
    });

    it('should not initialize executor when client is not set', () => {
      mockGameState.client = null;

      initializeAgentExecutor(mockGameState as any, mockClient, 'TestBot');

      expect(AgentExecutor).not.toHaveBeenCalled();
      expect((mockGameState as any).agentExecutor).toBeUndefined();
    });

    it('should handle initialization errors gracefully', () => {
      mockGameState.client = mockClient;
      (AgentExecutor as any).mockImplementationOnce(() => {
        throw new Error('Initialization failed');
      });

      expect(() => {
        initializeAgentExecutor(mockGameState as any, mockClient, 'TestBot');
      }).not.toThrow();

      expect((mockGameState as any).agentExecutor).toBeUndefined();
    });

    it('should log initialization success', async () => {
      mockGameState.client = mockClient;
      const { __mockLog } = await import('../log.js');

      initializeAgentExecutor(mockGameState as any, mockClient, 'TestBot');

      expect(__mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIntegration: 'initialized',
          username: 'TestBot',
        })
      );
    });

    it('should log error when client not set', async () => {
      mockGameState.client = null;
      const { __mockLog } = await import('../log.js');

      initializeAgentExecutor(mockGameState as any, mockClient, 'TestBot');

      expect(__mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIntegration: 'error',
          message: 'Cannot initialize agent: client not set',
        })
      );
    });
  });

  describe('processChatMessage', () => {
    it('should use agent executor when available', async () => {
      const mockExecutor = {
        processMessage: vi.fn().mockResolvedValue('Agent response'),
      };
      (mockGameState as any).agentExecutor = mockExecutor;

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(mockExecutor.processMessage).toHaveBeenCalledWith('Hello', 'User');
      expect(result).toBe('Agent response');
    });

    it('should fall back to simple chat when executor not available', async () => {
      (mockGameState as any).agentExecutor = undefined;
      mockGameState.conversationManager = new MockConversationManager();

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(mockGameState.conversationManager!.newMessage).toHaveBeenCalledWith('User', 'Hello');
      expect(mockGameState.conversationManager!.generateChatResponse).toHaveBeenCalled();
      expect(result).toBe('Simple chat response');
    });

    it('should fall back to simple chat when executor throws error', async () => {
      const mockExecutor = {
        processMessage: vi.fn().mockRejectedValue(new Error('Agent error')),
      };
      (mockGameState as any).agentExecutor = mockExecutor;
      mockGameState.conversationManager = new MockConversationManager();

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(mockExecutor.processMessage).toHaveBeenCalled();
      expect(mockGameState.conversationManager!.newMessage).toHaveBeenCalled();
      expect(result).toBe('Simple chat response');
    });

    it('should return null when no executor and no conversation manager', async () => {
      (mockGameState as any).agentExecutor = undefined;
      mockGameState.conversationManager = null;

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(result).toBeNull();
    });

    it('should return null when conversation manager returns null', async () => {
      (mockGameState as any).agentExecutor = undefined;
      mockGameState.conversationManager = {
        newMessage: vi.fn().mockReturnValue(null),
        generateChatResponse: vi.fn(),
      } as any;

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(result).toBeNull();
    });

    it('should handle simple chat errors gracefully', async () => {
      (mockGameState as any).agentExecutor = undefined;
      mockGameState.conversationManager = {
        newMessage: vi.fn().mockReturnValue({ messages: [] }),
        generateChatResponse: vi.fn().mockRejectedValue(new Error('Chat error')),
      } as any;

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(result).toBeNull();
    });

    it('should log when using agent', async () => {
      const mockExecutor = {
        processMessage: vi.fn().mockResolvedValue('Agent response'),
      };
      (mockGameState as any).agentExecutor = mockExecutor;
      const { __mockLog } = await import('../log.js');

      await processChatMessage(mockGameState as any, 'Hello', 'User', mockClient, 'TestBot');

      expect(__mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIntegration: 'using_agent',
          speakerName: 'User',
          message: 'Hello',
        })
      );
    });

    it('should log when falling back to simple chat', async () => {
      const mockExecutor = {
        processMessage: vi.fn().mockRejectedValue(new Error('Agent error')),
      };
      (mockGameState as any).agentExecutor = mockExecutor;
      mockGameState.conversationManager = new MockConversationManager();
      const { __mockLog } = await import('../log.js');

      await processChatMessage(mockGameState as any, 'Hello', 'User', mockClient, 'TestBot');

      expect(__mockLog).toHaveBeenCalledWith(
        expect.objectContaining({
          agentIntegration: 'agent_error',
          fallback: 'simple_chat',
        })
      );
    });

    it('should handle null chat response from conversation manager', async () => {
      (mockGameState as any).agentExecutor = undefined;
      mockGameState.conversationManager = {
        newMessage: vi.fn().mockReturnValue({ messages: [] }),
        generateChatResponse: vi.fn().mockResolvedValue(null),
      } as any;

      const result = await processChatMessage(
        mockGameState as any,
        'Hello',
        'User',
        mockClient,
        'TestBot'
      );

      expect(result).toBeNull();
    });
  });
});
