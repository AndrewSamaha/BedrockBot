import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGetBlockAtTool } from './getBlockAt.js';
import { EventEmitter } from 'events';
import type { GameState } from '../../../GameState.js';
import { SpatialMemory } from '../../../spatialMemory/index.js';

class MockGameState extends EventEmitter {
  world: any;
  registry: any;
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createGetBlockAtTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetBlockAtTool>;

  beforeEach(() => {
    mockGameState = new MockGameState();
    mockGameState.world = {
      getChunk: vi.fn(),
      getBlockStateIdAt: vi.fn(),
    };
    mockGameState.registry = {
      blocksByStateId: {
        1: { name: 'stone' },
        2: { name: 'dirt' },
      },
    };
    tool = createGetBlockAtTool(mockGameState as any);
  });

  it('should return block info when chunk is loaded', async () => {
    mockGameState.world.getChunk.mockReturnValue({ x: 6, z: 12 });
    mockGameState.world.getBlockStateIdAt.mockReturnValue(1);

    const result = await tool.invoke({ x: 100, y: 64, z: 200 });
    const parsed = JSON.parse(result);

    expect(parsed.found).toBe(true);
    expect(parsed.stateId).toBe(1);
    expect(parsed.blockName).toBe('stone');
    expect(parsed.x).toBe(100);
    expect(parsed.y).toBe(64);
    expect(parsed.z).toBe(200);
    expect(parsed.chunkX).toBe(6);
    expect(parsed.chunkZ).toBe(12);
  });

  it('should return not found when chunk not loaded', async () => {
    mockGameState.world.getChunk.mockReturnValue(null);

    const result = await tool.invoke({ x: 100, y: 64, z: 200 });
    const parsed = JSON.parse(result);

    expect(parsed.found).toBe(false);
    expect(parsed.note).toContain('Chunk not loaded');
    expect(parsed.chunkX).toBe(6);
    expect(parsed.chunkZ).toBe(12);
  });

  it('should handle missing registry', async () => {
    mockGameState.world.getChunk.mockReturnValue({ x: 6, z: 12 });
    mockGameState.registry = undefined;

    const result = await tool.invoke({ x: 100, y: 64, z: 200 });
    const parsed = JSON.parse(result);

    expect(parsed.found).toBe(false);
    expect(parsed.note).toBe('Could not retrieve block data');
  });

  it('should handle block lookup errors', async () => {
    mockGameState.world.getChunk.mockReturnValue({ x: 6, z: 12 });
    mockGameState.world.getBlockStateIdAt.mockImplementation(() => {
      throw new Error('Block lookup failed');
    });

    const result = await tool.invoke({ x: 100, y: 64, z: 200 });
    const parsed = JSON.parse(result);

    expect(parsed.found).toBe(false);
    expect(parsed.note).toBe('Could not retrieve block data');
  });

  it('should calculate chunk coordinates correctly', async () => {
    mockGameState.world.getChunk.mockReturnValue(null);

    await tool.invoke({ x: 100, y: 64, z: 200 });
    expect(mockGameState.world.getChunk).toHaveBeenCalledWith(6, 12);

    await tool.invoke({ x: -10, y: 64, z: -20 });
    expect(mockGameState.world.getChunk).toHaveBeenCalledWith(-1, -2);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_block_at');
  });
});
