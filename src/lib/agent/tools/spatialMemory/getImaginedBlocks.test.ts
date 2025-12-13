import { describe, it, expect, beforeEach } from 'vitest';
import { createGetImaginedBlocksTool } from './getImaginedBlocks.js';
import { EventEmitter } from 'events';
import { SpatialMemory } from '../../../spatialMemory/index.js';
import { SpatialEngram } from '../../../spatialMemory/SpatialEngram.js';
import type { GameState } from '../../../GameState.js';

class MockGameState extends EventEmitter {
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createGetImaginedBlocksTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetImaginedBlocksTool>;
  let engramId1: string;
  let engramId2: string;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createGetImaginedBlocksTool(mockGameState as any);

    // Create test engrams
    const engram1 = new SpatialEngram('House', 'A house');
    engram1.addBlock(0, 0, 0, 'stone');
    engram1.addBlock(1, 0, 0, 'stone');
    engramId1 = mockGameState.spatialMemory.addEngram(engram1, { x: 100, y: 64, z: 200 });

    const engram2 = new SpatialEngram('Tower', 'A tower');
    engram2.addBlock(0, 0, 0, 'wood');
    engramId2 = mockGameState.spatialMemory.addEngram(engram2, { x: 200, y: 64, z: 300 });
  });

  it('should return all engrams summary when no parameters', async () => {
    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.engramCount).toBe(2);
    expect(parsed.engrams).toHaveLength(2);
    expect(parsed.engrams[0].name).toBe('House');
    expect(parsed.engrams[1].name).toBe('Tower');
  });

  it('should return blocks from specific engram', async () => {
    const result = await tool.invoke({ engramId: engramId1 });
    const parsed = JSON.parse(result);

    expect(parsed.engramId).toBe(engramId1);
    expect(parsed.name).toBe('House');
    expect(parsed.blockCount).toBe(2);
    expect(parsed.blocks).toHaveLength(2);
    expect(parsed.blocks[0].blockType).toBe('stone');
  });

  it('should filter blocks by world region', async () => {
    const result = await tool.invoke({
      worldRegion: {
        minX: 99,
        minY: 63,
        minZ: 199,
        maxX: 102,
        maxY: 65,
        maxZ: 201,
      },
    });
    const parsed = JSON.parse(result);

    // Should find blocks from engram1 (at world 100,64,200)
    expect(parsed.blockCount).toBeGreaterThan(0);
    expect(parsed.blocks.every((b: any) => b.blockType === 'stone')).toBe(true);
  });

  it('should return error for non-existent engram', async () => {
    const result = await tool.invoke({ engramId: 'non-existent-id' });
    const parsed = JSON.parse(result);

    expect(parsed.error).toContain('not found');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_imagined_blocks');
  });
});
