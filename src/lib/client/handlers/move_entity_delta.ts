import { type MovePlayer } from '../types/move_player';

import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';


const movePlayer = {
  name: 'move_entity_delta' as const,
  fn: async (packet: MovePlayer) => {
    if (packet?.runtime_entity_id == gameState.runtimeEntityId) {
      log({ move_entity_delta: packet })
      gameState.setPositionFromServer({
        position: {
          x: packet.x,
          y: packet.y,
          z: packet.z
        }
      })
    }
  }
};

export default movePlayer;
