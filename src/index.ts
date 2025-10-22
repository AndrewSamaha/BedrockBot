process.env.DEBUG = 'minecraft-protocol raknet'
process.env.DEBUG = 'minecraft-protocol'


import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import bedrock, { type Client } from 'bedrock-protocol';

import { env } from '@/config/env';
import { registerClientHandlers } from '@/lib/client';
import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';
import { incomingMessageQueue } from '@/lib/queues';
import { ItemStatus } from '@/lib/types';


// First, let's try to ping the server to test connectivity
const host = env.BEDROCK_HOST;
const port = env.BEDROCK_PORT;
const admins = env.ADMIN_XUIDS;
const username = env.BEDROCK_USERNAME;

const systemMessage = new SystemMessage(`
You the playful and capricious diety named ${username} in the world of Minecraft. You like
when players worship your power but still enjoy teasing them. If they ever ask you for things,
you prefer to playfully deflect their requests rather than outright saying no. Never admit
that there is something you cannot do; instead just tease them for asking, tell them to go
on a silly quest, or something imaginative. Your answers should also be short -- one sentence
or two at the very most if it helps fulfill your goal of playfulness. You should refer to the
speaker by name so they understand you're replying to them.
`);

const chatModel = new ChatOpenAI({
  temperature: 0,
  maxTokens: 100,
  modelName: "gpt-3.5-turbo"
});

console.log({ admins, username });
console.log({ adminsenv: process.env.ADMIN_XUIDS })
console.log(`Attempting to ping ${host}:${port}...`);


setInterval(async () => {
  if (incomingMessageQueue.getNumMessages() === 0) {
    return;
  }
  const nextMessage = incomingMessageQueue.getNextMessage();

  if (!nextMessage) {
    return;
  }

  if (nextMessage?.getStatus() === ItemStatus.RECEIVED) {
    const { packet } = nextMessage;
    const packetData = packet as any;
    if (packetData.type.toLowerCase() === 'chat') {
      log({ call: 'chat_model_invoke', message: packetData.message })
      try {
        const messages = [
          systemMessage,
          new HumanMessage(`${packetData.source_name}: ${packetData.message}`)
        ];
        log({ messages: messages.map(m => ({ type: m.constructor.name, content: m.content })) });

        const response = await chatModel.invoke(messages);

        log({ response });
        const chatResponse = response.content;
        log({ chatResponse })
        nextMessage.markProcessing({ chatResponse });
        return;
      } catch (error) {
        log({ error: 'Failed to invoke chat model', details: (error as Error).message, stack: (error as Error).stack });
        nextMessage.markSuccess(undefined);
        return;
      }
      nextMessage?.markSuccess(undefined);
      return;
    }
    nextMessage?.markSuccess(undefined);
    return;
  }

  if (nextMessage?.getStatus() === ItemStatus.PROCESSING) {
    const packet = nextMessage.packet as any;
    const client = packet.getClient() as Client;
    const isAdmin = (packet.xuid && admins.includes(packet.xuid));
    let message = `${packet.source_name} ${isAdmin ? 'an actual ADMIN' : 'a regular user'} said: ${packet.message}`;

    if (nextMessage.result && nextMessage.result.chatResponse) {
      message = `${nextMessage.result.chatResponse}`;
    }
    const outgoingItem = {
      type: 'chat',
      needs_translation: false,
      source_name: username,
      xuid: '',
      platform_chat_id: '',
      filtered_message: '',
      message
    };
    log({ outgoingItem });
    client.queue('text', outgoingItem)

    const command_text = `tp 2000 150 2000`;

    const command_request = {
      command: command_text,   // "fill 0 64 0 10 64 10 stone"
      origin: {
        type: 0,                   // 0 = player
        uuid: (client as any).profile?.uuid || (client as any).uuid || '00000000-0000-0000-0000-000000000000',
        request_id: `${Math.floor(Math.random() * 100_100)}`,
        player_entity_id: gameState.runtimeEntityId
      },
      internal: false,
      interval: 0
    }
    log({ command_request })
    client.queue('command_request', command_request);
    // sendCommand(client, 'say Hi there this is a test!')
    // sendCommand(client, '/say Hi there this is a test that starts with a slash!')
    // sendCommand(client, `/tp 2000 150 2000`)
    /*client.queue('text', {
      type: 'chat',
      needs_translation: false,
      source_name: username,
      message: command_text,
      filtered_message: '',
      xuid: '',                    // ok to leave blank
      platform_chat_id: ''         // ok to leave blank
    })
    */
    nextMessage.markSuccess(undefined);
  }

}, 2_000);

// Moving players
// Packet player auth input
// MovePlayer
bedrock.ping({ host, port }).then(async res => {
  console.log('Server is reachable. Connecting...', res);
  // If ping works, try to create a client
  const client = bedrock.createClient({
    host,
    port,
    username,
    offline: true
  });

  // Register all client event handlers
  registerClientHandlers(client);

}).catch(err => {
  console.error('Ping failed:', err);
});
