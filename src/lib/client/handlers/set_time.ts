import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';

const setTime = {
  name: 'set_time' as const,
  fn: (packet: any) => {
    //console.dir(packet, { depth: null })
    gameState.setTime(packet.time);
    log({ set_time: true, packet });
  }
};

export default setTime;
