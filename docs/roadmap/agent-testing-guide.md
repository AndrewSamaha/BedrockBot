# Agent System Testing Guide

This guide provides step-by-step instructions for testing the LangGraph-based agent system in BedrockBot.

## Prerequisites

1. **Minecraft Bedrock Server**: A running Bedrock Edition server (local or remote)
2. **Node.js**: Version specified in `.nvmrc` (use `fnm use` to activate)
3. **Environment Variables**: `.env` file configured (see below)
4. **OpenAI API Key** (optional but recommended): For better model (`gpt-4o`), otherwise uses `gpt-4.1-nano`

## Setup

### 1. Configure Environment Variables

Create or update your `.env` file:

```env
# Server connection
BEDROCK_HOST=localhost          # Your server IP or hostname
BEDROCK_PORT=19132              # Server port (default 19132)
BEDROCK_USERNAME=AgentBot        # Bot's in-game name

# Optional: Admin XUIDs (for admin features)
ADMIN_XUIDS=your,xuid,here

# OpenAI API (optional but recommended)
OPENAI_API_KEY=sk-...            # Your OpenAI API key for gpt-4o

# Logging (optional)
LOG_PATH=logs/log.json
LOG_MAX_FILES=5
```

### 2. Install Dependencies

```bash
# Activate correct Node version
fnm use

# Install dependencies
pnpm install
```

## Starting the Bot

### Option 1: Development Mode (Recommended for Testing)

```bash
pnpm dev
```

This will:
- Start the bot and connect to the server
- Initialize the agent executor when the bot spawns
- Process chat messages through the agent
- Log all activity to console and `logs/` directory

### Option 2: Development with Auto-Stop

```bash
pnpm dev:autostop
```

Runs for 30 seconds then stops automatically (useful for quick tests).

### Option 3: Production Mode

```bash
pnpm build
pnpm start
```

## Testing the Agent

### Step 1: Connect to Server

1. Start your Minecraft Bedrock server
2. Run `pnpm dev` in the bot directory
3. Wait for connection logs:
   ```
   Connected to server
   Game started
   Agent executor initialized
   ```

### Step 2: Join the Server (as a Player)

1. Join the same server with your Minecraft client
2. Verify the bot is visible in-game (check player list)
3. The bot should be spawned and ready to receive commands

### Step 3: Test Basic Agent Commands

Open in-game chat and try these commands:

#### Simple Queries (No Actions Required)

```
What is your position?
Where are you?
Who else is online?
```

**Expected Behavior**:
- Bot responds with its current position
- Uses `getPlayerPosition` tool internally
- Response includes coordinates

#### Movement Commands

```
Move to coordinates 100 64 200
Go to 50 70 50
Teleport to 0 64 0
```

**Expected Behavior**:
- Bot uses `move` or `teleport` tool
- Bot moves to specified location
- May take a few seconds to arrive

#### Building Commands

```
Build a 5x5x3 platform here
Fill a 10x10 area with stone at my location
Create a cobblestone platform 5 blocks wide and 5 blocks long
```

**Expected Behavior**:
- Bot uses `getPlayerPosition` to find your location
- Bot uses `fill` tool to place blocks
- Bot may verify completion using `getSubchunkData`
- Bot reports when structure is complete

#### Complex Multi-Step Tasks

```
Build a house 10 blocks wide, 10 blocks long, and 5 blocks tall
Create a stone tower 20 blocks high
Build a wall from here to coordinates 100 64 200
```

**Expected Behavior**:
- Bot plans the structure
- Executes multiple `fill` commands
- Verifies blocks were placed correctly
- Reports completion status

### Step 4: Monitor Agent Activity

#### Check Console Logs

Watch the terminal where you ran `pnpm dev` for:

```
agentExecutor: process_message_start
  speakerName: "YourName"
  message: "build a house"

agentExecutor: llm_call
  responseContent: "..."
  toolCalls: 2

agentExecutor: tool_call
  toolName: "get_player_position"
  args: {...}

agentExecutor: tool_result
  toolName: "get_player_position"
  result: "..."

agentExecutor: process_message_complete
  response: "I've built a 10x10x5 stone house..."
  totalMessages: 8
```

#### Check Log Files

Logs are written to `logs/` directory with timestamps:
- Look for `agentExecutor` entries
- Check `tool_call` and `tool_result` entries
- Verify tool execution flow

## Example Test Scenarios

