import { type MovePlayer } from '../types/move_player';

import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';


const movePlayer = {
  name: 'move_player' as const,
  fn: async (packet: MovePlayer) => {
    // fires when other entities send their position (every tick)
    // so we use it to setTick
    gameState.setTick(packet);
    if (packet?.runtime_id == gameState.runtime_entity_id) {
      log({ move_player: packet })
      gameState.setPositionFromServer({
        position: packet.position,
        yaw: packet.yaw,
        pitch: packet.pitch,
        head_yaw: packet.head_yaw
      })
    }
  }
};

export default movePlayer;
