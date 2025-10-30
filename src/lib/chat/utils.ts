import type { Client } from "bedrock-protocol";
import { v4 as uuidv4 } from 'uuid';


export const say = (client: Client, username: string, message: string) => {
  const outgoingItem = {
    type: "chat",
    needs_translation: false,
    source_name: username,
    xuid: "",
    platform_chat_id: "",
    filtered_message: "",
    message
  };

  client.queue("text", outgoingItem);
}

export const tell = (client: Client, sender: string, receiver: string, message: string) => {
  client.queue('command_request', {
    command: `/tell ${receiver} ${message}`,
    origin: {
        type: 0,
        uuid: uuidv4(),
        request_id: "only need for T5"
    },
    internal: false,
    version: 88 // not sure how to find this out
  });
}

export const teleport = (client: Client, destination: string) => {
  client.queue('command_request', {
    command: `/tp ${destination}`,
    origin: {
        type: 0,
        uuid: uuidv4(),
        request_id: "only need for T5"
    },
    internal: false,
    version: 88 // not sure how to find this out
  });
}

/*
 * teleport to another player
 *
 * client.queue('command_request', {
       command: `/execute at ${client.username} as ${spectator.username} run tp ${spectator.username} ~ ~16 ~`,
  origin: {
    type: 'player',
    uuid: '7c49bfaa-800c-9b81-e8d0-aec4216f63bb',
    request_id: '',
    player_entity_id: undefined
  },
  internal: false,
  version: 88
      });
 *
 */

export const sleep = (client: Client, args: unknown) => {
  // action enum: https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.21.111&d=protocol#Action
  // packet player action: https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.21.111&d=protocol#packet_player_action
  const { runtimeEntityId, destination } = args;
  const [ x, y, z ] = destination ? destination.split(" ") : [ 0, 90, 0 ];
  const START_SLEEP = 5;
  const STOP_SLEEP = 6;
  client.queue('player_action', {
    runtime_entity_id: runtimeEntityId,
    action: START_SLEEP,
    position: { x, y, z },
    result_position: { x, y, z },
    face: 0,
  });
}


