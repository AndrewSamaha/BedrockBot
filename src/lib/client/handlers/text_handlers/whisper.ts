import { type Client } from 'bedrock-protocol';

import { env } from '@/config/env';
import { tell } from '@/lib/chat/utils';
import { router } from '@/lib/command/router';
import { log } from '@/lib/log';

const TEXT_PACKET_TYPE = 'whisper';
// whisper / tell
const whisper = {
  name: TEXT_PACKET_TYPE,
  fn: async (packet: any, client: Client) => {
    log({ found_whisper_packet: packet });
    if (packet.type !== TEXT_PACKET_TYPE) {
      throw new Error(`Packet type is NOT ${TEXT_PACKET_TYPE}`);
    }

    // Ignore packets we send
    if (packet.source_name === env.BEDROCK_USERNAME) return;
    let resultStr = ''
    const result = await router.execute(packet.message, {
      packet,
      client,
      reply: (message: string) => {
        resultStr = message;
      }
    });

    log({ whisper: resultStr });
//    say(client, env.BEDROCK_USERNAME, resultStr);
    tell(client, env.BEDROCK_USERNAME, packet.source_name, resultStr);
  }
};

export default whisper;
