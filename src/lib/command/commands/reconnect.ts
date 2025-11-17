import { z } from 'zod';

import { type CommandNodeDef } from '../command-tree';

import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';

// src/lib/command/commands/reconnect.ts
const reconnect: CommandNodeDef = {
  name: 'reconnect',
  description: 'Disconnect from the server, wait, then reconnect',
  usage: 'reconnect [duration_ms]',
  guards: [],
  argsSchema: z.union([
    z.tuple([]),  // no args - use default
    z.tuple([z.string().transform((val) => {
      const num = parseInt(val, 10);
      if (isNaN(num) || num <= 0) {
        throw new Error('Duration must be a positive integer');
      }
      return num;
    })])  // one arg: duration in ms
  ]),
  handler: async (ctx, args) => {
    // Parse duration from args
    const durationMs = Array.isArray(args) && args.length > 0 && typeof args[0] === 'number'
      ? args[0]
      : 30000; // Default 30 seconds

    log({ reconnect_command: { durationMs } });
    
    await ctx.reply(`Initiating reconnect: will disconnect, wait ${durationMs}ms, then reconnect...`);
    
    // Trigger the reconnect (don't await to avoid blocking the command response)
    gameState.reconnect(durationMs).catch((err) => {
      console.error('Reconnect error:', err);
      log({ reconnect_error: err });
    });
  }
};

export default reconnect;
