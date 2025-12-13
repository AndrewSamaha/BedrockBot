import { describe, it, expect, beforeEach } from 'vitest';
import { createRemoveBlockFromImaginationTool } from './removeBlockFromImagination.js';
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

describe('createRemoveBlockFromImaginationTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createRemoveBlockFromImaginationTool>;
  let engramId: string;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createRemoveBlockFromImaginationTool(mockGameState as any);

    // Create a test engram with blocks
    const engram = new SpatialEngram('Test', 'Description');
    engram.addBlock(0, 0, 0, 'stone');
    engram.addBlock(1, 0, 0, 'dirt');
    engramId = mockGameState.spatialMemory.addEngram(engram, { x: 0, y: 0, z: 0 });
  });

  it('should remove a block from an engram', async () => {
    const result = await tool.invoke({
      engramId,
      x: 0,
      y: 0,
      z: 0,
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blockCount).toBe(1);

    const entry = mockGameState.spatialMemory.getEngram(engramId);
    expect(entry?.engram.getBlock(0, 0, 0)).toBe(null);
    expect(entry?.engram.getBlock(1, 0, 0)).toBe('dirt');
  });

  it('should return false when block does not exist', async () => {
    const result = await tool.invoke({
      engramId,
      x: 999,
      y: 999,
      z: 999,
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(false);
    expect(parsed.note).toContain('No block found');
  });

  it('should return error for non-existent engram', async () => {
    const result = await tool.invoke({
      engramId: 'non-existent-id',
      x: 0,
      y: 0,
      z: 0,
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('not found');
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('remove_block_from_imagination');
  });
});
