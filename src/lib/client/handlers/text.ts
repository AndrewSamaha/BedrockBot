import { log } from '@/lib/log';
import { incomingMessageQueue } from '@/lib/queues';
import { env } from '@/config/env';

const text = {
  name: 'text' as const,
  fn: (packet: any, client: any) => {
    log({ packet });

    const dt = new Date().toLocaleString();
    if (packet.source_name != env.BEDROCK_USERNAME) {
      incomingMessageQueue.push({ ...packet, event: 'text', getClient: () => client });
    }
  }
};

export default text;