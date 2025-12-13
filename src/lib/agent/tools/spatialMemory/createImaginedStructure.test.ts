import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCreateImaginedStructureTool } from './createImaginedStructure.js';
import { EventEmitter } from 'events';
import { SpatialMemory } from '../../../spatialMemory/index.js';
import type { GameState } from '../../../GameState.js';

class MockGameState extends EventEmitter {
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createCreateImaginedStructureTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createCreateImaginedStructureTool>;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createCreateImaginedStructureTool(mockGameState as any);
  });

  it('should create an imagined structure', async () => {
    const result = await tool.invoke({
      name: 'Test House',
      description: 'A small test house',
      blocks: [
        { x: 0, y: 0, z: 0, blockType: 'stone' },
        { x: 1, y: 0, z: 0, blockType: 'stone' },
        { x: 0, y: 1, z: 0, blockType: 'oak_planks' },
      ],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.name).toBe('Test House');
    expect(parsed.description).toBe('A small test house');
    expect(parsed.blocksAdded).toBe(3);
    expect(parsed.totalBlocks).toBe(3);
    expect(parsed.engramId).toBeDefined();

    // Verify engram was added to spatial memory
    expect(mockGameState.spatialMemory.getEngramCount()).toBe(1);
  });

  it('should respect maxBlocks limit', async () => {
    const result = await tool.invoke({
      name: 'Limited Structure',
      description: 'Test maxBlocks',
      maxBlocks: 2,
      blocks: [
        { x: 0, y: 0, z: 0, blockType: 'stone' },
        { x: 1, y: 0, z: 0, blockType: 'stone' },
        { x: 2, y: 0, z: 0, blockType: 'stone' }, // Should be skipped
      ],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blocksAdded).toBe(2);
    expect(parsed.blocksSkipped).toBe(1);
    expect(parsed.totalBlocks).toBe(2);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('create_imagined_structure');
  });

  it('should handle empty blocks array', async () => {
    const result = await tool.invoke({
      name: 'Empty Structure',
      description: 'No blocks',
      blocks: [],
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blocksAdded).toBe(0);
    expect(parsed.totalBlocks).toBe(0);
  });
});
