import { z } from 'zod';

import type { CommandNodeDef } from '../command-tree';

import { botConfig } from '@/config/bot';
import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';
import { move } from '@/lib/serverCommands/move';
import type { LookVector, Vec3 } from "@/lib/types";

const rootDef: CommandNodeDef = {
  name: 'look',
  description: "Instruct the bot to look somewhere",
  usage: "look <subcommand>",
  guards: [],                 // gate the whole namespace
  children: [
    {
      name: "down",
      description: "instruct the bot to look down",
      usage: 'look down',
      // Optional single arg: if provided, show that key; else show all
      argsSchema: z.union([
        z.tuple([]),                 // no args
      ]),
      handler: async (ctx) => {
        const moveVector: Vec3 = {
          x: 0,
          y: 0,
          z: 0
        };
        const lookVector: LookVector = {
          pitch: botConfig.look.downOneBlockPitch,
          yaw: 0,
          head_yaw: 0
        };
        log({ commandHandler: 'look', lookVector, moveVector })
        move(ctx.client, gameState, moveVector, lookVector);
      },
    },
    {
      name: "forward",
      description: "instruct the bot to look straight ahead",
      usage: 'look forward',
      // Optional single arg: if provided, show that key; else show all
      argsSchema: z.union([
        z.tuple([]),                 // no args
      ]),
      handler: async (ctx) => {
        const moveVector: Vec3 = {
          x: 0,
          y: 0,
          z: 0
        };
        const lookVector: LookVector = {
          pitch: botConfig.look.forwardPitch,
          yaw: 0,
          head_yaw: 0
        };
        log({ commandHandler: 'look', lookVector, moveVector })
        move(ctx.client, gameState, moveVector, lookVector);
      },
    },
  ],
  defaultChild: "forward",
};

export default rootDef;

