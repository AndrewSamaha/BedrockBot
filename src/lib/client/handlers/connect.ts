import { log } from '@/lib/log';

const connect = {
  name: 'connect' as const,
  fn: () => {
    log('Connected to server!');
  }
};

export default connect;