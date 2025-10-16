import { log } from '@/lib/log';

const addPlayer = {
  name: 'add_player' as const,
  fn: (packet: any) => {
    log({ add_player: true, packet });
  }
};

export default addPlayer;