import bedrock from 'bedrock-protocol';
import * as dotenv from 'dotenv';
dotenv.config();

// First, let's try to ping the server to test connectivity
const host = process.env.BEDROCK_HOST || 'localhost';
const port = 19132;

console.log(`Attempting to ping ${host}:${port}...`);

bedrock.ping({ host, port }).then(res => {
  console.log('Ping successful!', res);

  // If ping works, try to create a client
  const client = bedrock.createClient({
    host,
    port,
    username: process.env.BEDROCK_USERNAME || `AgentBot0${Math.floor(Math.random() * 1000)}`,
    offline: true
  });

  client.on('spawn', () => {
    console.log('spawned!')
    // Example: send a chat message
    return;
    client.write('text', {
      type: 'chat',
      needs_translation: false,
      source_name: 'AgentBot',
      xuid: '',
      platform_chat_id: '',
      message: 'hello from bedrock-protocol 🤖',
      string: 'hello this is a string chat write'
    })
  });

/*  client.on('text', (packet) => {
    if (packet.source_name) {
      client.queue('text', {
        type: 'chat', needs_translation: false, xuid: '', platform_chat_id: '', filtered_message: '',
        message: `${packet.source_name} said: ${packet.message} on ${new Date().toLocaleString()}`
      })
    }
  }); */
client.on('text', (packet) => { // Listen for chat messages from the server and echo them back.
  const dt = new Date().toLocaleString();
  if (packet.source_name != client.username) {
    //console.log(JSON.stringify({ dt, chat: `${package.message}` }));
   // console.log({ dt, test: 'text')

    client.queue('text', {
      type: 'chat', needs_translation: false, source_name: client.username, xuid: '', platform_chat_id: '', filtered_message: '',
      message: `${packet.source_name} said: ${packet.message} on ${dt}`
    })
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
