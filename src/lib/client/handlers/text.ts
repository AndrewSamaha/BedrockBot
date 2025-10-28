import whisper from './text_handlers/whisper';

import { env } from '@/config/env';
import { log } from '@/lib/log';
import { incomingMessageQueue } from '@/lib/queues';


const subRoutes = [
  whisper,
];

const text = {
  name: 'text' as const,
  fn: (packet: any, client: any) => {
    log({ packet });

    if (packet.source_name === env.BEDROCK_USERNAME) {
      // Ignore packets we send
      return;
    }

    const subRoute = subRoutes.filter((route) => route.name === packet.type);
    if (subRoute && subRoute.length && subRoute[0]) {
      return subRoute[0].fn(packet, client);
    }

    const dt = new Date().toLocaleString();
    if (packet.source_name != env.BEDROCK_USERNAME) {
      incomingMessageQueue.push({ ...packet, event: 'text', getClient: () => client });
    }
  }
};

export default text;
