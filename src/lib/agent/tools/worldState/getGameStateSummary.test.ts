import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGetGameStateSummaryTool } from './getGameStateSummary.js';
import { EventEmitter } from 'events';
import type { GameState } from '../../../GameState.js';
import { SpatialMemory } from '../../../spatialMemory/index.js';

class MockGameState extends EventEmitter {
  spawned = true;
  playerPosition = { x: 100, y: 64, z: 200 };
  pitch = 0;
  yaw = 90;
  headYaw = 90;
  gameTime = 12000;
  dayPhase = 'day';
  overworldPlayerCount = 5;
  sleepingPlayerCount = 2;
  ableToSleep = 3;
  world: any;
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createGetGameStateSummaryTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetGameStateSummaryTool>;

  beforeEach(() => {
    mockGameState = new MockGameState();
    mockGameState.world = {
      getChunkCount: vi.fn(() => 10),
      getAllChunkCoords: vi.fn(() => [
        [0, 0],
        [1, 1],
      ]),
    };
    tool = createGetGameStateSummaryTool(mockGameState as any);
  });

  it('should return complete game state summary', async () => {
    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.spawned).toBe(true);
    expect(parsed.position).toEqual({ x: 100, y: 64, z: 200 });
    expect(parsed.rotation).toEqual({
      pitch: 0,
      yaw: 90,
      headYaw: 90,
    });
    expect(parsed.gameTime).toBe(12000);
    expect(parsed.dayPhase).toBe('day');
    expect(parsed.playerCounts).toEqual({
      overworld: 5,
      sleeping: 2,
      ableToSleep: 3,
    });
    expect(parsed.world.chunkCount).toBe(10);
    expect(parsed.world.loadedChunks).toBe(2);
    expect(parsed.timestamp).toBeTypeOf('number');
  });

  it('should handle missing optional fields', async () => {
    mockGameState.pitch = undefined;
    mockGameState.gameTime = undefined;
    mockGameState.overworldPlayerCount = undefined;

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.rotation.pitch).toBeUndefined();
    expect(parsed.gameTime).toBeUndefined();
    expect(parsed.playerCounts.overworld).toBeUndefined();
  });

  it('should include timestamp', async () => {
    const before = Date.now();
    const result = await tool.invoke({});
    const after = Date.now();
    const parsed = JSON.parse(result);

    expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
    expect(parsed.timestamp).toBeLessThanOrEqual(after);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_game_state_summary');
  });
});
