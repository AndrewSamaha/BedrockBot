import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';

export const startGame = {
  name: 'start_game' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    gameState.startGame(client, packet);
    log({ sending: 'set_local_player_as_initialized', runtime_entity_id: packet.runtime_entity_id });
    log({ sending: 'set_local_player_as_initialized', runtime_entity_id: Number(packet.runtime_entity_id) });
    /*client.queue('set_local_player_as_initialized', {
      entity_runtime_id: Number(packet.runtime_entity_id)
    })
  */
  }
};