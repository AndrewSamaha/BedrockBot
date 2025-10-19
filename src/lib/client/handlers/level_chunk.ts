import createChunkColumn from 'prismarine-chunk';
import createRegistry from 'prismarine-registry';

// pick the protocol/version you need
const registry = createRegistry('bedrock_1.21.111');
const ChunkColumn = createChunkColumn(registry);

const levelChunk = {
  name: 'level_chunk' as const,
  fn: async (packet: any) => {
    //log({ packet })
    const { payload, ...otherPacketFields } = packet;
    //log({ packet: { ...otherPacketFields, payload: 'omitted_during_logging' } })
    const cc = new ChunkColumn(packet.x, packet.z);
    await cc.networkDecodeNoCache(packet.payload, packet.sub_chunk_count);
    const blocks = [];
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        blocks.push(cc.getBlock(x, 0, z)); // Read some blocks in this chunk
      }
    }
    //log({ level_chunk: true, packet_x: packet.x, packet_y: packet.y })
  }
};

export default levelChunk;