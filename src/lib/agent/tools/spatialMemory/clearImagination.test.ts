import { describe, it, expect, beforeEach } from 'vitest';
import { createClearImaginationTool } from './clearImagination.js';
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

describe('createClearImaginationTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createClearImaginationTool>;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createClearImaginationTool(mockGameState as any);
  });

  it('should clear all engrams', async () => {
    // Add some engrams
    const engram1 = new SpatialEngram('House', 'A house');
    const engram2 = new SpatialEngram('Tower', 'A tower');
    mockGameState.spatialMemory.addEngram(engram1, { x: 100, y: 64, z: 200 });
    mockGameState.spatialMemory.addEngram(engram2, { x: 200, y: 64, z: 300 });

    expect(mockGameState.spatialMemory.getEngramCount()).toBe(2);

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.engramsCleared).toBe(2);
    expect(mockGameState.spatialMemory.getEngramCount()).toBe(0);
  });

  it('should handle empty memory', async () => {
    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.engramsCleared).toBe(0);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('clear_imagination');
  });
});
