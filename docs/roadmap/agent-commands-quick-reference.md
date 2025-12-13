# Agent Commands Quick Reference

Quick reference for testing the agent with example commands.

## Setup Commands

```bash
# Start bot (development)
pnpm dev

# Start bot with auto-stop (30 seconds)
pnpm dev:autostop

# Start visualization (separate terminal)
pnpm serve:vis
```

## Basic Query Commands

| Command | What It Does | Tool Used |
|---------|-------------|-----------|
| `Where are you?` | Gets bot's current position | `get_player_position` |
| `What's your position?` | Gets bot's current position | `get_player_position` |
| `Who is online?` | Lists nearby players | `get_nearby_players` |
| `What's around me?` | Gets nearby players | `get_nearby_players` |
| `What's at coordinates 100 64 200?` | Gets block at location | `get_block_at` |
| `What block is at 50 70 50?` | Gets block info | `get_block_at` |

## Movement Commands

| Command | What It Does | Tool Used |
|---------|-------------|-----------|
| `Move to 100 64 200` | Moves bot to coordinates | `move` |
| `Go to coordinates 50 70 50` | Moves bot to location | `move` |
| `Teleport to 0 64 0` | Instantly teleports bot | `teleport` |
| `TP to 200 100 200` | Teleports bot | `teleport` |
| `Look north` | Changes viewing direction | `look` |
| `Look at coordinates 100 64 200` | Looks toward location | `look` |

## Building Commands

| Command | What It Does | Tool Used |
|---------|-------------|-----------|
| `Build a 5x5x3 platform here` | Builds platform at your location | `fill` |
| `Create a stone platform 10 blocks wide` | Builds stone platform | `fill` |
| `Build a house 10x10x5` | Builds house structure | `fill` |
| `Fill area from 0 64 0 to 10 64 10 with stone` | Fills rectangular area | `fill` |
| `Build a tower 20 blocks high` | Builds vertical tower | `fill` |
| `Create a wall from here to 100 64 200` | Builds wall between points | `fill` |

## Complex Multi-Step Commands

| Command | What It Does | Expected Behavior |
|---------|-------------|-------------------|
| `Go to 100 64 200 and build a house there` | Navigates and builds | Moves → Builds → Verifies |
| `Build a 5x5 platform, then build a tower on top` | Multi-step build | Platform → Tower → Verification |
| `Create a stone house 10x10x5 and verify it's complete` | Builds and verifies | Builds → Checks chunks → Reports |

## Communication Commands

| Command | What It Does | Tool Used |
|---------|-------------|-----------|
| `Say hello everyone` | Sends chat message | `say` |
| `Tell everyone I'm building` | Broadcasts message | `say` |

## Example Test Sequences

### Test 1: Basic Functionality
```
1. "Where are you?"
2. "Move to 100 64 200"
3. "Build a 5x5x3 platform here"
```

### Test 2: Building Verification
```
1. "Build a 10x10x5 stone house here"
2. "Verify the house is complete"
```

### Test 3: Multi-Step Task
```
1. "Go to coordinates 0 64 0"
2. "Build a tower 20 blocks high there"
3. "Tell everyone the tower is done"
```

## What to Look For

### In Console Logs:
- `agentExecutor: process_message_start` - Message received
- `agentExecutor: llm_call` - LLM processing
- `agentExecutor: tool_call` - Tool executing
- `agentExecutor: tool_result` - Tool completed
- `agentExecutor: process_message_complete` - Response ready

### In-Game:
- Bot responds in chat
- Bot moves/teleports
- Blocks appear (for build commands)
- Bot confirms completion

## Troubleshooting Quick Tips

| Issue | Quick Fix |
|-------|-----------|
| Bot doesn't respond | Check connection, wait for spawn |
| No actions performed | Check logs for tool errors |
| Timeout errors | Check server chunk loading |
| Falls back to simple chat | Verify agent executor initialized |

## Tips for Testing

1. **Start Simple**: Test position queries first
2. **Build Up**: Try movement, then building
3. **Check Logs**: Watch console for tool execution
4. **Be Patient**: Agent may take 5-10 seconds to respond
5. **Verify Results**: Check in-game that actions completed

## Expected Response Times

- **Simple queries**: 2-5 seconds
- **Movement**: 3-7 seconds
- **Building**: 5-15 seconds (depending on structure size)
- **Complex multi-step**: 10-30 seconds
