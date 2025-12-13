import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGetChunkDataTool } from './getChunkData.js';
import { EventEmitter } from 'events';
import type { GameState } from '../../../GameState.js';
import { SpatialMemory } from '../../../spatialMemory/index.js';

class MockGameState extends EventEmitter {
  worldStateRequestManager: any;
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createGetChunkDataTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetChunkDataTool>;
  let mockRequestManager: any;

  beforeEach(() => {
    mockGameState = new MockGameState();
    mockRequestManager = {
      requestChunk: vi.fn(),
    };
    mockGameState.worldStateRequestManager = mockRequestManager;
    tool = createGetChunkDataTool(mockGameState as any);
  });

  it('should request chunk data and return loaded status', async () => {
    const mockChunk = { x: 6, z: 12, blocks: [] };
    mockRequestManager.requestChunk.mockResolvedValue(mockChunk);

    const result = await tool.invoke({ chunkX: 6, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(mockRequestManager.requestChunk).toHaveBeenCalledWith(6, 12);
    expect(parsed.chunkX).toBe(6);
    expect(parsed.chunkZ).toBe(12);
    expect(parsed.loaded).toBe(true);
    expect(parsed.chunkType).toBe('ChunkColumn');
  });

  it('should handle null chunk response', async () => {
    mockRequestManager.requestChunk.mockResolvedValue(null);

    const result = await tool.invoke({ chunkX: 6, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(parsed.loaded).toBe(false);
    expect(parsed.chunkType).toBe('none');
  });

  it('should return error when request manager not initialized', async () => {
    mockGameState.worldStateRequestManager = undefined;

    const result = await tool.invoke({ chunkX: 6, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Request manager not initialized');
  });

  it('should handle request errors', async () => {
    mockRequestManager.requestChunk.mockRejectedValue(
      new Error('Chunk timeout')
    );

    const result = await tool.invoke({ chunkX: 6, chunkZ: 12 });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Chunk timeout');
    expect(parsed.chunkX).toBe(6);
    expect(parsed.chunkZ).toBe(12);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_chunk_data');
  });
});
