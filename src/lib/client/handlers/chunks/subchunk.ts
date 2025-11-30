import createChunkColumn from 'prismarine-chunk';
import { Vec3 } from "vec3";
import { gameState } from '@/lib/GameState';

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

const DEBUG = true;

const handler = {
  name: 'subchunk' as const,
  fn: async (packet: any) => {
    console.log('received subchunk')
    if (!packet.entries) {
      console.log('   - no entries, exiting')
      return;
    }
    if (!gameState.registry) {
      console.log('   - registry not initialized, skipping subchunk processing');
      return;
    }

    const ChunkColumn = createChunkColumn(gameState.registry);
    let cc = undefined;

    for (const entry of packet.entries) {
      if (entry.result !== 'success') continue;
      const x = packet.origin.x + entry.dx;
      const y = packet.origin.y + entry.dy;
      const z = packet.origin.z + entry.dz;
      cc = gameState.world.getChunk(x, z) as any;
      if (!cc) {
        console.log(`    creating a new chunkcolumn at ${x}, ${z}`)
        cc = new ChunkColumn({ x, z });
        gameState.world.setChunk(x, z, cc);
      } else {
        console.log(`    using an existing chunkcolumn at ${x}, ${z}`)
      }
      await cc.networkDecodeSubChunkNoCache(y, entry.payload);
    }

    if (DEBUG && cc) {
      for (let yy = -64; yy < -62; yy++) {
        for (let zz = -41-4; zz < -41+4; zz++) {
          let row = "";
          for (let xx = 57-4; xx < 57+4; xx++) {
            const state_id = cc.getBlockStateId(new Vec3(xx, yy, zz));
            // getBlockStateId returns a state ID, not a runtime ID
            // Use blocksByStateId instead of blocksByRuntimeId
            const block = gameState.registry.blocksByStateId[state_id];
            const name = block?.name;
            if (state_id !== undefined && name && name !== "air") {
              console.log(`Block at (${xx}, ${yy}, ${zz}): state_id=${state_id}, name=${name}`);
            }
          }
        }
      }
    }
  },
};

export default handler;
