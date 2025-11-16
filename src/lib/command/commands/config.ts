import { z } from 'zod';

import { type CommandNodeDef } from '../command-tree';
import { kvSchema, keySchema, updateSchema } from '../utils';

import { botConfig } from '@/config/bot';

const store = new Map(Object.entries(botConfig.movement));

// src/lib/command/commands/config.ts
const rootDef: CommandNodeDef = {
  name: 'config',
  description: "View and modify bot configuration.",
  usage: "config <subcommand>",
  guards: [],                 // gate the whole namespace
  children: [
    {
      name: "show",
      description: "Show the current configuration or a single key.",
      usage: 'config show [key]',
      // Optional single arg: if provided, show that key; else show all
      argsSchema: z.union([
        z.tuple([]),                 // no args
        z.tuple([z.string()])        // one arg: key
      ]),
      handler: async (ctx, args) => {
        const a = args as [] | [string];
        if (a.length === 0) {
          const entries = [...store.entries()].map(([k,v]) => `${k}=${v}`).join("\n");
          await ctx.reply(entries || "(empty)");
        } else {
          const k = a[0];
          const v = store.get(k);
          await ctx.reply(v !== undefined ? `${k}=${v}` : `No such key: ${k}`);
        }
      },
    },
    {
      name: "add",
      description: "Add a new key/value (fails if key exists).",
      usage: "config add <key> <value>",
      argsSchema: kvSchema,
      handler: async (ctx, [key, value]) => {
        if (store.has(key)) { await ctx.reply(`Key already exists: ${key}`); return; }
        store.set(key, value);
        await ctx.reply(`Added ${key}=${value}`);
      },
    },
    {
      name: "del",
      aliases: ["delete", "rm"],
      description: "Delete a key.",
      usage: "config del <key>",
      argsSchema: keySchema,
      handler: async (ctx, [key]) => {
        const ok = store.delete(key);
        await ctx.reply(ok ? `Deleted ${key}` : `No such key: ${key}`);
      },
    },
    {
      name: "update",
      description: "Update an existing key's value.",
      usage: "config update <key> <value>",
      argsSchema: updateSchema,
      handler: async (ctx, [key, value]) => {
        if (!store.has(key)) { await ctx.reply(`No such key: ${key}`); return; }
        store.set(key, value);
        await ctx.reply(`Updated ${key}=${value}`);
      },
    },
  ],
  defaultChild: "show",
};

export default rootDef;

