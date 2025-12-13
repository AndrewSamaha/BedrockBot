import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialMemory } from './SpatialMemory.js';
import { SpatialEngram } from './SpatialEngram.js';

describe('SpatialMemory', () => {
  let memory: SpatialMemory;
  let engram1: SpatialEngram;
  let engram2: SpatialEngram;

  beforeEach(() => {
    memory = new SpatialMemory();
    engram1 = new SpatialEngram('House', 'A small house', 512);
    engram2 = new SpatialEngram('Tower', 'A tall tower', 512);
    
    // Add some blocks to engrams
    engram1.addBlock(0, 0, 0, 'stone');
    engram1.addBlock(1, 0, 0, 'stone');
    engram2.addBlock(0, 0, 0, 'wood');
    engram2.addBlock(0, 1, 0, 'wood');
  });

  describe('addEngram', () => {
    it('should add an engram and return its ID', () => {
      const id = memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      expect(id).toBe(engram1.id);
      expect(memory.getEngramCount()).toBe(1);
    });

    it('should add multiple engrams', () => {
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
      expect(memory.getEngramCount()).toBe(2);
    });

    it('should store tags with engram', () => {
      const id = memory.addEngram(engram1, { x: 100, y: 64, z: 200 }, ['house', 'building']);
      const entry = memory.getEngram(id);
      expect(entry?.tags).toEqual(['house', 'building']);
    });
  });

  describe('removeEngram', () => {
    it('should remove an engram by ID', () => {
      const id = memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      expect(memory.getEngramCount()).toBe(1);
      
      const result = memory.removeEngram(id);
      expect(result).toBe(true);
      expect(memory.getEngramCount()).toBe(0);
    });

    it('should return false when engram not found', () => {
      const result = memory.removeEngram('non-existent-id');
      expect(result).toBe(false);
    });

    it('should remove correct engram when multiple exist', () => {
      const id1 = memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      const id2 = memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
      
      memory.removeEngram(id1);
      expect(memory.getEngram(id1)).toBe(null);
      expect(memory.getEngram(id2)).not.toBe(null);
    });
  });

  describe('getEngram', () => {
    it('should return engram entry by ID', () => {
      const id = memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      const entry = memory.getEngram(id);
      
      expect(entry).not.toBe(null);
      expect(entry?.engram.id).toBe(id);
      expect(entry?.engram.name).toBe('House');
      expect(entry?.worldPosition).toEqual({ x: 100, y: 64, z: 200 });
    });

    it('should return null when engram not found', () => {
      const entry = memory.getEngram('non-existent-id');
      expect(entry).toBe(null);
    });
  });

  describe('getAllEngrams', () => {
    it('should return empty array when no engrams', () => {
      expect(memory.getAllEngrams()).toEqual([]);
    });

    it('should return all engrams', () => {
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
      
      const engrams = memory.getAllEngrams();
      expect(engrams.length).toBe(2);
      expect(engrams[0].engram.name).toBe('House');
      expect(engrams[1].engram.name).toBe('Tower');
    });

    it('should return a copy to prevent mutation', () => {
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      const engrams = memory.getAllEngrams();
      engrams.push({} as any); // Try to mutate
      expect(memory.getEngramCount()).toBe(1); // Original unchanged
    });
  });

  describe('getBlocksInRegion', () => {
    beforeEach(() => {
      // Position engram1 at (100, 64, 200)
      // Blocks are at local (0,0,0) and (1,0,0)
      // So world blocks are at (100,64,200) and (101,64,200)
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      
      // Position engram2 at (200, 64, 300)
      // Blocks are at local (0,0,0) and (0,1,0)
      // So world blocks are at (200,64,300) and (200,65,300)
      memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
    });

    it('should return blocks in region', () => {
      const blocks = memory.getBlocksInRegion(
        { x: 99, y: 63, z: 199 },
        { x: 102, y: 65, z: 201 }
      );
      
      expect(blocks.length).toBe(2); // Both blocks from engram1
      expect(blocks).toContainEqual({
        x: 100,
        y: 64,
        z: 200,
        blockType: 'stone',
        engramId: engram1.id,
      });
      expect(blocks).toContainEqual({
        x: 101,
        y: 64,
        z: 200,
        blockType: 'stone',
        engramId: engram1.id,
      });
    });

    it('should return blocks from multiple engrams in region', () => {
      const blocks = memory.getBlocksInRegion(
        { x: 99, y: 63, z: 199 },
        { x: 201, y: 66, z: 301 }
      );
      
      expect(blocks.length).toBe(4); // All blocks from both engrams
    });

    it('should return empty array when no blocks in region', () => {
      const blocks = memory.getBlocksInRegion(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 10 }
      );
      
      expect(blocks).toEqual([]);
    });

    it('should handle partial region overlap', () => {
      const blocks = memory.getBlocksInRegion(
        { x: 100, y: 64, z: 200 },
        { x: 100, y: 64, z: 200 }
      );
      
      expect(blocks.length).toBe(1); // Only one block exactly at this position
      expect(blocks[0].x).toBe(100);
      expect(blocks[0].y).toBe(64);
      expect(blocks[0].z).toBe(200);
    });
  });

  describe('getEngramsInRegion', () => {
    beforeEach(() => {
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
    });

    it('should return engram IDs with blocks in region', () => {
      const ids = memory.getEngramsInRegion(
        { x: 99, y: 63, z: 199 },
        { x: 102, y: 65, z: 201 }
      );
      
      expect(ids.length).toBe(1);
      expect(ids).toContain(engram1.id);
    });

    it('should return multiple engram IDs when multiple engrams in region', () => {
      const ids = memory.getEngramsInRegion(
        { x: 99, y: 63, z: 199 },
        { x: 201, y: 66, z: 301 }
      );
      
      expect(ids.length).toBe(2);
      expect(ids).toContain(engram1.id);
      expect(ids).toContain(engram2.id);
    });

    it('should return empty array when no engrams in region', () => {
      const ids = memory.getEngramsInRegion(
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 10, z: 10 }
      );
      
      expect(ids).toEqual([]);
    });

    it('should return each engram ID only once', () => {
      // Add more blocks to engram1 in the region
      engram1.addBlock(2, 0, 0, 'stone');
      
      const ids = memory.getEngramsInRegion(
        { x: 99, y: 63, z: 199 },
        { x: 103, y: 65, z: 201 }
      );
      
      // Should only appear once even though it has multiple blocks
      expect(ids.filter((id) => id === engram1.id).length).toBe(1);
    });
  });

  describe('clearWorkingMemory', () => {
    it('should remove all engrams', () => {
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
      expect(memory.getEngramCount()).toBe(2);
      
      memory.clearWorkingMemory();
      expect(memory.getEngramCount()).toBe(0);
    });

    it('should work when memory is already empty', () => {
      memory.clearWorkingMemory();
      expect(memory.getEngramCount()).toBe(0);
    });
  });

  describe('getEngramCount', () => {
    it('should return 0 for empty memory', () => {
      expect(memory.getEngramCount()).toBe(0);
    });

    it('should return correct count', () => {
      memory.addEngram(engram1, { x: 100, y: 64, z: 200 });
      expect(memory.getEngramCount()).toBe(1);
      
      memory.addEngram(engram2, { x: 200, y: 64, z: 300 });
      expect(memory.getEngramCount()).toBe(2);
    });
  });

  describe('coordinate transformation', () => {
    it('should correctly transform local to world coordinates', () => {
      // Engram has block at local (5, 10, 15)
      const testEngram = new SpatialEngram('Test', 'Description');
      testEngram.addBlock(5, 10, 15, 'stone');
      
      // Position engram at world (100, 64, 200)
      memory.addEngram(testEngram, { x: 100, y: 64, z: 200 });
      
      // Block should appear at world (105, 74, 215)
      const blocks = memory.getBlocksInRegion(
        { x: 105, y: 74, z: 215 },
        { x: 105, y: 74, z: 215 }
      );
      
      expect(blocks.length).toBe(1);
      expect(blocks[0]).toEqual({
        x: 105,
        y: 74,
        z: 215,
        blockType: 'stone',
        engramId: testEngram.id,
      });
    });
  });
});
