import bedrock, { type Client } from 'bedrock-protocol';

import { env } from '@/config/env';
import { registerClientHandlers } from '@/lib/client';

/**
 * Creates a new client connection to the Bedrock server
 */
export async function createConnection(): Promise<Client | null> {
  try {
    const host = env.BEDROCK_HOST;
    const port = env.BEDROCK_PORT;
    const username = env.BEDROCK_USERNAME;

    // First ping to test connectivity
    await bedrock.ping({ host, port });
    console.log('Server is reachable. Connecting...');
    
    // Create client connection
    const client = bedrock.createClient({
      host,
      port,
      username,
      offline: true
    });

    // Register all client event handlers
    registerClientHandlers(client);
    
    return client;
  } catch (err) {
    console.error('Connection failed:', err);
    return null;
  }
}
