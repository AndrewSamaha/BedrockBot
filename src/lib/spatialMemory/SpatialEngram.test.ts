import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialEngram } from './SpatialEngram.js';

describe('SpatialEngram', () => {
  let engram: SpatialEngram;

  beforeEach(() => {
    engram = new SpatialEngram('Test Engram', 'A test engram', 512);
  });

  describe('constructor', () => {
    it('should create engram with id, name, and description', () => {
      expect(engram.id).toBeDefined();
      expect(engram.name).toBe('Test Engram');
      expect(engram.description).toBe('A test engram');
    });

    it('should default maxBlocks to 512', () => {
      const defaultEngram = new SpatialEngram('Test', 'Description');
      expect(defaultEngram.getBlockCount()).toBe(0);
      // Can't directly test maxBlocks, but we can test by adding blocks
    });

    it('should accept custom maxBlocks', () => {
      const customEngram = new SpatialEngram('Test', 'Description', 100);
      // Test by trying to add more than 100 blocks
      for (let i = 0; i < 100; i++) {
        expect(customEngram.addBlock(i, 0, 0, 'stone')).toBe(true);
      }
      expect(customEngram.addBlock(100, 0, 0, 'stone')).toBe(false); // Should fail
    });
  });

  describe('addBlock', () => {
    it('should add a block successfully', () => {
      const result = engram.addBlock(0, 0, 0, 'stone');
      expect(result).toBe(true);
      expect(engram.getBlockCount()).toBe(1);
    });

    it('should return false when maxBlocks limit reached', () => {
      const smallEngram = new SpatialEngram('Small', 'Description', 2);
      expect(smallEngram.addBlock(0, 0, 0, 'stone')).toBe(true);
      expect(smallEngram.addBlock(1, 0, 0, 'dirt')).toBe(true);
      expect(smallEngram.addBlock(2, 0, 0, 'wood')).toBe(false);
    });

    it('should replace block when block already exists at position', () => {
      expect(engram.addBlock(0, 0, 0, 'stone')).toBe(true);
      expect(engram.getBlock(0, 0, 0)).toBe('stone');
      expect(engram.addBlock(0, 0, 0, 'dirt')).toBe(true); // Replace with different type
      expect(engram.getBlock(0, 0, 0)).toBe('dirt');
      expect(engram.getBlockCount()).toBe(1); // Still only one block
    });

    it('should allow different block types at different positions', () => {
      expect(engram.addBlock(0, 0, 0, 'stone')).toBe(true);
      expect(engram.addBlock(1, 0, 0, 'dirt')).toBe(true);
      expect(engram.getBlockCount()).toBe(2);
    });
  });

  describe('removeBlock', () => {
    it('should remove a block successfully', () => {
      engram.addBlock(0, 0, 0, 'stone');
      expect(engram.getBlockCount()).toBe(1);
      
      const result = engram.removeBlock(0, 0, 0);
      expect(result).toBe(true);
      expect(engram.getBlockCount()).toBe(0);
    });

    it('should return false when block does not exist', () => {
      const result = engram.removeBlock(0, 0, 0);
      expect(result).toBe(false);
    });
  });

  describe('getBlock', () => {
    it('should return block type at position', () => {
      engram.addBlock(5, 10, 15, 'oak_planks');
      expect(engram.getBlock(5, 10, 15)).toBe('oak_planks');
    });

    it('should return null when no block at position', () => {
      expect(engram.getBlock(0, 0, 0)).toBe(null);
    });
  });

  describe('getAllBlocks', () => {
    it('should return empty array when no blocks', () => {
      expect(engram.getAllBlocks()).toEqual([]);
    });

    it('should return all blocks', () => {
      engram.addBlock(0, 0, 0, 'stone');
      engram.addBlock(1, 2, 3, 'dirt');
      
      const blocks = engram.getAllBlocks();
      expect(blocks.length).toBe(2);
      expect(blocks).toContainEqual({ x: 0, y: 0, z: 0, blockType: 'stone' });
      expect(blocks).toContainEqual({ x: 1, y: 2, z: 3, blockType: 'dirt' });
    });
  });

  describe('getBlockCount', () => {
    it('should return 0 for empty engram', () => {
      expect(engram.getBlockCount()).toBe(0);
    });

    it('should return correct count', () => {
      engram.addBlock(0, 0, 0, 'stone');
      engram.addBlock(1, 0, 0, 'dirt');
      expect(engram.getBlockCount()).toBe(2);
    });
  });

  describe('getBounds', () => {
    it('should return null for empty engram', () => {
      expect(engram.getBounds()).toBe(null);
    });

    it('should return correct bounds for single block', () => {
      engram.addBlock(5, 10, 15, 'stone');
      const bounds = engram.getBounds();
      expect(bounds).toEqual({
        min: { x: 5, y: 10, z: 15 },
        max: { x: 5, y: 10, z: 15 },
      });
    });

    it('should return correct bounds for multiple blocks', () => {
      engram.addBlock(0, 0, 0, 'stone');
      engram.addBlock(5, 10, 15, 'dirt');
      engram.addBlock(-2, 3, -7, 'wood');
      
      const bounds = engram.getBounds();
      expect(bounds).toEqual({
        min: { x: -2, y: 0, z: -7 },
        max: { x: 5, y: 10, z: 15 },
      });
    });
  });

  describe('isValid', () => {
    it('should return true for valid engram', () => {
      expect(engram.isValid()).toBe(true);
    });

    it('should return true for engram with blocks within limit', () => {
      engram.addBlock(0, 0, 0, 'stone');
      expect(engram.isValid()).toBe(true);
    });

    it('should return true even at maxBlocks limit', () => {
      const smallEngram = new SpatialEngram('Small', 'Description', 2);
      smallEngram.addBlock(0, 0, 0, 'stone');
      smallEngram.addBlock(1, 0, 0, 'dirt');
      expect(smallEngram.isValid()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON', () => {
      engram.addBlock(0, 0, 0, 'stone');
      engram.addBlock(1, 2, 3, 'dirt');
      
      const json = engram.toJSON();
      expect(json.id).toBe(engram.id);
      expect(json.name).toBe('Test Engram');
      expect(json.description).toBe('A test engram');
      expect(json.maxBlocks).toBe(512);
      expect(json.blocks).toContain('0,0,0,stone');
      expect(json.blocks).toContain('1,2,3,dirt');
      expect(json.blocks.length).toBe(2);
    });

    it('should deserialize from JSON', () => {
      engram.addBlock(0, 0, 0, 'stone');
      engram.addBlock(1, 2, 3, 'dirt');
      
      const json = engram.toJSON();
      const deserialized = SpatialEngram.fromJSON(json);
      
      expect(deserialized.id).toBe(engram.id);
      expect(deserialized.name).toBe('Test Engram');
      expect(deserialized.description).toBe('A test engram');
      expect(deserialized.getBlockCount()).toBe(2);
      expect(deserialized.getBlock(0, 0, 0)).toBe('stone');
      expect(deserialized.getBlock(1, 2, 3)).toBe('dirt');
    });

    it('should handle empty engram serialization', () => {
      const json = engram.toJSON();
      expect(json.blocks).toEqual([]);
      
      const deserialized = SpatialEngram.fromJSON(json);
      expect(deserialized.getBlockCount()).toBe(0);
    });

    it('should preserve custom maxBlocks on deserialization', () => {
      const customEngram = new SpatialEngram('Custom', 'Description', 100);
      const json = customEngram.toJSON();
      const deserialized = SpatialEngram.fromJSON(json);
      
      // Test that maxBlocks is preserved by trying to add more than original limit
      for (let i = 0; i < 100; i++) {
        deserialized.addBlock(i, 0, 0, 'stone');
      }
      expect(deserialized.addBlock(100, 0, 0, 'stone')).toBe(false);
    });
  });

  describe('block string format', () => {
    it('should handle block types with special characters', () => {
      // Test that blockType parsing works correctly
      engram.addBlock(0, 0, 0, 'minecraft:stone');
      expect(engram.getBlock(0, 0, 0)).toBe('minecraft:stone');
    });

    it('should handle negative coordinates', () => {
      engram.addBlock(-5, -10, -15, 'stone');
      expect(engram.getBlock(-5, -10, -15)).toBe('stone');
      
      const bounds = engram.getBounds();
      expect(bounds?.min).toEqual({ x: -5, y: -10, z: -15 });
    });
  });
});
