import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

const startGame = {
  name: 'start_game' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    log({ server_authoritative_movement: packet.server_authoritative_movement })
    gameState.startGame(client, packet);

    log({ sending: 'serverbound_loading_screen type 1' });
    client.queue('serverbound_loading_screen', { "type": 1 });
    log({ sending: 'serverbound_loading_screen type 2' });
    client.queue('serverbound_loading_screen', { "type": 2 });
    log({ sending: 'interact' });
    client.queue('interact', {
      "action_id": "mouse_over_entity",
      "target_entity_id": 0n,
      "position": { "x": 0, "y": 0, "z": 0 }
    });
    // Send the correct packet with proper field name and BigInt type
    log({ sending: 'set_local_player_as_initialized', runtime_entity_id: packet.runtime_entity_id });
    client.queue('set_local_player_as_initialized', {
      runtime_entity_id: packet.runtime_entity_id // Keep as BigInt (varint64)
    });

  }
};

export default startGame;
