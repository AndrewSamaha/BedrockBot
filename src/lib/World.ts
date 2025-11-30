import { type Vec3 } from './types.js';
import { type ChunkColumn } from 'prismarine-chunk';
import { Vec3 as Vec3Class } from 'vec3';

export type ChunkKey = `${number},${number}`;

export class World {
  private chunks = new Map<ChunkKey, InstanceType<typeof ChunkColumn>>();

  private key(cx: number, cz: number): ChunkKey {
    return `${cx},${cz}` as ChunkKey;
  }

  setChunk(cx: number, cz: number, chunk: InstanceType<typeof ChunkColumn>) {
    this.chunks.set(this.key(cx, cz), chunk);
  }

  getChunk(cx: number, cz: number) {
    return this.chunks.get(this.key(cx, cz)) ?? null;
  }

  /** World-space block lookup */
  getBlock(wx: number, wy: number, wz: number) {
    const cx = Math.floor(wx / 16);
    const cz = Math.floor(wz / 16);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return null; // unknown/unloaded

    const lx = wx & 0xf; // wx % 16 but faster & handles negatives correctly with floor above
    const lz = wz & 0xf;
    return chunk.getBlock({ x: lx, y: wy, z: lz });
  }

  /** Get block state ID at world coordinates */
  getBlockStateIdAt(worldX: number, worldY: number, worldZ: number): number | undefined {
    const cx = Math.floor(worldX / 16);
    const cz = Math.floor(worldZ / 16);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return undefined;

    return chunk.getBlockStateId(new Vec3Class(worldX, worldY, worldZ));
  }

  /** Get the number of chunks currently loaded */
  getChunkCount(): number {
    return this.chunks.size;
  }

  /** Get all chunk coordinates as an array of [cx, cz] tuples */
  getAllChunkCoords(): Array<[number, number]> {
    return Array.from(this.chunks.keys()).map((key) => {
      const [cx, cz] = key.split(',').map(Number);
      return [cx, cz];
    });
  }

  /** Get block statistics for a chunk */
  getChunkBlockStats(cx: number, cz: number): { total: number; nonAir: number } {
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return { total: 0, nonAir: 0 };

    let total = 0;
    let nonAir = 0;

    // Sample a subset of blocks for performance (every 4th block in each dimension)
    for (let lx = 0; lx < 16; lx += 4) {
      for (let lz = 0; lz < 16; lz += 4) {
        for (let wy = -64; wy <= 320; wy += 4) {
          total++;
          const block = chunk.getBlock({ x: lx, y: wy, z: lz });
          if (block && block.type !== 0 && block.name !== 'air') {
            nonAir++;
          }
        }
      }
    }

    // Extrapolate to full chunk (16x16x384 = 98,304 blocks)
    // We sampled 4x4x96 = 1,536 blocks, so multiply by 64
    const scaleFactor = (16 * 16 * 384) / (4 * 4 * 96);
    return {
      total: Math.round(total * scaleFactor),
      nonAir: Math.round(nonAir * scaleFactor)
    };
  }

  /** Get the highest blocks in a chunk as an array of [lx, ly, lz] tuples (local chunk coordinates) */
  getHighestBlocksInChunk(cx: number, cz: number): Array<[number, number, number]> {
    const chunk = this.getChunk(cx, cz);
    if (!chunk) {
      return [];
    }

    const highestBlocks: Array<[number, number, number]> = [];

    // Iterate through each X,Z position in the chunk (0-15)
    for (let lx = 0; lx < 16; lx++) {
      for (let lz = 0; lz < 16; lz++) {
        // Search from top to bottom (320 to -64)
        for (let wy = 320; wy >= -64; wy--) {
          const block = chunk.getBlock({ x: lx, y: wy, z: lz });

          // Check if block exists and is not air
          // Air blocks typically have type 0 or name 'air'
          if (block && block.type !== 0 && block.name !== 'air') {
            // This is a solid block - add it as highest
            highestBlocks.push([lx, wy, lz]);
            break; // Found the highest block, move to next X,Z
          }
        }
      }
    }

    return highestBlocks;
  }

  /** Get all blocks from a specific subchunk (16x16x16 region) as an array of [wx, wy, wz] tuples (world coordinates)
   * @param registry - The registry instance from gameState to look up block names
   */
  getAllBlocksInSubchunk(cx: number, cy: number, cz: number, registry: any): Array<{ x: number; y: number; z: number }> {
    if (!registry) {
      console.log(`[getAllBlocksInSubchunk] No registry: cx=${cx}, cy=${cy}, cz=${cz}`);
      return [];
    }

    const blocks: Array<{ x: number; y: number; z: number }> = [];

    // Subchunk Y range: cy * 16 to cy * 16 + 15
    const minY = cy * 16;
    const maxY = cy * 16 + 15;

    // World coordinates for the chunk
    const worldXBase = cx * 16;
    const worldZBase = cz * 16;

    //console.log(`[getAllBlocksInSubchunk] Processing subchunk: cx=${cx}, cy=${cy}, cz=${cz}, Y range: ${minY} to ${maxY}, world base: (${worldXBase}, ${worldZBase})`);

    let totalChecked = 0;
    let nonAirFound = 0;
    let airFound = 0;
    let undefinedStateId = 0;
    let missingInRegistry = 0;

    // Iterate through all blocks in the subchunk (16x16x16)
    // Use world coordinates for all axes (as per the helper function)
    for (let lx = 0; lx < 1; lx++) {
      for (let lz = 0; lz < 1; lz++) {
        for (let wy = minY; wy <= maxY; wy++) {
          const worldX = worldXBase + lx;
          const worldZ = worldZBase + lz;

          // Use the helper function that handles world coordinates correctly
          const stateId = this.getBlockStateIdAt(worldX, wy, worldZ);

          // Look up block info from registry using state ID
          const block = registry.blocksByStateId[stateId];
          const name = block?.name;

          totalChecked++;

          // Debug logging for first few blocks and every 100th
          console.log(`[getAllBlocksInSubchunk] Block at (${worldX}, ${wy}, ${worldZ}): state_id=${stateId}, name=${name || 'undefined'}`);

          if (stateId === undefined) {
            undefinedStateId++;
          } else if (!block) {
            missingInRegistry++;
            if (totalChecked <= 20) {
              console.log(`[getAllBlocksInSubchunk] State ID ${stateId} not found in registry.blocksByStateId`);
            }
          } else if (name === 'air') {
            airFound++;
          } else if (name && name !== 'air') {
            nonAirFound++;
            console.log(`[getAllBlocksInSubchunk] Block at (${worldX}, ${wy}, ${worldZ}): state_id=${stateId}, name=${name}`);
            blocks.push({ x: worldX, y: wy, z: worldZ });
          }
        }
      }
    }

    console.log(`[getAllBlocksInSubchunk] Completed: checked ${totalChecked} blocks`);
    console.log(`[getAllBlocksInSubchunk] Stats: undefinedStateId=${undefinedStateId}, missingInRegistry=${missingInRegistry}, airFound=${airFound}, nonAirFound=${nonAirFound}, returning ${blocks.length} blocks`);

    return blocks;
  }
}

