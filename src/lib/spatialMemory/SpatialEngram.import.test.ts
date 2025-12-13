import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SpatialEngram } from './SpatialEngram.js';
import { Vec3 as Vec3Class } from 'vec3';
import createChunkColumn from 'prismarine-chunk';

describe('SpatialEngram Import/Export', () => {
  let registry: any;
  let mockChunk: any;

  beforeEach(() => {
    // Create a mock registry
    registry = {
      blocksByStateId: {
        1: { name: 'stone' },
        2: { name: 'dirt' },
        3: { name: 'grass' },
        4: { name: 'air' },
      },
    };

    // Create a mock ChunkColumn
    mockChunk = {
      getBlockStateId: vi.fn(),
      setBlockStateId: vi.fn(),
    };
  });

  describe('importFromChunk', () => {
    it('should import blocks from chunk region', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      // Mock chunk to return stone blocks in a region
      mockChunk.getBlockStateId.mockImplementation((pos: Vec3Class) => {
        const x = pos.x;
        const y = pos.y;
        const z = pos.z;
        // Return stone (stateId 1) for blocks in region 100-102, 64-66, 200-202
        if (x >= 100 && x <= 102 && y >= 64 && y <= 66 && z >= 200 && z <= 202) {
          return 1; // stone
        }
        return 4; // air
      });

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 102, y: 66, z: 202 },
      };

      engram.importFromChunk(mockChunk, 6, 12, bounds, registry);

      // Should have imported blocks (3x3x3 = 27 blocks, but only non-air)
      // Center is at (101, 65, 201)
      // Blocks should be at local coords relative to center
      expect(engram.getBlock(-1, -1, -1)).toBe('stone'); // world (100, 64, 200)
      expect(engram.getBlock(0, 0, 0)).toBe('stone'); // world (101, 65, 201) - center
      expect(engram.getBlock(1, 1, 1)).toBe('stone'); // world (102, 66, 202)
    });

    it('should center blocks at 0,0,0', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      mockChunk.getBlockStateId.mockReturnValue(1); // stone

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 100, y: 64, z: 200 }, // Single block
      };

      engram.importFromChunk(mockChunk, 6, 12, bounds, registry);

      // Center should be at (100, 64, 200), so block should be at local (0, 0, 0)
      expect(engram.getBlock(0, 0, 0)).toBe('stone');
    });

    it('should skip air blocks', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      mockChunk.getBlockStateId.mockImplementation((pos: Vec3Class) => {
        // Return air for some positions, stone for others
        if (pos.x === 100 && pos.y === 64 && pos.z === 200) {
          return 4; // air
        }
        return 1; // stone
      });

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 101, y: 64, z: 200 },
      };

      engram.importFromChunk(mockChunk, 6, 12, bounds, registry);

      // Should only have one block (the non-air one)
      expect(engram.getBlockCount()).toBe(1);
    });

    it('should stop at maxBlocks limit', () => {
      const engram = new SpatialEngram('Test', 'Description', 5); // Small limit

      mockChunk.getBlockStateId.mockReturnValue(1); // stone

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 110, y: 64, z: 200 }, // 11 blocks
      };

      engram.importFromChunk(mockChunk, 6, 12, bounds, registry);

      // Should stop at 5 blocks
      expect(engram.getBlockCount()).toBe(5);
    });

    it('should throw error if registry is missing', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      const bounds = {
        min: { x: 100, y: 64, z: 200 },
        max: { x: 102, y: 66, z: 202 },
      };

      expect(() => {
        engram.importFromChunk(mockChunk, 6, 12, bounds, null as any);
      }).toThrow('Registry is required for importFromChunk');
    });
  });

  describe('importFromSubchunk', () => {
    it('should import blocks from subchunk', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      // Subchunk at cy=4 means Y range 64-79
      const cx = 6;
      const cy = 4;
      const cz = 12;

      // World base: cx*16=96, cz*16=192
      // Center: (96+8, 72, 192+8) = (104, 72, 200)
      // Subchunk covers: x=96-111, y=64-79, z=192-207
      mockChunk.getBlockStateId.mockImplementation((pos: Vec3Class) => {
        // Always return stone for this test (we're testing the import mechanism)
        return 1; // stone
      });

      engram.importFromSubchunk(mockChunk, cx, cy, cz, registry);

      // Should have imported blocks from the 16x16x16 subchunk
      // Center is at (104, 72, 200)
      // Block at world (96, 64, 192) should be at local (-8, -8, -8)
      // But we'll hit maxBlocks limit (512) before importing all 4096 blocks
      // So we'll just check that some blocks were imported
      expect(engram.getBlockCount()).toBeGreaterThan(0);
      // Check that blocks are centered around 0,0,0
      const bounds = engram.getBounds();
      if (bounds) {
        const centerX = (bounds.min.x + bounds.max.x) / 2;
        const centerY = (bounds.min.y + bounds.max.y) / 2;
        const centerZ = (bounds.min.z + bounds.max.z) / 2;
        // Center should be near 0
        expect(Math.abs(centerX)).toBeLessThan(10);
        expect(Math.abs(centerY)).toBeLessThan(10);
        expect(Math.abs(centerZ)).toBeLessThan(10);
      }
    });

    it('should center subchunk at 0,0,0', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      mockChunk.getBlockStateId.mockReturnValue(1); // stone

      const cx = 0;
      const cy = 4; // Y range 64-79
      const cz = 0;

      engram.importFromSubchunk(mockChunk, cx, cy, cz, registry);

      // Center should be at (8, 72, 8) in world coords
      // So block at world (0, 64, 0) should be at local (-8, -8, -8)
      const bounds = engram.getBounds();
      expect(bounds).not.toBe(null);
      // Bounds should be roughly centered around 0,0,0 (allowing for rounding)
      if (bounds) {
        // Check that bounds span both negative and positive, or are close to 0
        const xSpan = bounds.max.x - bounds.min.x;
        const ySpan = bounds.max.y - bounds.min.y;
        const zSpan = bounds.max.z - bounds.min.z;
        // Should have reasonable span (subchunk is 16x16x16)
        expect(xSpan).toBeGreaterThan(0);
        expect(ySpan).toBeGreaterThan(0);
        expect(zSpan).toBeGreaterThan(0);
        // Center should be near 0 (within a few blocks due to rounding and maxBlocks limit)
        // Since we're importing up to maxBlocks (512), and subchunk has 4096 blocks,
        // we'll only import the first 512 blocks in iteration order, so center might be biased
        const centerX = (bounds.min.x + bounds.max.x) / 2;
        const centerY = (bounds.min.y + bounds.max.y) / 2;
        const centerZ = (bounds.min.z + bounds.max.z) / 2;
        // Allow more tolerance since we're not importing all blocks
        expect(Math.abs(centerX)).toBeLessThan(10);
        expect(Math.abs(centerY)).toBeLessThan(10);
        expect(Math.abs(centerZ)).toBeLessThan(10);
      }
    });

    it('should stop at maxBlocks limit', () => {
      const engram = new SpatialEngram('Test', 'Description', 10); // Small limit

      mockChunk.getBlockStateId.mockReturnValue(1); // stone

      engram.importFromSubchunk(mockChunk, 0, 4, 0, registry);

      // Should stop at 10 blocks (16x16x16 = 4096 possible, but limited to 10)
      expect(engram.getBlockCount()).toBe(10);
    });

    it('should throw error if registry is missing', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);

      expect(() => {
        engram.importFromSubchunk(mockChunk, 0, 4, 0, null as any);
      }).toThrow('Registry is required for importFromSubchunk');
    });
  });

  describe('exportToChunk', () => {
    it('should export blocks to chunk at world origin', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);
      engram.addBlock(0, 0, 0, 'stone');
      engram.addBlock(1, 0, 0, 'dirt');

      const worldOrigin = { x: 100, y: 64, z: 200 };

      // Mock registry to find state IDs
      registry.blocksByStateId[1].name = 'stone';
      registry.blocksByStateId[2].name = 'dirt';

      engram.exportToChunk(mockChunk, worldOrigin, registry);

      // Should have called setBlockStateId for each block
      expect(mockChunk.setBlockStateId).toHaveBeenCalledTimes(2);
      expect(mockChunk.setBlockStateId).toHaveBeenCalledWith(
        expect.objectContaining({ x: 100, y: 64, z: 200 }),
        1 // stone stateId
      );
      expect(mockChunk.setBlockStateId).toHaveBeenCalledWith(
        expect.objectContaining({ x: 101, y: 64, z: 200 }),
        2 // dirt stateId
      );
    });

    it('should convert local coords to world coords', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);
      engram.addBlock(-5, -10, -15, 'stone');
      engram.addBlock(5, 10, 15, 'dirt');

      const worldOrigin = { x: 100, y: 64, z: 200 };

      registry.blocksByStateId[1].name = 'stone';
      registry.blocksByStateId[2].name = 'dirt';

      engram.exportToChunk(mockChunk, worldOrigin, registry);

      expect(mockChunk.setBlockStateId).toHaveBeenCalledWith(
        expect.objectContaining({ x: 95, y: 54, z: 185 }), // 100-5, 64-10, 200-15
        1
      );
      expect(mockChunk.setBlockStateId).toHaveBeenCalledWith(
        expect.objectContaining({ x: 105, y: 74, z: 215 }), // 100+5, 64+10, 200+15
        2
      );
    });

    it('should warn if block type not found in registry', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);
      engram.addBlock(0, 0, 0, 'unknown_block');

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      engram.exportToChunk(mockChunk, { x: 100, y: 64, z: 200 }, registry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not find state ID for block type: unknown_block')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error if registry is missing', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);
      engram.addBlock(0, 0, 0, 'stone');

      expect(() => {
        engram.exportToChunk(mockChunk, { x: 100, y: 64, z: 200 }, null as any);
      }).toThrow('Registry is required for exportToChunk');
    });

    it('should handle chunks without setBlockStateId method', () => {
      const engram = new SpatialEngram('Test', 'Description', 512);
      engram.addBlock(0, 0, 0, 'stone');

      const chunkWithoutMethod = {
        getBlockStateId: vi.fn(),
        // No setBlockStateId method
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      registry.blocksByStateId[1].name = 'stone';

      engram.exportToChunk(chunkWithoutMethod as any, { x: 100, y: 64, z: 200 }, registry);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ChunkColumn.setBlockStateId not available')
      );

      consoleSpy.mockRestore();
    });
  });
});
