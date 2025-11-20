import { log } from '@/lib/log';
import { gameState } from '@/lib/GameState';

// This packet seems to get triggered when a player goes to sleep, wakes up, joins, or leaves the game
const levelEventGeneric = {
  name: 'level_event_generic' as const,
  fn: (packet: any) => {
    log({ level_event_generic: true, packet });
    const overworldPlayerCount = packet.nbt.find((nbt) => nbt.name === 'overworldPlayerCount')?.value;
    const sleepingPlayerCount = packet.nbt.find((nbt) => nbt.name === 'sleepingPlayerCount')?.value;
    const ableToSleep = packet.nbt.find((nbt) => nbt.name === 'ableToSleep')?.value;
    gameState.overworldPlayerCount = overworldPlayerCount;
    gameState.sleepingPlayerCount = sleepingPlayerCount;
    gameState.ableToSleep = ableToSleep;
    gameState.checkAutoReconnect();
  }
};

export default levelEventGeneric;
