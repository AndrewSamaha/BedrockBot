import bedrock from 'bedrock-protocol';
import { incomingMessageQueue } from '@/lib/queues';
import { ItemStatus } from '@/lib/types';
import { log } from '@/lib/log';
import { env } from '@/config/env';

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
// First, let's try to ping the server to test connectivity
const host = env.BEDROCK_HOST;
const port = 19132;
const admins = env.ADMIN_XUIDS;
const username = env.BEDROCK_USERNAME;

const systemMessage = new SystemMessage(`
You the playful and capricious diety named ${username} in the world of Minecraft. You like
when players worship your power but still enjoy teasing them. If they ever ask you for things,
you prefer to playfully deflect their requests rather than outright saying no. Never admit
that there is something you cannot do; instead just tease them for asking, tell them to go
on a silly quest, or something imaginative. Your answers should also be short -- one sentence
or two at the very most if it helps fulfill your goal of playfulness.
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
    //console.log({ datetime: new Date(), currentMessage: 'no messages' });
    return;
  }
  const nextMessage = incomingMessageQueue.getNextMessage();

  if (!nextMessage) {
    //console.log({ datetime: new Date(), currentMessage: 'no messages left in queue' });
    return;
  }

  if (nextMessage.getStatus() === ItemStatus.RECEIVED) {
    //console.log({ currentMessage: nextMessage });
    const { packet } = nextMessage;
    if (packet.type.toLowerCase() === 'chat') {
      if (packet.xuid && admins.includes(packet.xuid)) {
        log({ call: 'chat_model_invoke', message: packet.message })
        try {
          const messages = [
            systemMessage,
            new HumanMessage(`${packet.message}`)
          ];
          log({ messages: messages.map(m => ({ type: m.constructor.name, content: m.content })) });
          
          const response = await chatModel.invoke(messages);
          
          log({ response });
          const chatResponse = response.content;
          log({ chatResponse })
          nextMessage.markProcessing({ chatResponse });
          return;
        } catch (error) {
          log({ error: 'Failed to invoke chat model', details: error.message, stack: error.stack });
          nextMessage.markSuccess();
          return;
        }
      }
      nextMessage.markSuccess();
      return;
    }
    nextMessage.markSuccess();
    return;
  }

  if (nextMessage.getStatus() === ItemStatus.PROCESSING) {
    const packet = nextMessage.packet;
    const client = packet.getClient();
    const isAdmin = (packet.xuid && admins.includes(packet.xuid));
    let message = `${packet.source_name} ${isAdmin ? 'an actual ADMIN' : 'a regular user'} said: ${packet.message}`;

    if (nextMessage.result && nextMessage.result.chatResponse) {
      message = `${packet.source_name}, ${nextMessage.result.chatResponse}`;
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
    log({outgoingItem});
    client.queue('text', outgoingItem)

    nextMessage.markSuccess();
  }
}, 2_000);


bedrock.ping({ host, port }).then(res => {
  console.log('Server is reachable. Connecting...', res);
  // If ping works, try to create a client
  const client = bedrock.createClient({
    host,
    port,
    username,
    offline: true
  });

  client.on('spawn', () => {
    console.log('spawned!')
    // Example: send a chat message
  });

  client.on('text', (packet) => { // Listen for chat messages from the server and echo them back.
    log({ packet });

    const dt = new Date().toLocaleString();
    if (packet.source_name != username) {
      incomingMessageQueue.push({...packet, event: 'text', getClient: () => client });
    }
  })

  client.on('connect', () => {
    log('Connected to server!');
  });

  client.on('error', (err) => {
    console.error('Client error:', err);
  });

}).catch(err => {
  console.error('Ping failed:', err);
});
