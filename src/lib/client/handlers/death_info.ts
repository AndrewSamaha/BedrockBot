import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

const HANDLER_NAME = `death_info`;

const handler = {
  name: HANDLER_NAME,
  fn: (packet: any, client: any) => {
    log({ [HANDLER_NAME]: true, packet });

    gameState.playerHasDied();

    // client.queue('respawn',  {
    //   position: {
    //     x: 0,
    //     y: 0,
    //     z: 0
    //   } ,
    //   state: 2,
    //   runtime_entity_id: `${gameState.runtimeEntityId}`
    // });
    //
    // client.queue('player_action', {
    //   runtime_entity_id: `${gameState.runtimeEntityId}`,
    //   action: 7,
    //   position: {
    //     x: 0,
    //     y: 0,
    //     z: 0
    //   },
    //   result_position: {
    //     x: 0,
    //     y: 0,
    //     z: 0
    //   },
    //   face: -1
    // });
  }
};

export default handler;
