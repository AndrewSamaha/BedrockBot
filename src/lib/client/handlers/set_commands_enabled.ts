import { gameState } from '@/lib/GameState'
  ;
import { log } from '@/lib/log';
const set_commands_enabled = {
  name: 'set_commands_enabled' as const,
  fn: (packet: any, client: any) => {
    log({ packet });
    gameState.commandsEnabled = packet.enabled;
    log({ set_commands_enabled: gameState.commandsEnabled })
  }
};

export default set_commands_enabled;
