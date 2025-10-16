import { log } from '@/lib/log';


export const available_commands = {
  name: 'available_commands' as const,
  fn: async (packet: unknown) => {
    // fires when other entities send their position (every tick)
    // so we use it to setTick
    log({ packet });
  }
};
