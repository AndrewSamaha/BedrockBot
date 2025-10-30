import { type CommandNodeDef, CommandRouter } from './command-tree';
import config from './commands/config';
import sleep from './commands/sleep';
import teleport from './commands/teleport';

// src/lib/command/commands/config.ts
const rootDef: CommandNodeDef = {
  name: "root",
  children: [
    config,
    sleep,
    teleport
  ]
};

export const router = new CommandRouter(rootDef);
