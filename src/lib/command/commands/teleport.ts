import { type CommandNodeDef } from '../command-tree';

import { teleport as teleportServerCmd } from '@/lib/chat/utils';
import { log } from '@/lib/log';

// src/lib/command/commands/teleport.ts
const teleport: CommandNodeDef = {
  name: 'teleport',
  description: "Order the bot to teleport",
  usage: "teleport <destination>",
  guards: [],                 // gate the whole namespace
  handler: async (ctx, args) => {
    const destination = `${args.join(" ")}`;
    teleportServerCmd(ctx.client, destination);
    await ctx.reply(`teleported to ${destination}`);
    log({ teleport: destination, args })
  }
};

export default teleport;

