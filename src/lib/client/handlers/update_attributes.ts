import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';
import set from 'lodash/set';

const update_attributes = {
  name: 'update_attributes' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    if (gameState.runtimeEntityId == packet.runtime_entity_id) {
      packet.attributes?.forEach((attribute) => {
        set(gameState.attributes, attribute.name, attribute)
      })
      return;
    }
    log({ update_attributes: packet.runtime_entity_id })
  }
};

export default update_attributes;
