
// Define handler type
export interface ClientHandler {
  name: string;
  fn: (...args: any[]) => void | Promise<void>;
}

// Import all handlers statically
import addPlayer from './handlers/add_player.js';
import availableCommands from './handlers/available_commands.js';
import commandOutput from './handlers/command_output.js';
import connect from './handlers/connect.js';
import error from './handlers/error.js';
import gameRulesChanged from './handlers/game_rules_changed.js';
import levelChunk from './handlers/level_chunk.js';
import movePlayer from './handlers/move_player.js';
import resourcePacks from './handlers/resource_packs.js';
import setCommandsEnabled from './handlers/set_commands_enabled.js';
import spawn from './handlers/spawn.js';
import startGame from './handlers/start_game.js';
import text from './handlers/text.js';
import updateAttributes from './handlers/update_attributes.js';

// Function to load all handlers statically
function loadHandlers(): ClientHandler[] {
  const handlers: ClientHandler[] = [
    addPlayer,
    availableCommands,
    commandOutput,
    connect,
    error,
    gameRulesChanged,
    levelChunk,
    movePlayer,
    resourcePacks,
    setCommandsEnabled,
    spawn,
    startGame,
    text,
    updateAttributes
  ];
  
  console.log(`Successfully loaded ${handlers.length} handlers`);
  return handlers;
}

// Function to register all handlers with a client
export const registerClientHandlers = (client: any) => {
  // Load handlers statically
  const handlers = loadHandlers();
  
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
