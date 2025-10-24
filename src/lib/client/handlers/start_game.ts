import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

function sendCommand(client: any, command: string) {
  client.queue('command_request', {
    command,                     // "fill 0 64 0 10 64 10 stone"
    origin: {
      type: 0,                   // 0 = player
      uuid: client.profile?.uuid || client.uuid || '00000000-0000-0000-0000-000000000000',
      request_id: ''             // optional
    },
    internal: false,
    interval: 0
  })
}

const startGame = {
  name: 'start_game' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    log({ server_authoritative_movement: packet.server_authoritative_movement })
    gameState.startGame(client, packet);
    log({ sending: 'set_local_player_as_initialized', runtime_entity_id: packet.runtime_entity_id });

    // The following three packets are essential for enabling movement
    client.queue('serverbound_loading_screen', { "type": 1 });
    client.queue('serverbound_loading_screen', { "type": 2 });
    client.queue('interact', {
        "action_id": "mouse_over_entity", "target_entity_id": 0n, "position": { "x": 0, "y": 0, "z": 0 }
    });
    // Send the correct packet with proper field name and BigInt type
    client.queue('set_local_player_as_initialized', {
      runtime_entity_id: packet.runtime_entity_id // Keep as BigInt (varint64)
    });

  }
};

export default startGame;
