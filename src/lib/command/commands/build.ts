import { z } from 'zod';

import type { CommandNodeDef } from '../command-tree';

import { botConfig } from '@/config/bot';
import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';
import { fill } from '@/lib/serverCommands/index';
import type { LookVector, Vec3 } from "@/lib/types";

const rootDef: CommandNodeDef = {
  name: 'build',
  description: "Instruct the bot to build something",
  usage: "build <subcommand>",
  guards: [],                 // gate the whole namespace
  children: [
    {
      name: "spike",
      description: "a vertical spike made of a single block type",
      usage: 'build spike',
      // Optional single arg: if provided, show that key; else show all
      argsSchema: z.union([
        z.tuple([]),                 // no args
      ]),
      handler: async (ctx) => {
        const height = 100;
        const basePosition: Vec3 = {
          x: Math.floor(gameState.playerPosition.x)+1,
          y: Math.floor(gameState.playerPosition.y)-1,
          z: Math.floor(gameState.playerPosition.z)
        };
        log({ commandHandler: 'build', basePosition, height });
        for (let y = 0; y <= height; y++) {
          const blockPos: Vec3 = {
            ...basePosition,
            y: basePosition.y + y,
          }
          fill(ctx.client, blockPos, blockPos, 'dirt')
        }
      },
    },
    // {
    //   name: "forward",
    //   description: "instruct the bot to look straight ahead",
    //   usage: 'look forward',
    //   // Optional single arg: if provided, show that key; else show all
    //   argsSchema: z.union([
    //     z.tuple([]),                 // no args
    //   ]),
    //   handler: async (ctx) => {
    //     const moveVector: Vec3 = {
    //       x: 0,
    //       y: 0,
    //       z: 0
    //     };
    //     const lookVector: LookVector = {
    //       pitch: botConfig.look.forwardPitch,
    //       yaw: 0,
    //       head_yaw: 0
    //     };
    //     log({ commandHandler: 'look', lookVector, moveVector })
    //     move(ctx.client, gameState, moveVector, lookVector);
    //   },
    // },
  ],
  defaultChild: "spike",
};

export default rootDef;

