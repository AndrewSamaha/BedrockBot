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
    return chunk.getBlock(new Vec3(lx, wy, lz));
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
}

