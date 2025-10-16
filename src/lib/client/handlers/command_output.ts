import { log } from '@/lib/log';
import { incomingMessageQueue } from '@/lib/queues';
import { env } from '@/config/env';

export const command_output = {
  name: 'command_output' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    console.log("COMMAND_OUTPUT")
    console.log({ output: packet.output })
    console.dir({ output: packet.output }, { depth: null })
  }
};
