import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAddBlockToImaginationTool } from './addBlockToImagination.js';
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

describe('createAddBlockToImaginationTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createAddBlockToImaginationTool>;
  let engramId: string;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createAddBlockToImaginationTool(mockGameState as any);

    // Create a test engram
    const engram = new SpatialEngram('Test', 'Description');
    engramId = mockGameState.spatialMemory.addEngram(engram, { x: 0, y: 0, z: 0 });
  });

  it('should add a block to an engram', async () => {
    const result = await tool.invoke({
      engramId,
      x: 5,
      y: 10,
      z: 15,
      blockType: 'stone',
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blockCount).toBe(1);

    const entry = mockGameState.spatialMemory.getEngram(engramId);
    expect(entry?.engram.getBlock(5, 10, 15)).toBe('stone');
  });

  it('should return error for non-existent engram', async () => {
    const result = await tool.invoke({
      engramId: 'non-existent-id',
      x: 0,
      y: 0,
      z: 0,
      blockType: 'stone',
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('not found');
  });

  it('should handle maxBlocks limit', async () => {
    // Create engram with small limit
    const smallEngram = new SpatialEngram('Small', 'Description', 1);
    const smallEngramId = mockGameState.spatialMemory.addEngram(smallEngram, { x: 0, y: 0, z: 0 });
    smallEngram.addBlock(0, 0, 0, 'stone'); // Fill it

    const result = await tool.invoke({
      engramId: smallEngramId,
      x: 1,
      y: 0,
      z: 0,
      blockType: 'dirt',
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.note).toContain('maxBlocks limit');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('add_block_to_imagination');
  });
});
