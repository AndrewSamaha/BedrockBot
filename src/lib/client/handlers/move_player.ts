import { type MovePlayer } from '../types/move_player';

import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';


const movePlayer = {
  name: 'move_player' as const,
  fn: async (packet: MovePlayer) => {
    // fires when other entities send their position (every tick)
    // so we use it to setTick
    const { runtime_id } = packet;

    gameState.setTick(packet);
    if (packet?.runtime_id == gameState.runtimeEntityId) {
      console.log(`I was moved via mode: ${packet.mode}`)
      log({ move_player: packet })
      gameState.setPositionFromServer({
        position: packet.position,
        yaw: packet.yaw,
        pitch: packet.pitch,
        head_yaw: packet.head_yaw
      })
      return;
    }

    const players = gameState.playerList.filter((player, idx) => BigInt(player.runtime_id) === BigInt(runtime_id));
    if (players && players.length > 0) {
      const player = players[0];
      player.position = packet.position;
      player.pitch = packet.pitch;
      player.yaw = packet.yaw;
      player.head_yaw = packet.head_yaw;
      player.on_ground = packet.on_ground; // NOTE! here we are adding a field that
                                           // was NOT initially on the obj received
                                           // from the add_player packet
/*
*position: { x: -4.544849872589111, y: -56, z: -5.8475518226623535 },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 55.715179443359375,
    yaw: 175.98941040039062,
    head_yaw: 0,

*/

      //console.log(`runtime_id: ${packet.position.x}, ${packet.position.z} - ${packet.yaw} / ${packet.pitch} / ${packet.head_yaw}`)
    }
  }
};

export default movePlayer;
