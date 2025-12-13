import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGetSubchunkDataTool } from './getSubchunkData.js';
import { EventEmitter } from 'events';
import type { GameState } from '../../../GameState.js';
import { WorldStateRequestManager } from '../../WorldStateRequestManager.js';
import { SpatialMemory } from '../../../spatialMemory/index.js';

class MockGameState extends EventEmitter {
  playerPosition = { x: 100, y: 64, z: 200 };
  worldStateRequestManager: WorldStateRequestManager | undefined;
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createGetSubchunkDataTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetSubchunkDataTool>;
  let mockRequestManager: any;

  beforeEach(() => {
    mockGameState = new MockGameState();
    mockRequestManager = {
      requestSubchunk: vi.fn(),
    };
    mockGameState.worldStateRequestManager = mockRequestManager;
    tool = createGetSubchunkDataTool(mockGameState as any);
  });

  it('should request subchunk data and return blocks', async () => {
    const mockBlockData = [
      { x: 100, y: 64, z: 200 },
      { x: 101, y: 64, z: 200 },
      { x: 102, y: 64, z: 200 },
    ];
    mockRequestManager.requestSubchunk.mockResolvedValue(mockBlockData);

    const result = await tool.invoke({ chunkX: 6, chunkY: 4, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(mockRequestManager.requestSubchunk).toHaveBeenCalledWith(6, 4, 12);
    expect(parsed.chunkX).toBe(6);
    expect(parsed.chunkY).toBe(4);
    expect(parsed.chunkZ).toBe(12);
    expect(parsed.blockCount).toBe(3);
    expect(parsed.totalBlocks).toBe(3);
    expect(parsed.blocks).toHaveLength(3);
  });

  it('should limit blocks to 100 for response size', async () => {
    const mockBlockData = Array.from({ length: 150 }, (_, i) => ({
      x: 100 + i,
      y: 64,
      z: 200,
    }));
    mockRequestManager.requestSubchunk.mockResolvedValue(mockBlockData);

    const result = await tool.invoke({ chunkX: 6, chunkY: 4, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(parsed.totalBlocks).toBe(150);
    expect(parsed.blocks).toHaveLength(100);
  });

  it('should return error when request manager not initialized', async () => {
    mockGameState.worldStateRequestManager = undefined;

    const result = await tool.invoke({ chunkX: 6, chunkY: 4, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Request manager not initialized');
  });

  it('should handle request errors', async () => {
    mockRequestManager.requestSubchunk.mockRejectedValue(
      new Error('Timeout')
    );

    const result = await tool.invoke({ chunkX: 6, chunkY: 4, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Timeout');
    expect(parsed.chunkX).toBe(6);
    expect(parsed.chunkY).toBe(4);
    expect(parsed.chunkZ).toBe(12);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_subchunk_data');
  });

  it('should validate schema parameters', () => {
    expect(tool.schema.shape.chunkX).toBeDefined();
    expect(tool.schema.shape.chunkY).toBeDefined();
    expect(tool.schema.shape.chunkZ).toBeDefined();
  });
});
