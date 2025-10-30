
import { type CommandNodeDef } from '../command-tree';

import { env } from '@/config/env';
import { teleport, sleep as sleepServerCmd } from '@/lib/serverCommands';
import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

// src/lib/command/commands/sleep.ts
const sleep: CommandNodeDef = {
  name: 'sleep',
  description: "Order the bot to go to sleep",
  usage: "sleep",
  guards: [],                 // gate the whole namespace
  handler: async (ctx, args) => {
    teleport(ctx.client, env.BED_LOCATION);
    await ctx.reply(`teleported to ${env.BED_LOCATION}`);
    const sleepArgs = {
      runtimeEntityId: gameState.runtimeEntityId,
      destination: env.BED_LOCATION
    };

    log({ sleepArgs })
    sleepServerCmd(ctx.client, sleepArgs)
  }
};

export default sleep;

