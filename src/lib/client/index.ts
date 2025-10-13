import { spawn } from './handlers/spawn';
import { startGame } from './handlers/start_game';
import { addPlayer } from './handlers/add_player';
import { text } from './handlers/text';
import { connect } from './handlers/connect';
import { error } from './handlers/error';
import { resourcePacksInfo } from './handlers/resource_packs';
import { movePlayer } from './handlers/move_player';
import { levelChunk } from './handlers/level_chunk';

// Define handler type
export interface ClientHandler {
  name: string;
  fn: (...args: any[]) => void | Promise<void>;
}

// Collect all handlers
const handlers: ClientHandler[] = [
  spawn,
  startGame,
  addPlayer,
  text,
  connect,
  error,
  resourcePacksInfo,
  movePlayer,
  levelChunk
];

// Function to register all handlers with a client
export const registerClientHandlers = (client: any) => {
  handlers.forEach((handler) => {
    if (handler.name === 'resource_packs_info__XX') {
      // Special case for once() handler
      client.once(handler.name, (packet: any) => handler.fn(packet, client));
    } else if (handler.name === 'start_game' || handler.name === 'text') {
      // Handlers that need the client instance
      client.on(handler.name, (packet: any) => handler.fn(packet, client));
    } else {
      // Regular handlers
      client.on(handler.name, handler.fn);
    }
  });
};

export { handlers };