import { log } from '@/lib/log';

export const resourcePacksInfo = {
  name: 'resource_packs_info__XX' as const,
  fn: (packet: any, client: any) => {
    console.log('received resource_packs_info');
    log({ packet });
    client.write('resource_pack_client_response', {
      response_status: 'completed',
      resourcepackids: []
    });

    client.once('resource_pack_stack', (stack: any) => {
      client.write('resource_pack_client_response', {
        response_status: 'completed',
        resourcepackids: []
      });
    });

    client.queue('client_cache_status', { enabled: false });
    client.queue('request_chunk_radius', { chunk_radius: 1 });
    client.queue('tick_sync', { request_time: BigInt(Date.now()), response_time: 0n });
  }
};