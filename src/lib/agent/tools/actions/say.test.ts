import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSayTool } from './say.js';
import type { Client } from 'bedrock-protocol';
import * as serverCommands from '../../../serverCommands/index.js';

vi.mock('../../../serverCommands/index.js', () => ({
  say: vi.fn(),
}));

describe('createSayTool', () => {
  let mockClient: any;
  let tool: ReturnType<typeof createSayTool>;
  const username = 'TestBot';

  beforeEach(() => {
    mockClient = {
      queue: vi.fn(),
    };
    tool = createSayTool(mockClient, username);
    vi.clearAllMocks();
  });

  it('should send chat message', async () => {
    const result = await tool.invoke({ message: 'Hello, world!' });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.message).toBe('Hello, world!');
    expect(serverCommands.say).toHaveBeenCalledWith(
      mockClient,
      username,
      'Hello, world!'
    );
  });

  it('should handle different messages', async () => {
    await tool.invoke({ message: 'Test message 123' });

    expect(serverCommands.say).toHaveBeenCalledWith(
      mockClient,
      username,
      'Test message 123'
    );
  });

  it('should handle say errors', async () => {
    vi.mocked(serverCommands.say).mockImplementation(() => {
      throw new Error('Say failed');
    });

    const result = await tool.invoke({ message: 'Hello' });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Say failed');
    expect(parsed.message).toBe('Hello');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('say');
  });

  it('should validate schema parameters', () => {
    expect(tool.schema.shape.message).toBeDefined();
  });
});