### Scenario 1: Simple Position Query

**Command**: `Where are you?`

**Expected Flow**:
1. Agent receives message
2. Calls `get_player_position` tool
3. Returns position information
4. Responds with coordinates

**Success Criteria**:
- Bot responds within 5-10 seconds
- Response includes valid coordinates
- No errors in logs

### Scenario 2: Building a Platform

**Command**: `Build a 5x5x3 stone platform here`

**Expected Flow**:
1. Agent receives message
2. Calls `get_player_position` to find "here"
3. Calculates fill coordinates
4. Calls `fill` tool with stone blocks
5. Optionally calls `get_subchunk_data` to verify
6. Responds with completion status

**Success Criteria**:
- Platform appears in-game
- Bot confirms completion
- All blocks are stone
- No missing blocks

### Scenario 3: Multi-Step Navigation and Building

**Command**: `Go to coordinates 100 64 200 and build a tower there`

**Expected Flow**:
1. Agent receives message
2. Calls `teleport` or `move` tool
3. Waits for arrival (or checks position)
4. Calls `fill` tool multiple times for tower
5. Verifies structure
6. Reports completion

**Success Criteria**:
- Bot moves to location
- Tower is built correctly
- Bot reports success

## Troubleshooting

### Bot Doesn't Respond

**Check**:
1. Is the bot connected? Look for "Connected to server" in logs
2. Is agent executor initialized? Look for "Agent executor initialized"
3. Check for errors in logs: `agentExecutor: agent_error` or `llm_call_error`

**Solutions**:
- Verify server connection
- Check OpenAI API key (if using gpt-4o)
- Check network connectivity
- Review error messages in logs

### Agent Falls Back to Simple Chat

**Symptoms**:
- Bot responds but doesn't use tools
- Responses are conversational but not actionable

**Check**:
- Look for "fallback: simple_chat" in logs
- Check if agent executor initialized successfully
- Verify GameState has client set

**Solutions**:
- Ensure bot has spawned (wait for "Game started")
- Check `start_game` handler executed successfully
- Verify GameState.client is set

### Tools Not Executing

**Symptoms**:
- Bot responds but doesn't perform actions
- Logs show tool calls but no results

**Check**:
- Look for `tool_call` entries in logs
- Check for `tool_error` entries
- Verify tool execution completed

**Solutions**:
- Check tool arguments are valid
- Verify bot has permissions (for commands like `/fill`)
- Check server allows command execution
- Review tool error messages

### Timeout Errors

**Symptoms**:
- `get_subchunk_data` or `get_chunk_data` times out
- "Failed to retrieve" errors

**Check**:
- Server may not be sending chunk data
- Network latency issues
- RequestManager timeout (default 5 seconds)

**Solutions**:
- Increase timeout in RequestManager (if needed)
- Check server chunk loading
- Verify network connection

## Advanced Testing

### Testing with Visualization

1. Start bot: `pnpm dev`
2. Start visualization server (in another terminal): `pnpm serve:vis`
3. Open browser: `http://localhost:3000`
4. Watch bot position and actions in real-time
5. Send commands and observe bot movement

### Testing Tool Execution Directly

You can test individual tools by examining the logs:
- Each tool call is logged with name and arguments
- Tool results are logged (first 200 chars)
- Errors are logged with details

### Testing Multi-Turn Conversations

The agent maintains conversation context:
1. Send: `Build a house`
2. Send: `Make it bigger`
3. Send: `Add a roof`

The agent should remember previous context and continue the task.

## Success Indicators

✅ **Agent is working correctly if**:
- Bot responds to commands within 5-10 seconds
- Bot performs actions (moves, builds, etc.)
- Logs show tool calls and results
- No error messages in logs
- Bot confirms completion of tasks

❌ **Agent needs attention if**:
- Bot doesn't respond at all
- Bot responds but doesn't act
- Error messages appear in logs
- Tools timeout frequently
- Bot falls back to simple chat

## Next Steps

Once basic testing passes:
1. Try more complex building tasks
2. Test multi-step planning
3. Test error recovery (e.g., invalid coordinates)
4. Test with multiple players
5. Test structure verification (agent checking if blocks were placed)

## Additional Resources

- **Roadmap**: `docs/roadmap/agents.md` - Full architecture documentation
- **Logs**: `logs/` directory - Detailed execution logs
- **Visualization**: `docs/visualization-implementation.md` - 3D visualization guide
