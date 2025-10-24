process.env.DEBUG = 'minecraft-protocol raknet'
process.env.DEBUG = 'minecraft-protocol'


import bedrock, { type Client } from 'bedrock-protocol';

import { env } from '@/config/env';
import { registerClientHandlers } from '@/lib/client';
import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';
import { ItemStatus } from '@/lib/types';
import { initializeChatPipeline } from '@/lib/chat';


// First, let's try to ping the server to test connectivity
const host = env.BEDROCK_HOST;
const port = env.BEDROCK_PORT;
const admins = env.ADMIN_XUIDS;
const username = env.BEDROCK_USERNAME;


console.log({ admins, username });
console.log({ adminsenv: process.env.ADMIN_XUIDS })
console.log(`Attempting to ping ${host}:${port}...`);


initializeChatPipeline({ username, admins });

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
