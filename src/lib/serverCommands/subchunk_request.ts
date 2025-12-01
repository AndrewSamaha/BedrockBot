import type { Client } from "bedrock-protocol";

import { buildAuthInputPacket } from "../playerInput/movement";
import { type Vec3 } from "../playerInput/movement";
import { type LookVector } from "../types";

import { type GameState } from "@/lib/GameState";
import { log } from '@/lib/log';

const command = (client: Client, gS: GameState) => {
  const pos = gS.playerPosition;
  if (!pos) {
    console.log('[subchunk_request] No player position, skipping');
    return;
  }

  // Player's chunk coords
  const cx = Math.floor(pos.x / 16);
  const cz = Math.floor(pos.z / 16);

  // Player's subchunk Y index
  const cy = Math.floor(pos.y / 16);

  // Use the player's chunk as the origin; dy will be the subchunk index
  const origin = {
    x: cx,
    y: 0,     // base; dy will be the actual subchunk index
    z: cz,
  };

  const requests: Array<{ dx: number; dy: number; dz: number }> = [];

  // 3×3 area around the player: center + 8 neighbors
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      requests.push({
        dx,        // chunk offset in X
        dy: cy,    // subchunk index (relative to origin.y=0)
        dz,        // chunk offset in Z
      });
    }
  }

  const params = {
    dimension: 0, // adjust if you support other dimensions
    origin,
    requests,
  };

  client.queue('subchunk_request', params);
};
export default command;
