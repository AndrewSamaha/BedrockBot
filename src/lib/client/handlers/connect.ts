import { log } from '@/lib/log';

export const connect = {
  name: 'connect' as const,
  fn: () => {
    log('Connected to server!');
  }
};