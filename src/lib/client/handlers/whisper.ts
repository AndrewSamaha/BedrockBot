import { env } from '@/config/env';
import { log } from '@/lib/log';
import { incomingMessageQueue } from '@/lib/queues';
import { router } from '@/lib/command/router';

// whisper / tell
const whisper = {
  name: 'text' as const,
  fn: async (packet: any, client: any) => {
    log({ packet });
    /*
    const dt = new Date().toLocaleString();
    if (packet.source_name != env.BEDROCK_USERNAME) {
      incomingMessageQueue.push({ ...packet, event: 'text', getClient: () => client });
    }
    */
    const result = await router.execute(packet.message, {
      packet,
      client,
      reply: (message: string) => {
        log({ reply: message })
      }
    });
    log({ whisper: result });

  }
};

export default whisper;
