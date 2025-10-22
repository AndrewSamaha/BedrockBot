import { gameState } from '@/lib/GameState'
  ;
import { log } from '@/lib/log';
const game_rules_changed = {
  name: 'game_rules_changed' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    gameState.gameRules = packet.rules;
    log({ game_rules_changed: gameState.gameRules })
  }
};

export default game_rules_changed;
