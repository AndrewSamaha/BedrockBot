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

export const sleep = (client: Client, args: unknown) => {
  // action enum: https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.21.111&d=protocol#Action
  // packet player action: https://prismarinejs.github.io/minecraft-data/?v=bedrock_1.21.111&d=protocol#packet_player_action
  const { runtimeEntityId, destination } = args as { runtimeEntityId: number, destination?: string };
  const [ x, y, z ] = destination ? destination.split(" ") : [ 0, 90, 0 ];
  const START_SLEEP = 'start_sleeping';//5;
  const STOP_SLEEP = 6;
  client.queue('player_action', {
    runtime_entity_id: runtimeEntityId as any,
    action: START_SLEEP,
    position: { x, y, z } as any,
    result_position: { x, y, z } as any,
    face: 0,
  });
};
