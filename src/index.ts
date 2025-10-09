import bedrock from 'bedrock-protocol';
import * as dotenv from 'dotenv';
dotenv.config();

import { incomingMessageQueue, ItemStatus } from '@/lib/queues';

// First, let's try to ping the server to test connectivity
const host = process.env.BEDROCK_HOST || 'localhost';
const port = 19132;
const admins = process.env.ADMIN_XUIDS?.split(',') || [];
const username = process.env.BEDROCK_USERNAME || `AgentBot0${Math.floor(Math.random() * 1000)}`;
console.log({ admins, username });
console.log({ adminsenv: process.env.ADMIN_XUIDS })
console.log(`Attempting to ping ${host}:${port}...`);

setInterval(() => {
  if (incomingMessageQueue.getNumMessages() === 0) {
    console.log({ datetime: new Date(), currentMessage: 'no messages' });
    return;
  }
  const nextMessage = incomingMessageQueue.getNextMessage();

  if (!nextMessage) {
    console.log({ datetime: new Date(), currentMessage: 'no messages left in queue' });
    return;
  }

  if (nextMessage.getStatus() === ItemStatus.RECEIVED) {
    console.log({ currentMessage: nextMessage });
    nextMessage.markProcessing();
    return;
  }
  if (nextMessage.getStatus() === ItemStatus.PROCESSING) {
    const packet = nextMessage.packet;
    const client = packet.getClient();
    const isAdmin = (packet.xuid && admins.includes(packet.xuid));
    const message = `${packet.source_name} ${isAdmin ? 'an actual ADMIN' : 'a regular user'} said: ${packet.message}`;
    const outgoingItem = {
      type: 'chat',
      needs_translation: false,
      source_name: username,
      xuid: '',
      platform_chat_id: '',
      filtered_message: '',
      message
    };
    console.log({outgoingItem});
    client.queue('text', outgoingItem)

    nextMessage.markSuccess();
  }
}, 3_000);

bedrock.ping({ host, port }).then(res => {
  console.log('Ping successful!', res);

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
    const dt = new Date().toLocaleString();
    if (packet.source_name != username) {
      console.log({ datetime: dt, user: packet.source_name, text: packet.message, ...packet });
      incomingMessageQueue.push({...packet, event: 'text', getClient: () => client });
    }
  })

  client.on('connect', () => {
    console.log('Connected to server!');
  });

  client.on('error', (err) => {
    console.error('Client error:', err);
  });

}).catch(err => {
  console.error('Ping failed:', err);
});
