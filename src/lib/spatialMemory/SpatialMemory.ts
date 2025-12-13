import type { Vec3 } from '../types.js';
import { SpatialEngram, type SpatialEngramJSON } from './SpatialEngram.js';

export type EngramEntry = {
  engram: SpatialEngram;
  worldPosition: Vec3; // Where engram's (0,0,0) maps to in world
  createdAt: number;
  tags?: string[];
};

export type BlockWithEngramId = {
  x: number;
  y: number;
  z: number;
  blockType: string;
  engramId: string;
};

/**
 * SpatialMemory manages multiple SpatialEngrams, each positioned at specific world coordinates.
 * This allows the bot to imagine multiple structures simultaneously and compose them.
 */
export class SpatialMemory {
  private engrams: EngramEntry[] = [];

  /**
   * Add an engram to spatial memory
   * @param engram - The SpatialEngram to add
   * @param worldPosition - World coordinates where engram's (0,0,0) maps to
   * @param tags - Optional tags for categorization
   * @returns The engram ID
   */
  addEngram(engram: SpatialEngram, worldPosition: Vec3, tags?: string[]): string {
    const entry: EngramEntry = {
      engram,
      worldPosition,
      createdAt: Date.now(),
      tags,
    };
    this.engrams.push(entry);
    return engram.id;
  }

  /**
   * Remove an engram from spatial memory
   * @param id - The engram ID to remove
   * @returns true if removed, false if not found
   */
  removeEngram(id: string): boolean {
    const index = this.engrams.findIndex((entry) => entry.engram.id === id);
    if (index === -1) {
      return false;
    }
    this.engrams.splice(index, 1);
    return true;
  }

  /**
   * Get an engram by ID
   * @param id - The engram ID
   * @returns The engram entry or null if not found
   */
  getEngram(id: string): EngramEntry | null {
    const entry = this.engrams.find((e) => e.engram.id === id);
    return entry || null;
  }

  /**
   * Get all engrams
   */
  getAllEngrams(): EngramEntry[] {
    return [...this.engrams]; // Return copy to prevent external mutation
  }

  /**
   * Get all blocks in a world region, with their engram IDs
   * @param min - Minimum world coordinates
   * @param max - Maximum world coordinates
   */
  getBlocksInRegion(min: Vec3, max: Vec3): BlockWithEngramId[] {
    const result: BlockWithEngramId[] = [];

    for (const entry of this.engrams) {
      const blocks = entry.engram.getAllBlocks();
      const worldPos = entry.worldPosition;

      for (const block of blocks) {
        // Convert local coords to world coords
        const worldX = worldPos.x + block.x;
        const worldY = worldPos.y + block.y;
        const worldZ = worldPos.z + block.z;

        // Check if block is in region
        if (
          worldX >= min.x &&
          worldX <= max.x &&
          worldY >= min.y &&
          worldY <= max.y &&
          worldZ >= min.z &&
          worldZ <= max.z
        ) {
          result.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            blockType: block.blockType,
            engramId: entry.engram.id,
          });
        }
      }
    }

    return result;
  }

  /**
   * Get engram IDs that have blocks in a world region
   * @param min - Minimum world coordinates
   * @param max - Maximum world coordinates
   */
  getEngramsInRegion(min: Vec3, max: Vec3): string[] {
    const engramIds = new Set<string>();

    for (const entry of this.engrams) {
      const blocks = entry.engram.getAllBlocks();
      const worldPos = entry.worldPosition;

      for (const block of blocks) {
        // Convert local coords to world coords
        const worldX = worldPos.x + block.x;
        const worldY = worldPos.y + block.y;
        const worldZ = worldPos.z + block.z;

        // Check if block is in region
        if (
          worldX >= min.x &&
          worldX <= max.x &&
          worldY >= min.y &&
          worldY <= max.y &&
          worldZ >= min.z &&
          worldZ <= max.z
        ) {
          engramIds.add(entry.engram.id);
          break; // Found at least one block in region, no need to check more
        }
      }
    }

    return Array.from(engramIds);
  }

  /**
   * Clear all engrams (working memory)
   */
  clearWorkingMemory(): void {
    this.engrams = [];
  }

  /**
   * Get the number of engrams
   */
  getEngramCount(): number {
    return this.engrams.length;
  }
}
