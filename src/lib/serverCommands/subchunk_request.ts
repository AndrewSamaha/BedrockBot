import type { Client } from "bedrock-protocol";

import { buildAuthInputPacket } from "../playerInput/movement";
import { type Vec3 } from "../playerInput/movement";
import { type LookVector } from "../types";

import { type GameState } from "@/lib/GameState";
import { log } from '@/lib/log';

const command = (client: Client, gS: GameState) => {
  const params = {
    dimension: 0,
    origin: {
      x: -2,
      y: 0,
      z: -2
    },
    requests: [
      {
        dx: Math.floor(gS.playerPosition.x / 16),
        dy: Math.floor(gS.playerPosition.y / 16),
        dz: Math.floor(gS.playerPosition.z / 16)
      }
    ]
  }
  log({ subchunk_request: params });
  client.queue('subchunk_request', params);
}

export default command;
