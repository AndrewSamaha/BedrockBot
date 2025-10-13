import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';

export const startGame = {
  name: 'start_game' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    gameState.startGame(client, packet);
    log({ sending: 'set_local_player_as_initialized', runtime_entity_id: packet.runtime_entity_id });
    
    // Send the correct packet with proper field name and BigInt type
    client.queue('set_local_player_as_initialized', {
      runtime_entity_id: packet.runtime_entity_id // Keep as BigInt (varint64)
    });
  }
};
