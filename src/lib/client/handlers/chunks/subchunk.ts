import createChunkColumn from 'prismarine-chunk';
import createRegistry from 'prismarine-registry';

import { gameState } from '@/lib/GameState';

// pick the protocol/version you need
const registry = createRegistry('bedrock_1.21.111');
const ChunkColumn = createChunkColumn(registry);

/*
* Subchunks (Bedrock)
*
* Subchunks are incremental updates to chunks. They contain block data for specific
* subchunk regions within a chunk. Each entry has:
* - dx, dy, dz: offsets from the origin (in chunk coordinates)
* - payload: encoded block data
* - heightmap: height data for the subchunk
*
* The origin is the chunk coordinate, and entries specify offsets from that origin.
*/

const handler = {
  name: 'subchunk' as const,
  fn: async (packet: any) => {
    const { origin, entries, dimension } = packet;
    console.log('SUBCHUNK', origin, entries?.length)
    if (!origin || !entries || entries.length === 0) {
      console.error(' no origin or no entries, exiting')
      return;
    }

    // Process each subchunk entry
    for (const entry of entries) {
      const { dx, dy, dz, payload } = entry;
      console.log({ dx, dy, dz, payload })
      // Calculate the chunk coordinates for this subchunk
      // Origin is the chunk coordinate, dx/dz are offsets in chunks
      const chunkX = origin.x + dx;
      const chunkZ = origin.z + dz;

    }
  }
};

export default handler;
