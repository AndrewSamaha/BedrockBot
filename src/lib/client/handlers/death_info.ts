import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

const HANDLER_NAME = `death_info`;

const handler = {
  name: HANDLER_NAME,
  fn: (packet: any, client: any) => {
    log({ [HANDLER_NAME]: true, packet });

    gameState.playerHasDied();
  }
};

export default handler;
