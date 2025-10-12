process.env.DEBUG = 'minecraft-protocol raknet'
import bedrock from 'bedrock-protocol';
import { incomingMessageQueue } from '@/lib/queues';
import { ItemStatus } from '@/lib/types';
import { log } from '@/lib/log';
import { env } from '@/config/env';
import { gameState } from '@/lib/GameState';

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// prismarine-registry + prismarine-chunk are used to build ChunkColumn
import createRegistry from 'prismarine-registry'
import createChunkColumn from 'prismarine-chunk'

// pick the protocol/version you need
const registry = createRegistry('bedrock_1.21.111')
const ChunkColumn = createChunkColumn(registry)

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

  if (nextMessage.getStatus() === ItemStatus.RECEIVED) {
    const { packet } = nextMessage;
    if (packet.type.toLowerCase() === 'chat') {
      if (true || packet.xuid && admins.includes(packet.xuid)) {
        log({ call: 'chat_model_invoke', message: packet.message })
        try {
          const messages = [
            systemMessage,
            new HumanMessage(`${packet.source_name}: ${packet.message}`)
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

    nextMessage.markSuccess();
  }
}, 2_000);

// Moving players
// Packet player auth input
// MovePlayer
bedrock.ping({ host, port }).then(res => {
  console.log('Server is reachable. Connecting...', res);
  // If ping works, try to create a client
  const client = bedrock.createClient({
    host,
    port,
    username,
    offline: true
  });

  client.on('spawn', (packet) => {
    console.log('spawned!')
    log({ spawn: true, packet })
    gameState.spawn();
    // Example: send a chat message
  });
  client.on('start_game', (packet) => {
    log({ packet });
    gameState.startGame(client, packet);
  });
  client.on('add_player', (packet) => {
    log({ add_player: true, packet })
  })
  client.on('text', (packet) => { // Listen for chat messages from the server and echo them back.
    log({ packet });

    const dt = new Date().toLocaleString();
    if (packet.source_name != username) {
      incomingMessageQueue.push({ ...packet, event: 'text', getClient: () => client });
    }
  })

  client.on('connect', () => {
    log('Connected to server!');
  });

  client.on('error', (err) => {
    console.error('Client error:', err);
  });

  client.once('resource_packs_info__XX', (packet) => {
    console.log('received resource_packs_info')
    log({ packet })
    client.write('resource_pack_client_response', {
      response_status: 'completed',
      resourcepackids: []
    })

    client.once('resource_pack_stack', (stack) => {
      client.write('resource_pack_client_response', {
        response_status: 'completed',
        resourcepackids: []
      })
    })

    client.queue('client_cache_status', { enabled: false })
    client.queue('request_chunk_radius', { chunk_radius: 1 })
    client.queue('tick_sync', { request_time: BigInt(Date.now()), response_time: 0n })
  });

  client.on('move_player', async packet => {
    // fires when other entities send their position (every tick)
    // so we use it to setTick
    gameState.setTick(packet);
  });

  client.on('level_chunk', async packet => {
    //log({ packet })
    const { payload, ...otherPacketFields } = packet;
    //log({ packet: { ...otherPacketFields, payload: 'omitted_during_logging' } })
    const cc = new ChunkColumn(packet.x, packet.z)
    await cc.networkDecodeNoCache(packet.payload, packet.sub_chunk_count)
    const blocks = []
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        blocks.push(cc.getBlock(x, 0, z)) // Read some blocks in this chunk
      }
    }
    //log({ level_chunk: true, packet_x: packet.x, packet_y: packet.y })
  })

}).catch(err => {
  console.error('Ping failed:', err);
});
