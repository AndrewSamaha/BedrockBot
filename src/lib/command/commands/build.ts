import { z } from 'zod';

import type { CommandNodeDef } from '../command-tree';

import { botConfig } from '@/config/bot';
import { gameState } from '@/lib/GameState';
import { log } from '@/lib/log';
import { fill } from '@/lib/serverCommands/index';
import type { LookVector, Vec3 } from "@/lib/types";
import type { Voxel, Face } from './build/types';
import { build } from './build/utils';
import buildKeep from './build/structures/keep';

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
        const height = 10;
        const addLadder = true;
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
          fill(ctx.client, blockPos, blockPos, 'dirt');
          if (addLadder) {
            const ladderPos: Vec3 = {
              ...blockPos,
              z: blockPos.z - 1,
            };
            fill(ctx.client, ladderPos, ladderPos, 'ladder ["facing_direction"=2]');
          }
        }
      },
    },{
      name: "keep",
      description: "a keep",
      usage: 'build keep',
      argsSchema: z.union([
        z.tuple([]),                 // no args
      ]),
      handler: async (ctx) => {
        const basePosition: Vec3 = {
          x: Math.floor(gameState.playerPosition.x)+1,
          y: Math.floor(gameState.playerPosition.y)-1,
          z: Math.floor(gameState.playerPosition.z)
        };
        build(ctx.client, buildKeep, basePosition);
        log({ commandHandler: 'build', subcommand: 'keep' });
      },
    },

 ],
  defaultChild: "spike",
};

export default rootDef;

