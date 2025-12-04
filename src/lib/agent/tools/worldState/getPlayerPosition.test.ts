import { describe, it, expect, beforeEach } from 'vitest';
import { createGetPlayerPositionTool } from './getPlayerPosition.js';
import { EventEmitter } from 'events';
import type { GameState } from '../../../GameState.js';

class MockGameState extends EventEmitter {
  playerPosition = { x: 100, y: 64, z: 200 };
  pitch = 0;
  yaw = 90;
  headYaw = 90;
  worldStateRequestManager = undefined;
}

describe('createGetPlayerPositionTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetPlayerPositionTool>;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createGetPlayerPositionTool(mockGameState as any);
  });

  it('should return player position when available', async () => {
    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.x).toBe(100);
    expect(parsed.y).toBe(64);
    expect(parsed.z).toBe(200);
    expect(parsed.pitch).toBe(0);
    expect(parsed.yaw).toBe(90);
    expect(parsed.headYaw).toBe(90);
  });

  it('should return error when position not available', async () => {
    mockGameState.playerPosition = undefined as any;

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Player position not available');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_player_position');
  });

  it('should have correct description', () => {
    expect(tool.description).toContain('current position');
    expect(tool.description).toContain('coordinates');
  });

  it('should accept empty parameters', () => {
    expect(tool.schema.shape).toEqual({});
  });
});
