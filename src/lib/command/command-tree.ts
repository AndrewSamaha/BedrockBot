
// command-tree.ts
import { type Client } from 'bedrock-protocol';
import { z } from "zod";

// Context you pass in (who sent it, permissions, reply fn, etc.)
export type CommandContext = {
  userId: string;
  roles: string[];
  client: Client;
  packet: any;
  reply: (msg: string) => Promise<void> | void;
};

// Guards run before entering a node or before executing its handler.
export type Guard = (ctx: CommandContext) => Promise<boolean | string> | boolean | string;

// Handler receives parsed args per node's argsSchema.
export type Handler<TArgs = unknown> =
  (ctx: CommandContext, args: TArgs) => Promise<void> | void;

export type CommandNodeDef<TArgs = unknown> = {
  name: string;
  aliases?: string[];
  description?: string;
  usage?: string;               // e.g. "config update <key> <value>"
  guards?: Guard[];             // auth checks
  argsSchema?: z.ZodType<TArgs>;
  handler?: Handler<TArgs>;
  children?: CommandNodeDef<any>[];
  defaultChild?: string;        // if user stops early, continue into this child
};

export class CommandNode<TArgs = unknown> {
  name: string;
  aliases: Set<string>;
  description?: string;
  usage?: string;
  guards: Guard[];
  argsSchema?: z.ZodType<TArgs>;
  handler?: Handler<TArgs>;
  children: Map<string, CommandNode<any>>;
  defaultChild?: string;

  constructor(def: CommandNodeDef<TArgs>) {
    this.name = def.name;
    this.aliases = new Set([def.name, ...(def.aliases ?? [])].map(s => s && s.toLowerCase()));
    this.description = def.description;
    this.usage = def.usage;
    this.guards = def.guards ?? [];
    this.argsSchema = def.argsSchema;
    this.handler = def.handler;
    this.children = new Map();
    if (def.children) {
      for (const child of def.children) {
        const node = new CommandNode(child);
        for (const a of node.aliases) this.children.set(a, node);
      }
    }
    this.defaultChild = def.defaultChild;
  }

  findChild(token: string): CommandNode<any> | undefined {
    return this.children.get(token.toLowerCase());
  }
}

export class CommandRouter {
  root: CommandNode;

  constructor(rootDef: CommandNodeDef) {
    this.root = new CommandNode(rootDef);
    this.addBuiltinCommands();
  }

  // NEW: DFS to collect all runnable command paths (skip aliases dupes)
  private listAllRunnableCommands(): { path: string; usage?: string; description?: string }[] {
    const results: { path: string; usage?: string; description?: string }[] = [];

    const visit = (node: CommandNode, trail: string[]) => {
      // If this node has a handler, record it (ignore the artificial "root" in trail[0])
      if (node.handler && trail.length > 0) {
        const path = trail.join(" ");
        results.push({ path, usage: node.usage, description: node.description });
      }
      // Recurse unique children by canonical name (avoid alias duplicates)
      const uniqueKids = [...node.children.values()]
        .filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
      for (const child of uniqueKids) {
        visit(child, [...trail, child.name]);
      }
    };

    // Start at each top-level child (skip artificial root token)
    const tops = [...this.root.children.values()]
      .filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);

    for (const top of tops) visit(top, [top.name]);
    // Sort nicely
    results.sort((a,b)=>a.path.localeCompare(b.path));
    return results;
  }

  // NEW: inject a root-level "commands" leaf that prints everything
  private addBuiltinCommands() {
    const name = "commands";
    // don't override if user already defined one
    if ([...this.root.children.values()].some(n => n.name === name)) return;

    const node = new CommandNode({
      name,
      description: "List all available commands (including subcommands).",
      usage: "commands",
      handler: async (ctx) => {
        const all = this.listAllRunnableCommands();
        if (all.length === 0) {
          await ctx.reply("(no commands registered)");
          return;
        }
        const lines = all.map(c =>
          c.usage
            ? `- ${c.path} — ${c.usage}${c.description ? `\n    ${c.description}` : ""}`
            : `- ${c.path}${c.description ? ` — ${c.description}` : ""}`
        );
        await ctx.reply(lines.join("\n"));
      },
    });

    // register under root for name + aliases (only name here)
    this.root.children.set(name, node);
  }
  // Tokenize allowing quotes:  hello "some words" -> ["hello","some words"]
  tokenize(input: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (!inQuotes && /\s/.test(ch)) {
        if (cur) { out.push(cur); cur = ""; }
      } else {
        cur += ch;
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  async runGuards(node: CommandNode, ctx: CommandContext): Promise<string | null> {
    for (const g of node.guards) {
      const ok = await g(ctx);
      if (ok !== true) return typeof ok === "string" ? ok : "Permission denied.";
    }
    return null;
  }

  // Walk the tree with tokens; when no child matches, the remainder are args for the current node.
  async execute(input: string, ctx: CommandContext): Promise<void> {
    const tokens = this.tokenize(input);
    if (tokens.length === 0) return;

    // First token must match a child of root (top-level command)
    let idx = 0;
    let node = this.root.findChild(tokens[idx++]);
    if (!node) {
      await ctx.reply(this.suggest(tokens[0]));
      return;
    }

    // Descend while we have matching children
    while (idx < tokens.length) {
      const next = node.findChild(tokens[idx]);
      if (!next) break;
      // guard before entering child
      const err = await this.runGuards(next, ctx);
      if (err) { await ctx.reply(err); return; }
      node = next;
      idx++;
    }

    // If no handler and defaultChild exists, continue into default
    if (!node.handler && node.defaultChild) {
      const def = node.findChild(node.defaultChild);
      if (def) node = def;
    }

    // If we still don't have a handler, show help for this node
    if (!node.handler) {
      await ctx.reply(this.helpFor(node));
      return;
    }

    // Validate args if schema provided
    const argTokens = tokens.slice(idx);
    let parsed: unknown = argTokens;
    if (node.argsSchema) {
      // Allow schemas to parse from token arrays
      const res = node.argsSchema.safeParse(argTokens);
      if (!res.success) {
        await ctx.reply(`Invalid arguments.\n${res.error.issues.map(i => `- ${i.message}`).join("\n")}\nUsage: ${node.usage ?? ""}`);
        return;
      }
      parsed = res.data;
    }

    // Run node guards (again) before executing
    const err2 = await this.runGuards(node, ctx);
    if (err2) { await ctx.reply(err2); return; }

    await node.handler!(ctx, parsed as any);
  }

  // Build a friendly “did you mean” for top-level commands
  suggest(token: string): string {
    const tops = [...this.root.children.values()]
      .filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i)
      .map(n => n.name)
      .sort();
    return `Unknown command "${token}". Try one of: ${tops.join(", ")}`;
  }

  helpFor(node: CommandNode): string {
    const lines: string[] = [];
    lines.push(node.description ? `# ${node.name}\n${node.description}` : `# ${node.name}`);
    if (node.usage) lines.push(`Usage: ${node.usage}`);
    const uniqueKids = [...node.children.values()]
      .filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
    if (uniqueKids.length) {
      lines.push("Subcommands:");
      for (const c of uniqueKids) {
        lines.push(`  - ${c.name}${c.description ? `: ${c.description}` : ""}`);
      }
    }
    return lines.join("\n");
  }
}
