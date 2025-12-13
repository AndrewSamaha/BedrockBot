import { randomUUID } from 'crypto';
import type { Vec3 } from '../types.js';

export type BlockData = {
  x: number;
  y: number;
  z: number;
  blockType: string;
};

export type SpatialEngramJSON = {
  id: string;
  name: string;
  description: string;
  maxBlocks: number;
  blocks: string[]; // Array of "${x},${y},${z},${blockType}" strings
};

/**
 * SpatialEngram represents a small collection of non-air blocks stored using local coordinates
 * centered at (0, 0, 0). Each engram is a self-contained structure.
 */
export class SpatialEngram {
  readonly id: string;
  name: string;
  description: string;
  private readonly maxBlocks: number;
  private readonly blocks: Set<string>; // "${x},${y},${z},${blockType}"

  /**
   * Create a new SpatialEngram
   * @param name - Name of the engram
   * @param description - Description of the engram
   * @param maxBlocks - Maximum number of blocks (defaults to 512)
   */
  constructor(name: string, description: string, maxBlocks: number = 512) {
    this.id = randomUUID();
    this.name = name;
    this.description = description;
    this.maxBlocks = maxBlocks;
    this.blocks = new Set<string>();
  }

  /**
   * Get the bounds of all blocks in local coordinates
   */
  getBounds(): { min: Vec3; max: Vec3 } | null {
    if (this.blocks.size === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

    for (const blockStr of this.blocks) {
      const [x, y, z] = this.parseBlockString(blockStr);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  /**
   * Add a block to the engram
   * @returns true if added, false if maxBlocks limit reached
   * Note: If a block already exists at this position, it will be replaced
   */
  addBlock(x: number, y: number, z: number, blockType: string): boolean {
    // Check if we're at maxBlocks limit (but allow replacement if position already has a block)
    const hasBlockAtPosition = this.getBlock(x, y, z) !== null;
    if (!hasBlockAtPosition && this.blocks.size >= this.maxBlocks) {
      return false;
    }

    // Remove existing block at this position if it exists
    this.removeBlock(x, y, z);

    // Add the new block
    const blockStr = this.createBlockString(x, y, z, blockType);
    this.blocks.add(blockStr);
    return true;
  }

  /**
   * Remove a block from the engram
   * @returns true if removed, false if block didn't exist
   */
  removeBlock(x: number, y: number, z: number): boolean {
    // Try to find and remove any block at this position (regardless of blockType)
    for (const blockStr of this.blocks) {
      const [bx, by, bz] = this.parseBlockString(blockStr);
      if (bx === x && by === y && bz === z) {
        this.blocks.delete(blockStr);
        return true;
      }
    }
    return false;
  }

  /**
   * Get block type at a specific position
   * @returns blockType string or null if no block at position
   */
  getBlock(x: number, y: number, z: number): string | null {
    for (const blockStr of this.blocks) {
      const [bx, by, bz, blockType] = this.parseBlockString(blockStr);
      if (bx === x && by === y && bz === z) {
        return blockType;
      }
    }
    return null;
  }

  /**
   * Get all blocks as an array
   */
  getAllBlocks(): BlockData[] {
    const result: BlockData[] = [];
    for (const blockStr of this.blocks) {
      const [x, y, z, blockType] = this.parseBlockString(blockStr);
      result.push({ x, y, z, blockType });
    }
    return result;
  }

  /**
   * Get the number of blocks in the engram
   */
  getBlockCount(): number {
    return this.blocks.size;
  }

  /**
   * Check if the engram is valid
   */
  isValid(): boolean {
    return this.blocks.size <= this.maxBlocks && this.blocks.size >= 0;
  }

  /**
   * Serialize engram to JSON
   */
  toJSON(): SpatialEngramJSON {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      maxBlocks: this.maxBlocks,
      blocks: Array.from(this.blocks),
    };
  }

  /**
   * Deserialize engram from JSON
   */
  static fromJSON(json: SpatialEngramJSON): SpatialEngram {
    const engram = new SpatialEngram(json.name, json.description, json.maxBlocks);
    // Override the generated ID with the one from JSON
    (engram as any).id = json.id;
    
    // Add all blocks
    for (const blockStr of json.blocks) {
      engram.blocks.add(blockStr);
    }

    return engram;
  }

  /**
   * Create block string from coordinates and block type
   */
  private createBlockString(x: number, y: number, z: number, blockType: string): string {
    return `${x},${y},${z},${blockType}`;
  }

  /**
   * Parse block string into coordinates and block type
   */
  private parseBlockString(blockStr: string): [number, number, number, string] {
    const parts = blockStr.split(',');
    if (parts.length < 4) {
      throw new Error(`Invalid block string format: ${blockStr}`);
    }
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);
    const z = parseInt(parts[2], 10);
    const blockType = parts.slice(3).join(','); // Handle blockType that might contain commas
    return [x, y, z, blockType];
  }
}
