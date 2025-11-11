import { type Client } from 'bedrock-protocol';

import { env } from '@/config/env';
import { router } from '@/lib/command/router';
import { log } from '@/lib/log';

const TEXT_PACKET_TYPE = 'whisper';
// whisper / tell
const whisper = {
  name: TEXT_PACKET_TYPE,
  fn: async (packet: any, client: Client) => {
    if (packet.type !== TEXT_PACKET_TYPE) {
      throw new Error(`Packet type is NOT ${TEXT_PACKET_TYPE}`);
    }

    // Ignore packets we send
    if (packet.source_name === env.BEDROCK_USERNAME) return;
    await router.execute(packet.message, {
      packet,
      client,
      reply: (message: string) => {
        log({ reply_to_whisper_was_called: true, message });
      }
    });

    log({ text_handler: 'whisper', packet });
  }
};

export default whisper;
