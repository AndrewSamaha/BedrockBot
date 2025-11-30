import createChunkColumn from 'prismarine-chunk';
import { gameState } from '@/lib/GameState';

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


const handler = {
  name: 'level_chunk' as const,
  fn: async (packet: any) => {
    if (!gameState.registry) {
      console.log('Registry not initialized, skipping level_chunk processing');
      return;
    }
    const ChunkColumn = createChunkColumn(gameState.registry);
    const cc = new ChunkColumn({ x: packet.x, z: packet.z });
    await cc.networkDecodeNoCache(packet.payload, packet.sub_chunk_count);
    gameState.world.setChunk(packet.x, packet.z, cc);
  },
};


export default handler;
