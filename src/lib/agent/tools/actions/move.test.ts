import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMoveTool } from './move.js';
import { EventEmitter } from 'events';
import type { Client } from 'bedrock-protocol';
import type { GameState } from '../../../GameState.js';
import * as moveServerCmd from '../../../serverCommands/move.js';

vi.mock('../../../serverCommands/move.js', () => ({
  move: vi.fn(),
}));

describe('createMoveTool', () => {
  let mockClient: any;
  let mockGameState: any;
  let tool: ReturnType<typeof createMoveTool>;

  beforeEach(() => {
    mockClient = {};
    mockGameState = new EventEmitter();
    mockGameState.playerPosition = { x: 100, y: 64, z: 200 };
    mockGameState.yaw = 90;
    mockGameState.pitch = 0;
    mockGameState.headYaw = 90;
    mockGameState.client = mockClient;
    tool = createMoveTool(mockClient, mockGameState);
    vi.clearAllMocks();
  });

  it('should calculate movement vector towards target', async () => {
    const result = await tool.invoke({ x: 110, y: 64, z: 210 });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.target).toEqual({ x: 110, y: 64, z: 210 });
    expect(parsed.currentPosition).toEqual({ x: 100, y: 64, z: 200 });
    expect(parsed.distance).toBeCloseTo(14.14, 1);
    expect(moveServerCmd.move).toHaveBeenCalled();
  });

  it('should use provided yaw and pitch', async () => {
    await tool.invoke({ x: 110, y: 64, z: 210, yaw: 180, pitch: -45 });

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    expect(call[3]).toMatchObject({
      yaw: 180,
      pitch: -45,
      head_yaw: 180,
    });
  });

  it('should use current rotation when yaw/pitch not provided', async () => {
    await tool.invoke({ x: 110, y: 64, z: 210 });

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    expect(call[3]).toMatchObject({
      yaw: 90,
      pitch: 0,
      head_yaw: 90,
    });
  });

  it('should return error when player position not available', async () => {
    mockGameState.playerPosition = undefined;

    const result = await tool.invoke({ x: 110, y: 64, z: 210 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Player position not available');
    expect(moveServerCmd.move).not.toHaveBeenCalled();
  });

  it('should return error when client not connected', async () => {
    mockGameState.client = undefined;

    const result = await tool.invoke({ x: 110, y: 64, z: 210 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Client not connected');
  });

  it('should limit movement vector to max distance', async () => {
    await tool.invoke({ x: 200, y: 64, z: 300 });

    const call = vi.mocked(moveServerCmd.move).mock.calls[0];
    // call[0] = client, call[1] = gameState, call[2] = moveVector, call[3] = lookVector
    const moveVector = call[2];
    const distance = Math.sqrt(
      moveVector.x ** 2 + moveVector.y ** 2 + moveVector.z ** 2
    );
    expect(distance).toBeLessThanOrEqual(0.1);
  });

  it('should handle movement errors', async () => {
    vi.mocked(moveServerCmd.move).mockImplementation(() => {
      throw new Error('Movement failed');
    });

    const result = await tool.invoke({ x: 110, y: 64, z: 210 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Movement failed');
    expect(parsed.target).toEqual({ x: 110, y: 64, z: 210 });
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('move');
  });
});
