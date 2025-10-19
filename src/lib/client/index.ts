import { readdir } from 'fs/promises';
import { dirname, join, extname } from 'path';
import { fileURLToPath } from 'url';

// Define handler type
export interface ClientHandler {
  name: string;
  fn: (...args: any[]) => void | Promise<void>;
}

// Function to dynamically load all handlers
async function loadHandlers(): Promise<ClientHandler[]> {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const handlersDir = join(__dirname, 'handlers');
  
  console.log('Loading handlers from:', handlersDir);
  
  // Read all files in the handlers directory
  const files = await readdir(handlersDir);
  console.log('Found files:', files);
  
  // Filter for TypeScript files
  const handlerFiles = files.filter(file => extname(file) === '.ts');
  console.log('TypeScript handler files:', handlerFiles);
  
  const handlers: ClientHandler[] = [];
  
  for (const file of handlerFiles) {
    try {
      // Import the handler file dynamically
      const handlerModule = await import(`./handlers/${file}`);
      
      // Check if the module has a default export
      if (handlerModule.default) {
        console.log(`Loaded handler: ${file} -> ${handlerModule.default.name}`);
        handlers.push(handlerModule.default);
      } else {
        console.warn(`Handler file ${file} does not have a default export`);
      }
    } catch (error) {
      console.error(`Failed to load handler ${file}:`, error);
    }
  }
  
  console.log(`Successfully loaded ${handlers.length} handlers`);
  return handlers;
}

// Function to register all handlers with a client
export const registerClientHandlers = async (client: any) => {
  // Load handlers dynamically
  const handlers = await loadHandlers();
  
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
