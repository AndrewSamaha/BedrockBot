import { describe, it, expect, beforeEach } from 'vitest';
import { createFilterBlockTypesTool } from './filterBlockTypes.js';
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

describe('createFilterBlockTypesTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createFilterBlockTypesTool>;
  let engramId: string;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createFilterBlockTypesTool(mockGameState as any);

    // Create a test engram with various block types
    const engram = new SpatialEngram('Test Structure', 'A test structure');
    engram.addBlock(0, 0, 0, 'stone');
    engram.addBlock(1, 0, 0, 'air');
    engram.addBlock(2, 0, 0, 'dirt');
    engram.addBlock(3, 0, 0, 'air');
    engram.addBlock(4, 0, 0, 'water');
    engram.addBlock(5, 0, 0, 'stone');
    engramId = mockGameState.spatialMemory.addEngram(engram, { x: 0, y: 0, z: 0 });
  });

  it('should remove all air blocks', async () => {
    const result = await tool.invoke({
      engramId,
      blockTypes: ['air'],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.removedCount).toBe(2);
    expect(parsed.remainingBlocks).toBe(4); // stone, dirt, water, stone

    const entry = mockGameState.spatialMemory.getEngram(engramId);
    expect(entry?.engram.getBlock(0, 0, 0)).toBe('stone');
    expect(entry?.engram.getBlock(1, 0, 0)).toBe(null); // air removed
    expect(entry?.engram.getBlock(2, 0, 0)).toBe('dirt');
    expect(entry?.engram.getBlock(3, 0, 0)).toBe(null); // air removed
    expect(entry?.engram.getBlock(4, 0, 0)).toBe('water');
    expect(entry?.engram.getBlock(5, 0, 0)).toBe('stone');
  });

  it('should remove multiple block types', async () => {
    const result = await tool.invoke({
      engramId,
      blockTypes: ['air', 'water'],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.removedCount).toBe(3); // 2 air + 1 water
    expect(parsed.remainingBlocks).toBe(3); // stone, dirt, stone
  });

  it('should handle case-insensitive block types', async () => {
    const result = await tool.invoke({
      engramId,
      blockTypes: ['AIR', 'Water'],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.removedCount).toBe(3); // Should still remove air and water
  });

  it('should handle non-existent block types gracefully', async () => {
    const result = await tool.invoke({
      engramId,
      blockTypes: ['non_existent_block'],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.removedCount).toBe(0);
    expect(parsed.remainingBlocks).toBe(6); // All blocks remain
  });

  it('should return error for non-existent engram', async () => {
    const result = await tool.invoke({
      engramId: 'non-existent-id',
      blockTypes: ['air'],
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('not found');
  });

  it('should handle empty blockTypes array', async () => {
    const result = await tool.invoke({
      engramId,
      blockTypes: [],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.removedCount).toBe(0);
    expect(parsed.remainingBlocks).toBe(6); // All blocks remain
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('filter_block_types');
  });

  it('should remove all blocks of a type when all blocks are that type', async () => {
    // Create engram with only air blocks
    const airEngram = new SpatialEngram('Air Only', 'Only air');
    airEngram.addBlock(0, 0, 0, 'air');
    airEngram.addBlock(1, 0, 0, 'air');
    airEngram.addBlock(2, 0, 0, 'air');
    const airEngramId = mockGameState.spatialMemory.addEngram(airEngram, { x: 0, y: 0, z: 0 });

    const result = await tool.invoke({
      engramId: airEngramId,
      blockTypes: ['air'],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.removedCount).toBe(3);
    expect(parsed.remainingBlocks).toBe(0);

    const entry = mockGameState.spatialMemory.getEngram(airEngramId);
    expect(entry?.engram.getBlockCount()).toBe(0);
  });
});
