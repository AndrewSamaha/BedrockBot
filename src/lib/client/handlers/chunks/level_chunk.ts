import createChunkColumn from 'prismarine-chunk';
import createRegistry from 'prismarine-registry';

import { gameState } from '@/lib/GameState';
import { Vec3 } from 'vec3';

// pick the protocol/version you need
const registry = createRegistry('bedrock_1.21.111');
const ChunkColumn = createChunkColumn(registry);

/*
* Chunks (Bedrock)
*
* A chunk is a 16×16 block area horizontally (X and Z). It covers the entire build height of the world in Y (from the bottom of the world up to the top). So if the height range is 384 blocks tall (e.g. from Y = -64 to Y = 320), then a chunk is: 16 blocks wide (X), 16 blocks long (Z), 384 blocks tall (Y)
*
* Coordinate-wise:
*  Chunk X = floor(blockX / 16)
*  Chunk Z = floor(blockZ / 16)
*
*/

const old_handler = {
  name: 'level_chunk' as const,
  fn: async (packet: any) => {
    const cc = new ChunkColumn(packet.x, packet.z);
    await cc.networkDecodeNoCache(packet.payload, packet.sub_chunk_count);
    gameState.world.setChunk(packet.x, packet.z, cc);
  }
};

function debugChunkBlocks(
  chunk: InstanceType<typeof ChunkColumn>,
  chunkX: number,
  chunkZ: number
) {
  const MIN_Y = -64;
  const MAX_Y = 319;
  let printed = 0;

  // console.log(
  //   `\n[chunk debug] chunk (${chunkX}, ${chunkZ}) worldX≈${chunkX * 16} worldZ≈${chunkZ * 16}`
  // );

  const sampleColumns: [number, number][] = [
    [8, 8],
    [0, 0],
    [15, 15],
    [0, 15],
    [15, 0],
  ];

  for (const [lx, lz] of sampleColumns) {
    for (let y = MAX_Y; y >= MIN_Y; y--) {
      const block = chunk.getBlock(new Vec3(lx, y, lz));
      if (!block) continue;

      const name = (block as any).name ?? (block as any).type ?? 'unknown';
      if (name === 'minecraft:air' || name === 'air') continue;

      const wx = chunkX * 16 + lx;
      const wz = chunkZ * 16 + lz;

      console.log(
        `[chunk debug] non-air at world (${wx}, ${y}, ${wz}) in chunk (${chunkX},${chunkZ}) local (${lx},${y},${lz}) -> ${name}`
      );

      if (typeof (block as any).getProperties === 'function') {
        console.log('   props:', (block as any).getProperties());
      }

      printed++;
      break;
    }
  }

  if (printed === 0) {
    // console.log('[chunk debug] No non-air blocks found in sampled columns.');
  }
}

const handler = {
  name: 'level_chunk' as const,
  fn: async (packet: any) => {
    const { x, z, payload, sub_chunk_count } = packet;

    // console.log(
    //   `[level_chunk] x=${x}, z=${z}, sub_chunk_count=${sub_chunk_count}, payloadLen=${payload?.length}`
    // );

    const cc = new ChunkColumn({ x, z }); // object form is safest with prismarine-chunk bedrock
    await cc.networkDecodeNoCache(payload, sub_chunk_count);

    gameState.world.setChunk(x, z, cc);

    // Debug: inspect some blocks
    debugChunkBlocks(cc, x, z);
  },
};


export default handler;
