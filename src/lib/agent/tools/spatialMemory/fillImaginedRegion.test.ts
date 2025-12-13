import { describe, it, expect, beforeEach } from 'vitest';
import { createFillImaginedRegionTool } from './fillImaginedRegion.js';
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

describe('createFillImaginedRegionTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createFillImaginedRegionTool>;
  let engramId: string;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createFillImaginedRegionTool(mockGameState as any);

    // Create a test engram
    const engram = new SpatialEngram('Test', 'Description');
    engramId = mockGameState.spatialMemory.addEngram(engram, { x: 0, y: 0, z: 0 });
  });

  it('should fill a region with blocks', async () => {
    const result = await tool.invoke({
      engramId,
      startX: 0,
      startY: 0,
      startZ: 0,
      endX: 2,
      endY: 0,
      endZ: 0,
      blockType: 'stone',
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blocksAdded).toBe(3); // 0,0,0 to 2,0,0 = 3 blocks
    expect(parsed.totalBlocks).toBe(3);
  });

  it('should handle reversed coordinates', async () => {
    const result = await tool.invoke({
      engramId,
      startX: 2,
      startY: 0,
      startZ: 0,
      endX: 0,
      endY: 0,
      endZ: 0,
      blockType: 'dirt',
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blocksAdded).toBe(3); // Should still fill 3 blocks
  });

  it('should fill 3D region', async () => {
    const result = await tool.invoke({
      engramId,
      startX: 0,
      startY: 0,
      startZ: 0,
      endX: 1,
      endY: 1,
      endZ: 1,
      blockType: 'wood',
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blocksAdded).toBe(8); // 2x2x2 = 8 blocks
  });

  it('should return error for non-existent engram', async () => {
    const result = await tool.invoke({
      engramId: 'non-existent-id',
      startX: 0,
      startY: 0,
      startZ: 0,
      endX: 1,
      endY: 1,
      endZ: 1,
      blockType: 'stone',
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('not found');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('fill_imagined_region');
  });
});
