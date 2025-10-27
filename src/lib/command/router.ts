import { z } from 'zod';
import { CommandNodeDef, CommandRouter, CommandContext } from './command-tree';
import { isAdmin } from './utils';
import config from './commands/config';

// src/lib/command/commands/config.ts
const rootDef: CommandNodeDef = {
  name: "root",
  children: [
    config,
    // Another top-level command with its own sub-tree:
    {
      name: "test",
      description: "Test command.",
      children: [
        {
          name: "restart",
          description: "Restart the bot process.",
          usage: "bot restart",
          guards: [], // [isAdmin]
          handler: async (ctx) => ctx.reply("Restarting..."),
        }
      ]
    }
  ]
};

export const router = new CommandRouter(rootDef);
