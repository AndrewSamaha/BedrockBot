import { randomUUID } from 'crypto';
import { Vec3 as Vec3Class } from 'vec3';
import type { Vec3 } from '../types.js';
import type { ChunkColumn } from 'prismarine-chunk';

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

  /**
   * Import blocks from a chunk region
   * @param chunk - The ChunkColumn to import from
   * @param cx - Chunk X coordinate
   * @param cz - Chunk Z coordinate
   * @param bounds - Bounding box in world coordinates
   * @param registry - Registry for block name lookup
   */
  importFromChunk(
    chunk: ChunkColumn,
    cx: number,
    cz: number,
    bounds: { min: Vec3; max: Vec3 },
    registry: any
  ): void {
    if (!registry) {
      throw new Error('Registry is required for importFromChunk');
    }

    const worldXBase = cx * 16;
    const worldZBase = cz * 16;

    // Calculate the center of the bounds for centering the engram
    const centerX = Math.floor((bounds.min.x + bounds.max.x) / 2);
    const centerY = Math.floor((bounds.min.y + bounds.max.y) / 2);
    const centerZ = Math.floor((bounds.min.z + bounds.max.z) / 2);

    // Iterate through blocks in the bounding box
    for (let worldX = bounds.min.x; worldX <= bounds.max.x; worldX++) {
      for (let worldY = bounds.min.y; worldY <= bounds.max.y; worldY++) {
        for (let worldZ = bounds.min.z; worldZ <= bounds.max.z; worldZ++) {
          // Check if we're at maxBlocks limit
          if (this.blocks.size >= this.maxBlocks) {
            return; // Stop importing if limit reached
          }

          // Get block state ID from chunk
          const stateId = chunk.getBlockStateId(new Vec3Class(worldX, worldY, worldZ));
          if (stateId === undefined) {
            continue; // Skip undefined blocks
          }

          // Look up block name from registry
          const block = registry.blocksByStateId[stateId];
          if (!block || !block.name || block.name === 'air') {
            continue; // Skip air blocks
          }

          // Convert world coordinates to local coordinates (centered at 0,0,0)
          const localX = worldX - centerX;
          const localY = worldY - centerY;
          const localZ = worldZ - centerZ;

          // Add block to engram
          this.addBlock(localX, localY, localZ, block.name);
        }
      }
    }
  }

  /**
   * Import blocks from a subchunk (16x16x16 region)
   * @param chunk - The ChunkColumn containing the subchunk
   * @param cx - Chunk X coordinate
   * @param cy - Subchunk Y index
   * @param cz - Chunk Z coordinate
   * @param registry - Registry for block name lookup
   */
  importFromSubchunk(
    chunk: ChunkColumn,
    cx: number,
    cy: number,
    cz: number,
    registry: any
  ): void {
    if (!registry) {
      throw new Error('Registry is required for importFromSubchunk');
    }

    // Subchunk Y range: cy * 16 to cy * 16 + 15
    const minY = cy * 16;
    const maxY = cy * 16 + 15;

    // World coordinates for the chunk
    const worldXBase = cx * 16;
    const worldZBase = cz * 16;

    // Calculate center of subchunk for centering the engram
    const centerX = worldXBase + 8; // Center of 16-block width
    const centerY = minY + 8; // Center of 16-block height
    const centerZ = worldZBase + 8; // Center of 16-block depth

    // Iterate through all blocks in the subchunk (16x16x16)
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        for (let wy = minY; wy <= maxY; wy++) {
          // Check if we're at maxBlocks limit
          if (this.blocks.size >= this.maxBlocks) {
            return; // Stop importing if limit reached
          }

          const worldX = worldXBase + lx;
          const worldZ = worldZBase + lz;

          // Get block state ID from chunk
          const stateId = chunk.getBlockStateId(new Vec3Class(worldX, wy, worldZ));
          if (stateId === undefined) {
            continue; // Skip undefined blocks
          }

          // Look up block name from registry
          const block = registry.blocksByStateId[stateId];
          if (!block || !block.name || block.name === 'air') {
            continue; // Skip air blocks
          }

          // Convert world coordinates to local coordinates (centered at 0,0,0)
          const localX = worldX - centerX;
          const localY = wy - centerY;
          const localZ = worldZ - centerZ;

          // Add block to engram
          this.addBlock(localX, localY, localZ, block.name);
        }
      }
    }
  }

  /**
   * Export blocks to a chunk (for building)
   * Note: This creates blocks in the chunk at world coordinates
   * @param chunk - The ChunkColumn to export to
   * @param worldOrigin - World coordinates where engram's (0,0,0) maps to
   * @param registry - Registry for block state ID lookup
   */
  exportToChunk(chunk: ChunkColumn, worldOrigin: Vec3, registry: any): void {
    if (!registry) {
      throw new Error('Registry is required for exportToChunk');
    }

    const blocks = this.getAllBlocks();

    for (const block of blocks) {
      // Convert local coordinates to world coordinates
      const worldX = worldOrigin.x + block.x;
      const worldY = worldOrigin.y + block.y;
      const worldZ = worldOrigin.z + block.z;

      // Look up block state ID from registry
      // Registry.blocksByStateId is indexed by stateId, so we need to find the stateId by name
      // We need to iterate through blocksByStateId to find matching name
      let stateId: number | undefined = undefined;
      for (const [id, blockEntry] of Object.entries(registry.blocksByStateId)) {
        if ((blockEntry as any).name === block.blockType) {
          stateId = parseInt(id, 10);
          break;
        }
      }

      if (stateId === undefined) {
        console.warn(
          `Could not find state ID for block type: ${block.blockType} at (${worldX}, ${worldY}, ${worldZ})`
        );
        continue;
      }

      // Set block in chunk using setBlockStateId if available
      // Note: ChunkColumn may not have a direct setBlockStateId method
      // This is a placeholder - actual implementation may need to use chunk's internal API
      try {
        // Try to use setBlockStateId if it exists
        if (typeof (chunk as any).setBlockStateId === 'function') {
          (chunk as any).setBlockStateId(
            new Vec3Class(worldX, worldY, worldZ),
            stateId
          );
        } else {
          // Fallback: log warning that direct chunk modification isn't supported
          console.warn(
            `ChunkColumn.setBlockStateId not available. Block ${block.blockType} at (${worldX}, ${worldY}, ${worldZ}) not set.`
          );
        }
      } catch (error) {
        console.error(`Error setting block in chunk: ${error}`);
      }
    }
  }
}
