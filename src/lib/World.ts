import { type Vec3 } from './types.js';
import createChunkColumn from 'prismarine-chunk';
import createRegistry from 'prismarine-registry';


// ChunkColumn created as you already do:
const registry = createRegistry('bedrock_1.21.111');
const ChunkColumn = createChunkColumn(registry);

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
}

