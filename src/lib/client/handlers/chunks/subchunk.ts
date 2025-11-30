import createChunkColumn from 'prismarine-chunk';
import createRegistry from 'prismarine-registry';
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
    let cc = undefined;

    for (const entry of packet.entries) {
      if (entry.result !== 'success') continue;
      const x = packet.origin.x + entry.dx;
      const y = packet.origin.y + entry.dy;
      const z = packet.origin.z + entry.dz;
      cc = gameState.world.getChunk(x, z) as any;
      if (!cc) {
        console.log(`    creating a new chunkcolumn at ${chunkX}, ${chunkZ}`)
        cc = new ChunkColumn({ x: chunkX, z: chunkZ });
        gameState.world.setChunk(chunkX, chunkZ, cc);
      } else {
        console.log(`    using an existing chunkcolumn at ${entry.dx}, ${entry.dz}`)
      }
      await cc.networkDecodeSubChunkNoCache(y, entry.payload);
    }

    if (DEBUG) {
      for (let yy = -64; yy < -62; yy++) {
        for (let zz = -41-4; zz < -41+4; zz++) {
          let row = "";
          for (let xx = 57-4; xx < 57+4; xx++) {
            const runtime_id = cc.getBlockStateId(new Vec3(xx, yy, zz));
            const name = gameState.registry.blocksByRuntimeId[runtime_id]?.name;
            if (runtime_id && name !== "air") {
              console.log(`Block at (${xx}, ${yy}, ${zz}): ${runtime_id}`, name);
            }
          }
        }
      }
    }
  },
};

export default handler;
