process.env.DEBUG = 'minecraft-protocol raknet'
process.env.DEBUG = 'minecraft-protocol'


import { env } from '@/config/env';
import { initializeChatPipeline } from '@/lib/chat';
import { createConnection } from '@/lib/connection';


const admins = env.ADMIN_XUIDS;
const username = env.BEDROCK_USERNAME;

console.log({ admins, username });
console.log({ adminsenv: process.env.ADMIN_XUIDS })
console.log(`Attempting to connect to ${env.BEDROCK_HOST}:${env.BEDROCK_PORT}...`);

initializeChatPipeline({ username, admins });

// Initial connection
createConnection().then(client => {
  if (client) {
    // The client will be set in gameState via the start_game handler
    console.log('Initial connection established');
  }
});
