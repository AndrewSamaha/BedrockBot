import { type CommandNodeDef, CommandRouter } from './command-tree';
import config from './commands/config';
import look from './commands/look';
import reconnect from './commands/reconnect';
import sleep from './commands/sleep';
import teleport from './commands/teleport';

// src/lib/command/commands/config.ts
const rootDef: CommandNodeDef = {
  name: "root",
  children: [
    config,
    sleep,
    teleport,
    look,
    reconnect,
  ]
};

export const router = new CommandRouter(rootDef);
