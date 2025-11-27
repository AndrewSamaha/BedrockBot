import type { Client } from "bedrock-protocol";
import { v4 as uuidv4 } from 'uuid';

import { log } from '@/lib/log';

// barrel import move
export { move } from './move';
export { default as subchunkRequest } from './subchunk_request';

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
};

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
};

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
};

export const fill = (client: Client, startPos: Vec3, endPos: Vec3, blockType: string) => {
  const command = `/fill ${startPos.x} ${startPos.y} ${startPos.z} ${endPos.x} ${endPos.y} ${endPos.z} ${blockType}`;
  console.log(`queuing command_request: ${command}`)
  client.queue('command_request', {
    command,
    origin: {
        type: 0,
        uuid: uuidv4(),
        request_id: "only need for T5"
    },
    internal: false,
    version: 88 // not sure how to find this out
  });
};


export const sleep = (client: Client, args: unknown) => {
  // action enum: https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.21.111&d=protocol#Action
  // packet player action: https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.21.111&d=protocol#packet_player_action
  const { runtimeEntityId, destination } = args as { runtimeEntityId: number, destination?: string };
  const [ x, y, z ] = destination ? destination.split(" ") : [ 0, 90, 0 ];
  const START_SLEEP_STR = 'start_sleeping';//5;
  const START_SLEEP_NUM = 5;
  const STOP_SLEEP = 6;
  const params = {
    runtime_entity_id: Number(runtimeEntityId),
    action: START_SLEEP_STR,
    position: { x: 0, y: 0, z: 0 },
    result_position: { x: 0, y: 0, z: 0 },
    face: 0,
  };
  log({ player_action: params })
  client.queue('player_action', params);
  log({
    type_of_runtime_entity_id: (typeof params.runtime_entity_id),
    is_bigint: (typeof params.runtime_entity_id === 'bigint'),
    runtime_entity_id: params.runtime_entity_id
  });

   /*
  {"name":"player_action","params":
    {
      "runtime_entity_id":"16335",
      "action":"start_sleeping",
      "position":{"x":0,"y":0,"z":0},
      "result_position":{"x":0,"y":0,"z":0},
      "face":0
    }
  }}
*/
};
