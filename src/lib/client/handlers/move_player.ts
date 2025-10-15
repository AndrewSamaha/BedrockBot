import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

export const movePlayer = {
  name: 'move_player' as const,
  fn: async (packet: any) => {
    // fires when other entities send their position (every tick)
    // so we use it to setTick
    gameState.setTick(packet);
    if (packet?.runtime_id == gameState.entity_runtime_id) {
      log({ server_auth_move_player: packet })
      gameState.setPosition({
        position: packet.position,
        yaw: packet.yaw,
        pitch: packet.pitch,
        head_yaw: packet.head_yaw
      })
    }
  }
};
