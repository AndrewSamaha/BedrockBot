import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';

/*
 * It looks like subsequent receives of this packet might only show us
* New people, not current users!
 */

const handler = {
  name: 'player_list' as const,
  fn: (packet: any) => {
    // it turns out that if a record in packet.records.records only has one key (uuid)
    // then that means the player with that uuid is disconnecting.
    // And, because when we get this as a player connects (it's not an array with all
    // the currently connected player), we really should be using add_player
    //gameState.playerList = packet.records.records;
    // Object.keys(packet.records.records).forEach((key) => {
    //   console.log(key)
    // })
    packet.records?.records?.forEach((record) => {
      if (Object.keys(record).length === 1) {
        const { uuid } = record;
        gameState.playerList = gameState.playerList.filter((player) => player.uuid !== uuid)
      }
    })
    log({ player_list: gameState.playerList })
  }
};

/*
playerListRecords: [    {
      uuid: 'fa3a47b9-d947-59e9-3782-59286c559281',
      entity_unique_id: -4294967281n,
      username: 'Brendella',
      xbox_user_id: '0',
      platform_chat_id: '',
      build_platform: 7,
      is_teacher: false,
      is_host: false,
      is_subclient: false,
      player_color: -1184275
    }  ]
{
  "name": "player_list",
  "params": {
    "records": {
      "records": [
        {
          "build_platform": 7,
          "entity_unique_id": "-4294967281",
          "is_host": false,
          "is_subclient": false,
          "is_teacher": false,
          "platform_chat_id": "",
          "player_color": -1184275,

*/

export default handler;
