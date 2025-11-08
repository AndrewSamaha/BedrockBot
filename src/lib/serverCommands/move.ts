import type { Client } from "bedrock-protocol";

import { buildAuthInputPacket } from "../playerInput/movement";
import { type Vec3 } from "../playerInput/movement";
import { type LookVector } from "../types";

import { type GameState } from "@/lib/GameState";
import { log } from '@/lib/log';

export const move = (client: Client, gS: GameState, moveVector: Vec3, lookVector: LookVector) => {
  // Check if we have a valid position before trying to move
  if (!gS.playerPosition || typeof gS.playerPosition !== 'object' ||
      typeof gS.playerPosition.x !== 'number' ||
      typeof gS.playerPosition.y !== 'number' ||
      typeof gS.playerPosition.z !== 'number') {
    log({ error: 'GameState has no valid position available for movement'});
    return;
  }

  const { newState, packet } = buildAuthInputPacket({
    currentPos: gS.playerPosition,
    currentRot: {
      yaw: lookVector?.yaw || gS.yaw || 0,
      pitch: lookVector?.pitch || gS.pitch || 0,
      headYaw: lookVector?.head_yaw || gS.headYaw || 0,
    },
    moveVector,
    tick: gS.currentTick ? gS.currentTick + 1n : 0n,
    sprint: false
  });

  // Update state
  gS.playerPosition = newState.position;
  gS.pitch = newState.rotation.pitch;
  gS.yaw = newState.rotation.yaw;
  gS.headYaw = newState.rotation.headYaw || 0;

  log({ player_auth_input: packet });
  client.queue('player_auth_input', packet.params);
}

