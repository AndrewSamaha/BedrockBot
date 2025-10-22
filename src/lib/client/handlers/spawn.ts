import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

const spawn = {
  name: 'spawn' as const,
  fn: (packet: any) => {
    console.log('spawned!');
    log({ spawn: true, packet });
    gameState.spawn();
    // Example: send a chat message
  }
};

export default spawn;