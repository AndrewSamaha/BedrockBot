import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState'
  ;
const game_rules_changed = {
  name: 'game_rules_changed' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    gameState.gameRules = packet.rules;
    log({ game_rules_changed: gameState.gameRules })
  }
};

export default game_rules_changed;
