import type { Client } from "bedrock-protocol";
import { v4 as uuidv4 } from 'uuid';

import { log } from '@/lib/log';

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
  const outgoingItem = {
    type: "whisper",
    needs_translation: false,
    source_name: sender,
    xuid: "",
    platform_chat_id: receiver,
    filtered_message: message,
    message,
    string: message
  };
  log({ outgoingItem })
  //client.queue("text", outgoingItem);
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


