import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createImportFromGameWorldTool } from './importFromGameWorld.js';
import { EventEmitter } from 'events';
import { SpatialMemory } from '../../../spatialMemory/index.js';
import type { GameState } from '../../../GameState.js';

class MockGameState extends EventEmitter {
  spatialMemory: SpatialMemory;
  registry: any;
  world: any;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
    this.registry = {
      blocksByStateId: {
        1: { name: 'stone' },
        2: { name: 'dirt' },
        4: { name: 'air' },
      },
    };
    this.world = {
      getChunk: vi.fn(),
    };
  }
}

describe('createImportFromGameWorldTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createImportFromGameWorldTool>;
  let mockChunk: any;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createImportFromGameWorldTool(mockGameState as any);

    // Create mock chunk
    mockChunk = {
      getBlockStateId: vi.fn(),
    };
  });

  it('should import region from game world', async () => {
    // Mock chunk to return stone blocks
    mockChunk.getBlockStateId.mockReturnValue(1); // stone
    mockGameState.world.getChunk.mockReturnValue(mockChunk);

    const result = await tool.invoke({
      name: 'Imported Building',
      description: 'A building from the game world',
      minX: 100,
      minY: 64,
      minZ: 200,
      maxX: 102,
      maxY: 66,
      maxZ: 202,
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.name).toBe('Imported Building');
    expect(parsed.description).toBe('A building from the game world');
    expect(parsed.engramId).toBeDefined();
    expect(parsed.blockCount).toBeGreaterThan(0);
    expect(parsed.worldPosition).toBeDefined();

    // Verify engram was added
    expect(mockGameState.spatialMemory.getEngramCount()).toBe(1);
  });

  it('should return error if registry not initialized', async () => {
    mockGameState.registry = undefined;

    const result = await tool.invoke({
      name: 'Test',
      description: 'Test',
      minX: 100,
      minY: 64,
      minZ: 200,
      maxX: 102,
      maxY: 66,
      maxZ: 202,
    });

    const parsed = JSON.parse(result);
    expect(parsed.error).toContain('Registry not initialized');
  });

  it('should handle unloaded chunks', async () => {
    mockGameState.world.getChunk.mockReturnValue(null); // No chunks loaded

    const result = await tool.invoke({
      name: 'Empty Region',
      description: 'No chunks',
      minX: 100,
      minY: 64,
      minZ: 200,
      maxX: 102,
      maxY: 66,
      maxZ: 202,
    });

    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.blockCount).toBe(0); // No blocks imported
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('import_from_game_world');
  });
});
