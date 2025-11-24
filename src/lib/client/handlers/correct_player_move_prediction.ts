
import { type MovePlayer } from '../types/move_player';

import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';


const handler = {
  name: 'correct_player_move_position' as const,
  fn: async (packet: MovePlayer) => {
    gameState.setTick(packet);
    if (packet?.runtime_id == gameState.runtimeEntityId) {
      console.log(`I was moved via correct_player_move_position`)
      log({ correct_player_move_position: packet })
      gameState.setPositionFromServer({
        position: packet.position,
      })
    }
  }
};

export default handler;
