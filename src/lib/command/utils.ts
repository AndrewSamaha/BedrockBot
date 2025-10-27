// src/lib/command/utils.ts

import { z } from "zod";
import { CommandNodeDef, CommandRouter, CommandContext } from "./command-tree";

// Simple auth guard examples
export const isAdmin = (ctx: CommandContext) =>
  ctx.roles.includes("admin") || "Admins only.";

// Pretend config store
export const store = new Map<string, string>();

// Arg schemas parse directly from token arrays:
export const kvSchema = z.tuple([ z.string().min(1, "key required"), z.string().min(1, "value required") ]);
export const keySchema = z.tuple([ z.string().min(1, "key required") ]);
export const updateSchema = z.tuple([ z.string(), z.string() ]); // key, value (you can refine types)


