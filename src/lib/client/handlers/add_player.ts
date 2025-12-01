import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';

const addPlayer = {
  name: 'add_player' as const,
  fn: (packet: any) => {
    log({ add_player: true, packet });
    const { uuid } = packet;
    if (gameState.playerList.some((player, idx) => player.uuid === uuid)) {
      gameState.playerList[idx] = packet;
      console.log(`  received new add_player for ${player.username}`)
    } else {
      gameState.playerList.push(packet);
    }
    log({ gameStatePlayerList: gameState.playerList })
  }
};
/*

{
    uuid: '293480fb-0e6f-afbe-004a-8f8877c6d2a7',
    username: 'Tida1Wav3',
    runtime_id: 327n,
    platform_chat_id: '',
    position: { x: -4.544849872589111, y: -56, z: -5.8475518226623535 },
    velocity: { x: 0, y: 0, z: 0 },
    pitch: 55.715179443359375,
    yaw: 175.98941040039062,
    head_yaw: 0,
    held_item: {
      network_id: 3,
      count: 1,
      metadata: 0,
      has_stack_id: 0,
      stack_id: undefined,
      block_runtime_id: -2108756090,
      extra: [Object]
    },
    gamemode: 'fallback',
    metadata: [
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object], [Object],
      [Object], [Object], [Object], [Object]
    ],
    properties: { ints: [], floats: [] },
    unique_id: -4294967295n,
    permission_level: 'operator',
    command_permission: 'operator',
    abilities: [ [Object], [Object] ],
    links: [],
    device_id: '0c5627fe-cfc6-4507-85ff-1955ff704151',
    device_os: 'Android'
  }

*/
export default addPlayer;
