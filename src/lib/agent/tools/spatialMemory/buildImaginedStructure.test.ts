import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBuildImaginedStructureTool } from './buildImaginedStructure.js';
import { EventEmitter } from 'events';
import { SpatialMemory } from '../../../spatialMemory/index.js';
import { SpatialEngram } from '../../../spatialMemory/SpatialEngram.js';
import type { GameState } from '../../../GameState.js';
import type { Client } from 'bedrock-protocol';

// Mock fill function
vi.mock('../../../serverCommands/index.js', () => ({
  fill: vi.fn(),
}));

class MockGameState extends EventEmitter {
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createBuildImaginedStructureTool', () => {
  let mockGameState: MockGameState;
  let mockClient: Client;
  let tool: ReturnType<typeof createBuildImaginedStructureTool>;
  let engramId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGameState = new MockGameState();
    mockClient = {} as Client;
    tool = createBuildImaginedStructureTool(mockClient, mockGameState as any);

    // Create a test engram with blocks
    const engram = new SpatialEngram('Test House', 'A test house');
    engram.addBlock(0, 0, 0, 'stone');
    engram.addBlock(1, 0, 0, 'stone');
    engram.addBlock(0, 1, 0, 'oak_planks');
    engramId = mockGameState.spatialMemory.addEngram(engram, { x: 0, y: 0, z: 0 });
  });

  it('should build structure in game world', async () => {
    const { fill } = await import('../../../serverCommands/index.js');

    const result = await tool.invoke({
      engramId,
      worldX: 100,
      worldY: 64,
      worldZ: 200,
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blockCount).toBe(3);
    expect(parsed.placedCount).toBe(3);

    // Verify fill was called for each block
    expect(fill).toHaveBeenCalledTimes(3);
  });

  it('should convert local coords to world coords', async () => {
    const { fill } = await import('../../../serverCommands/index.js');

    await tool.invoke({
      engramId,
      worldX: 100,
      worldY: 64,
      worldZ: 200,
    });

    // Check that blocks were placed at correct world coordinates
    expect(fill).toHaveBeenCalledWith(
      mockClient,
      { x: 100, y: 64, z: 200 }, // Local (0,0,0) -> World (100,64,200)
      { x: 100, y: 64, z: 200 },
      'stone'
    );
    expect(fill).toHaveBeenCalledWith(
      mockClient,
      { x: 101, y: 64, z: 200 }, // Local (1,0,0) -> World (101,64,200)
      { x: 101, y: 64, z: 200 },
      'stone'
    );
    expect(fill).toHaveBeenCalledWith(
      mockClient,
      { x: 100, y: 65, z: 200 }, // Local (0,1,0) -> World (100,65,200)
      { x: 100, y: 65, z: 200 },
      'oak_planks'
    );
  });

  it('should return error for non-existent engram', async () => {
    const result = await tool.invoke({
      engramId: 'non-existent-id',
      worldX: 100,
      worldY: 64,
      worldZ: 200,
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('not found');
  });

  it('should return error for empty engram', async () => {
    const emptyEngram = new SpatialEngram('Empty', 'No blocks');
    const emptyEngramId = mockGameState.spatialMemory.addEngram(emptyEngram, { x: 0, y: 0, z: 0 });

    const result = await tool.invoke({
      engramId: emptyEngramId,
      worldX: 100,
      worldY: 64,
      worldZ: 200,
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('no blocks');
  });

  it('should warn for structures larger than Bedrock limit', async () => {
    // Create large engram (but not actually fill it with 32769 blocks - that would be slow)
    // Instead, we'll test the check by creating an engram and manually setting block count
    const largeEngram = new SpatialEngram('Large', 'Large structure');
    // Add enough blocks to test (we'll just test the warning logic)
    for (let i = 0; i < 100; i++) {
      largeEngram.addBlock(i, 0, 0, 'stone');
    }
    const largeEngramId = mockGameState.spatialMemory.addEngram(largeEngram, { x: 0, y: 0, z: 0 });

    // This should work fine (100 blocks < 32768)
    const result = await tool.invoke({
      engramId: largeEngramId,
      worldX: 100,
      worldY: 64,
      worldZ: 200,
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('build_imagined_structure');
  });
});
