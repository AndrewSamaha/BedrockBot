import { log } from '@/lib/log';

export const addPlayer = {
  name: 'add_player' as const,
  fn: (packet: any) => {
    log({ add_player: true, packet });
  }
};