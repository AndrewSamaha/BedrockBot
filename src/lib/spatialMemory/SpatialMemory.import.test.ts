import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpatialMemory } from './SpatialMemory.js';
import { Vec3 as Vec3Class } from 'vec3';
import type { GameState } from '../GameState.js';

describe('SpatialMemory Import', () => {
  let memory: SpatialMemory;
  let mockGameState: any;
  let mockWorld: any;
  let mockChunk1: any;
  let mockChunk2: any;
  let registry: any;

  beforeEach(() => {
    memory = new SpatialMemory();

    // Create mock registry
    registry = {
      blocksByStateId: {
        1: { name: 'stone' },
        2: { name: 'dirt' },
        3: { name: 'grass' },
        4: { name: 'air' },
      },
    };

    // Create mock chunks
    mockChunk1 = {
      getBlockStateId: vi.fn(),
    };
    mockChunk2 = {
      getBlockStateId: vi.fn(),
    };

    // Create mock world
    mockWorld = {
      getChunk: vi.fn(),
    };

    // Create mock GameState
    mockGameState = {
      world: mockWorld,
      registry: registry,
    };
  });

  describe('importFromGameWorld', () => {
    it('should import region from game world and create engram', () => {
      // Mock chunk to return stone blocks
      mockChunk1.getBlockStateId.mockReturnValue(1); // stone
      mockWorld.getChunk.mockImplementation((cx: number, cz: number) => {
        if (cx === 6 && cz === 12) {
          return mockChunk1;
        }
        return null;
      });

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 102, y: 66, z: 202 },
      };

      const engramId = memory.importFromGameWorld(
        bounds,
        'Test Building',
        'A test building',
        mockGameState as GameState
      );

      expect(engramId).toBeDefined();
      expect(memory.getEngramCount()).toBe(1);

      const entry = memory.getEngram(engramId);
      expect(entry).not.toBe(null);
      expect(entry?.engram.name).toBe('Test Building');
      expect(entry?.engram.description).toBe('A test building');
      expect(entry?.worldPosition).toEqual({ x: 101, y: 65, z: 201 }); // Center of bounds
    });

    it('should handle multiple chunks', () => {
      // Region spans two chunks
      mockChunk1.getBlockStateId.mockReturnValue(1); // stone
      mockChunk2.getBlockStateId.mockReturnValue(2); // dirt
      mockWorld.getChunk.mockImplementation((cx: number, cz: number) => {
        if (cx === 6 && cz === 12) {
          return mockChunk1;
        }
        if (cx === 7 && cz === 12) {
          return mockChunk2;
        }
        return null;
      });

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 120, y: 66, z: 202 }, // Spans chunks 6 and 7
      };

      const engramId = memory.importFromGameWorld(
        bounds,
        'Multi-Chunk Building',
        'Spans multiple chunks',
        mockGameState as GameState
      );

      expect(engramId).toBeDefined();
      const entry = memory.getEngram(engramId);
      expect(entry).not.toBe(null);
      expect(entry?.engram.getBlockCount()).toBeGreaterThan(0);
    });

    it('should skip unloaded chunks', () => {
      mockWorld.getChunk.mockReturnValue(null); // No chunks loaded

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 102, y: 66, z: 202 },
      };

      const engramId = memory.importFromGameWorld(
        bounds,
        'Empty Region',
        'No chunks loaded',
        mockGameState as GameState
      );

      expect(engramId).toBeDefined();
      const entry = memory.getEngram(engramId);
      expect(entry?.engram.getBlockCount()).toBe(0); // No blocks imported
    });

    it('should center engram at bounds center', () => {
      mockChunk1.getBlockStateId.mockReturnValue(1); // stone
      mockWorld.getChunk.mockReturnValue(mockChunk1);

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 110, y: 70, z: 210 },
      };

      const engramId = memory.importFromGameWorld(
        bounds,
        'Centered',
        'Test centering',
        mockGameState as GameState
      );

      const entry = memory.getEngram(engramId);
      // Center should be (105, 67, 205)
      expect(entry?.worldPosition).toEqual({ x: 105, y: 67, z: 205 });

      // Blocks should be centered around 0,0,0 in local coords
      const bounds_local = entry?.engram.getBounds();
      if (bounds_local) {
        // Calculate center of bounds
        const centerX = (bounds_local.min.x + bounds_local.max.x) / 2;
        const centerY = (bounds_local.min.y + bounds_local.max.y) / 2;
        const centerZ = (bounds_local.min.z + bounds_local.max.z) / 2;
        // Center should be near 0 (within a few blocks due to rounding)
        expect(Math.abs(centerX)).toBeLessThan(5);
        expect(Math.abs(centerY)).toBeLessThan(5);
        expect(Math.abs(centerZ)).toBeLessThan(5);
      }
    });

    it('should respect maxBlocks limit', () => {
      // Create engram with small limit via import
      // We can't directly set maxBlocks, but we can test that it stops
      mockChunk1.getBlockStateId.mockReturnValue(1); // stone
      mockWorld.getChunk.mockReturnValue(mockChunk1);

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 120, y: 80, z: 220 }, // Large region
      };

      const engramId = memory.importFromGameWorld(
        bounds,
        'Limited',
        'Test limit',
        mockGameState as GameState
      );

      const entry = memory.getEngram(engramId);
      // Should have imported blocks, but limited by maxBlocks (default 512)
      expect(entry?.engram.getBlockCount()).toBeLessThanOrEqual(512);
    });

    it('should throw error if registry not initialized', () => {
      mockGameState.registry = undefined;

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 102, y: 66, z: 202 },
      };

      expect(() => {
        memory.importFromGameWorld(
          bounds,
          'Test',
          'Description',
          mockGameState as GameState
        );
      }).toThrow('Registry not initialized in GameState');
    });

    it('should calculate correct chunk coordinates', () => {
      mockChunk1.getBlockStateId.mockReturnValue(1); // stone
      mockWorld.getChunk.mockImplementation((cx: number, cz: number) => {
        // Should be called with correct chunk coords
        if (cx === 6 && cz === 12) {
          return mockChunk1;
        }
        return null;
      });

      const bounds = {
        min: { x: 100, y: 64, z: 200 }, // chunk (6, 12)
        max: { x: 102, y: 66, z: 202 }, // chunk (6, 12)
      };

      memory.importFromGameWorld(
        bounds,
        'Test',
        'Description',
        mockGameState as GameState
      );

      // Should have called getChunk with correct coordinates
      expect(mockWorld.getChunk).toHaveBeenCalledWith(6, 12);
    });

    it('should handle negative coordinates', () => {
      mockChunk1.getBlockStateId.mockReturnValue(1); // stone
      mockWorld.getChunk.mockImplementation((cx: number, cz: number) => {
        if (cx === -1 && cz === -2) {
          return mockChunk1;
        }
        return null;
      });

      const bounds = {
        min: { x: -10, y: 64, z: -20 }, // chunk (-1, -2)
        max: { x: -5, y: 66, z: -15 }, // chunk (-1, -2)
      };

      const engramId = memory.importFromGameWorld(
        bounds,
        'Negative Coords',
        'Test negative',
        mockGameState as GameState
      );

      expect(engramId).toBeDefined();
      expect(mockWorld.getChunk).toHaveBeenCalledWith(-1, -2);
    });
  });
});
