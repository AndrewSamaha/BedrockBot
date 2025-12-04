import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLookTool } from './look.js';
import { EventEmitter } from 'events';
import type { Client } from 'bedrock-protocol';
import type { GameState } from '../../../GameState.js';
import * as moveServerCmd from '../../../serverCommands/move.js';
import { botConfig } from '@/config/bot.js';

vi.mock('../../../serverCommands/move.js', () => ({
  move: vi.fn(),
}));

describe('createLookTool', () => {
  let mockClient: any;
  let mockGameState: any;
  let tool: ReturnType<typeof createLookTool>;

  beforeEach(() => {
    mockClient = {};
    mockGameState = new EventEmitter();
    mockGameState.playerPosition = { x: 100, y: 64, z: 200 };
    mockGameState.yaw = 90;
    mockGameState.pitch = 0;
    mockGameState.headYaw = 90;
    mockGameState.client = mockClient;
    tool = createLookTool(mockClient, mockGameState);
    vi.clearAllMocks();
  });

  it('should set look direction with provided yaw and pitch', async () => {
    const result = await tool.invoke({ yaw: 180, pitch: -45 });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.yaw).toBe(180);
    expect(parsed.pitch).toBe(-45);

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    expect(call[2]).toEqual({ x: 0, y: 0, z: 0 }); // No movement
    expect(call[3]).toMatchObject({
      yaw: 180,
      pitch: -45,
      head_yaw: 180,
    });
  });

  it('should use preset forward direction', async () => {
    const result = await tool.invoke({ direction: 'forward' });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.pitch).toBe(botConfig.look.forwardPitch);

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    expect(call[3].pitch).toBe(botConfig.look.forwardPitch);
  });

  it('should use preset down direction', async () => {
    const result = await tool.invoke({ direction: 'down' });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.pitch).toBe(botConfig.look.downOneBlockPitch);

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    expect(call[3].pitch).toBe(botConfig.look.downOneBlockPitch);
  });

  it('should use current rotation when not provided', async () => {
    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.yaw).toBe(90);
    expect(parsed.pitch).toBe(0);

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    expect(call[3].yaw).toBe(90);
    expect(call[3].pitch).toBe(0);
  });

  it('should return error when position not available', async () => {
    mockGameState.playerPosition = undefined;

    const result = await tool.invoke({ yaw: 180 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Player position or client not available');
    expect(moveServerCmd.move).not.toHaveBeenCalled();
  });

  it('should handle look errors', async () => {
    vi.mocked(moveServerCmd.move).mockImplementation(() => {
      throw new Error('Look failed');
    });

    const result = await tool.invoke({ yaw: 180 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Look failed');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('look');
  });
});
