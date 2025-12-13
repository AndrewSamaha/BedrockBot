import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTeleportTool } from './teleport.js';
import type { Client } from 'bedrock-protocol';
import * as serverCommands from '../../../serverCommands/index.js';

vi.mock('../../../serverCommands/index.js', () => ({
  teleport: vi.fn(),
}));

describe('createTeleportTool', () => {
  let mockClient: any;
  let tool: ReturnType<typeof createTeleportTool>;

  beforeEach(() => {
    mockClient = {
      queue: vi.fn(),
    };
    tool = createTeleportTool(mockClient);
    vi.clearAllMocks();
  });

  it('should teleport to coordinates', async () => {
    const result = await tool.invoke({ destination: '100 64 200' });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.destination).toBe('100 64 200');
    expect(parsed.note).toContain('Teleport command sent');
    expect(serverCommands.teleport).toHaveBeenCalledWith(
      mockClient,
      '100 64 200'
    );
  });

  it('should teleport to player name', async () => {
    const result = await tool.invoke({ destination: 'PlayerName' });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.destination).toBe('PlayerName');
    expect(serverCommands.teleport).toHaveBeenCalledWith(
      mockClient,
      'PlayerName'
    );
  });

  it('should handle teleport errors', async () => {
    vi.mocked(serverCommands.teleport).mockImplementation(() => {
      throw new Error('Teleport failed');
    });

    const result = await tool.invoke({ destination: '100 64 200' });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Teleport failed');
    expect(parsed.destination).toBe('100 64 200');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('teleport');
  });
});
