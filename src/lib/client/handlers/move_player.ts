import { gameState } from '@/lib/GameState';

export const movePlayer = {
  name: 'move_player' as const,
  fn: async (packet: any) => {
    // fires when other entities send their position (every tick)
    // so we use it to setTick
    gameState.setTick(packet);
  }
};