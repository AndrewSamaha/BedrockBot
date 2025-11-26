import createChunkColumn from 'prismarine-chunk';
import createRegistry from 'prismarine-registry';

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

const handler = {
  name: 'level_chunk' as const,
  fn: async (packet: any) => {
    const { payload, ...otherPacketFields } = packet;
    const cc = new ChunkColumn(packet.x, packet.z);
    await cc.networkDecodeNoCache(packet.payload, packet.sub_chunk_count);
    const blocks = [];
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        blocks.push(cc.getBlock(x, 0, z)); // Read some blocks in this chunk
      }
    }
  }
};

export default handler;
