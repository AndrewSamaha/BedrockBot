# Agent Architecture: LangGraph Integration

## Overview

This document outlines the architecture for integrating LangGraph-based agentic capabilities into BedrockBot, enabling LLM-driven tool calling and multi-step decision making while maintaining the existing event-driven bot layer.

## The Challenge

The bot operates in an event-driven, asynchronous environment where:

1. **Two-step operations**: Some world state queries require:
   - Sending a request packet (e.g., `subchunk_request`)
   - Waiting for async response
   - Parsing and updating GameState
   - Making parsed data available to the LLM

2. **Background operations**: The bot layer must continue running independently:
   - Packet handlers update GameState continuously
   - Tic loop runs every 50ms
   - Heartbeat requests subchunks every 5 seconds
   - Position updates happen via event handlers
   - **Cannot block on LLM decisions**

3. **Agent needs**: The LLM agent requires:
   - Current world state for decision making
   - Ability to request specific information (like subchunks)
   - Results of actions to inform next steps
   - Multi-step planning and execution

## Recommended Architecture

### Pattern: Promise/Event Bridge + LangGraph State Snapshots

We will use a **hybrid approach** combining:

1. **Request Manager Pattern**: Coordinates async request/response operations via EventEmitter subscriptions
2. **LangGraph State Integration**: Maintains GameState snapshots in agent state
3. **EventEmitter Pattern**: GameState emits events when world data arrives, RequestManager subscribes and fulfills promises
4. **Separation of Concerns**: Bot layer remains independent, updates GameState via methods that emit events

### Architecture Layers

```
┌─────────────────────────────────────┐
│   Background Bot Layer (existing)   │
│  - Packet handlers                  │
│  - Tic loop                         │
│  - Heartbeat                        │
│  - Updates GameState                │
└──────────────┬──────────────────────┘
               │
               │ Updates GameState
               │ Fulfills requests
               ▼
┌─────────────────────────────────────┐
│   Request Bridge Layer (new)         │
│  - Tracks pending requests           │
│  - Resolves promises                 │
│  - Provides async API                │
└──────────────┬──────────────────────┘
               │
               │ Provides async tools
               ▼
┌─────────────────────────────────────┐
│   LangGraph Agent Layer (new)        │
│  - Reads GameState snapshots         │
│  - Calls tools                       │
│  - Makes decisions                   │
│  - Orchestrates multi-step plans    │
└─────────────────────────────────────┘
```

## Implementation Patterns

### 1. Request Manager Pattern with EventEmitter

A `WorldStateRequestManager` class coordinates async operations using the EventEmitter pattern for decoupled communication:

**Responsibilities**:
- Track pending requests with unique keys
- Create promises for async operations
- Subscribe to GameState events via EventEmitter pattern
- Automatically resolve promises when matching GameState events fire
- Handle timeouts and cleanup
- Provide clean async/await API for tools

**Key Methods**:
- `requestSubchunk(chunkX, chunkY, chunkZ): Promise<BlockData>` - Creates promise and sends request packet
- `requestChunk(chunkX, chunkZ): Promise<ChunkData>` - Creates promise and sends request packet
- `handleSubchunkReceived(coords): void` - Event handler that fulfills matching pending requests
- `handleChunkReceived(coords): void` - Event handler that fulfills matching pending requests

**Event Subscriptions** (set up in constructor):
- Subscribes to `gameState.on('subchunk-received', ...)`
- Subscribes to `gameState.on('chunk-received', ...)`

**Integration Points**:
- GameState emits events when chunks/subchunks are received
- RequestManager subscribes to GameState events via EventEmitter pattern
- RequestManager automatically fulfills matching pending requests when events fire
- Tools call `request*` methods and await promises
- Automatic timeout handling (e.g., 2-5 seconds)

### 2. LangGraph State Integration

**State Structure**:
```typescript
interface AgentState {
  messages: BaseMessage[]           // Conversation history
  gameState: GameStateSnapshot       // Read-only snapshot of current state
  pendingRequests: Map<string, RequestStatus>  // Track async operations
  // ... other agent-specific state
}
```

**State Updates**:
- GameState snapshot refreshed periodically (e.g., before each LLM call)
- Snapshot includes: position, rotation, chunks, players, etc.
- Tools read from snapshot, not directly from GameState
- Background updates don't block agent execution

### 3. Tool Implementation Pattern

**Tool Structure**:
```typescript
// Example: Subchunk data tool
async function getSubchunkData(chunkX: number, chunkY: number, chunkZ: number) {
  // 1. Check if data already available
  const alreadyReceived = gameState.receivedSubChunks.some(
    ([x, y, z]) => x === chunkX && y === chunkY && z === chunkZ
  );
  
  if (alreadyReceived) {
    // Return immediately from GameState
    return gameState.world.getAllBlocksInSubchunk(
      chunkX, chunkY, chunkZ, gameState.registry
    );
  }
  
  // 2. Request and wait (with timeout)
  try {
    return await requestManager.requestSubchunk(chunkX, chunkY, chunkZ);
  } catch (error) {
    // Handle timeout or network error
    return { error: 'Failed to retrieve subchunk data', details: error.message };
  }
}
```

**Tool Categories**:
- **World State Queries**: `getSubchunkData`, `getChunkData`, `getPlayerPosition`, `getNearbyPlayers`
- **Actions**: `move`, `teleport`, `build`, `look`, `sleep`
- **Information**: `queryWorldState`, `getBlockAt`, `getPlayersInArea`

## Practical Implementation Plan

### Phase 1: Request Manager Foundation ✅ COMPLETE

**Status**: Implemented and tested

1. **Create `WorldStateRequestManager` class** ✅
   - ✅ Implemented request tracking with Map
   - ✅ Added timeout handling (5 seconds default, configurable)
   - ✅ Added cleanup for stale requests (every 30 seconds)
   - ✅ Log request/response pairs for debugging
   - **Location**: `src/lib/agent/WorldStateRequestManager.ts`
   - **Tests**: `src/lib/agent/WorldStateRequestManager.test.ts` (18 tests)

2. **Add EventEmitter support to GameState** ✅
   - ✅ Made GameState extend EventEmitter
   - ✅ Added `addReceivedSubchunk(x, y, z)` method that:
     - Updates the `receivedSubChunks` array
     - Emits `'subchunk-received'` event with coordinates `{ x, y, z }`
   - ✅ Added `addReceivedChunk(x, z)` method that:
     - Emits `'chunk-received'` event with coordinates `{ x, z }`
   - ✅ Modified packet handlers:
     - `src/lib/client/handlers/chunks/subchunk.ts` calls `gameState.addReceivedSubchunk()`
     - `src/lib/client/handlers/chunks/level_chunk.ts` calls `gameState.addReceivedChunk()`

3. **Set up RequestManager event subscriptions** ✅
   - ✅ RequestManager initialized in GameState constructor
   - ✅ Subscribes to GameState events in RequestManager constructor:
     - `gameState.on('subchunk-received', ...)`
     - `gameState.on('chunk-received', ...)`
   - ✅ Implemented `handleSubchunkReceived()` and `handleChunkReceived()` methods
   - ✅ RequestManager accessible via `gameState.worldStateRequestManager`

**Implementation Notes**:
- EventEmitter pattern chosen for decoupling - handlers don't need to know about RequestManager
- RequestManager automatically fulfills promises when matching events fire
- Default timeout: 5 seconds (configurable via constructor)
- Cleanup interval: 30 seconds (cleans requests older than 2x timeout)

### Phase 2: LangGraph Integration ✅ COMPLETE

**Status**: Implemented and tested

1. **Define AgentState interface** ✅
   - ✅ Defined in `src/lib/agent/types.ts`
   - ✅ Includes GameState snapshot type
   - ✅ Includes message history (BaseMessage[])
   - ✅ Includes pending requests tracking (Map<string, RequestStatus>)
   - ✅ Includes lastUpdate timestamp

2. **Create state snapshot utility** ✅
   - ✅ Function `createGameStateSnapshot()` in `src/lib/agent/snapshot.ts`
   - ✅ Includes relevant fields: position, rotation, chunks, players, game time, etc.
   - ✅ Handles BigInt serialization (currentTick → string)
   - ✅ Safely handles missing data (try/catch for chunk operations)
   - ✅ Reuses existing `GameStateSnapshot` interface from websocket server
   - **Tests**: `src/lib/agent/snapshot.test.ts` (13 tests)

3. **Set up LangGraph state graph** ✅
   - ✅ Defined state schema with channels (messages, gameState, pendingRequests, lastUpdate)
   - ✅ Created helper functions: `createInitialAgentState()`, `updateGameStateSnapshot()`, `addMessage()`, `addMessages()`
   - ✅ Set up basic graph structure with placeholder nodes
   - ✅ Optional checkpointing support (via `checkpointSaver` parameter)
   - **Location**: `src/lib/agent/graph.ts`
   - **Tests**: `src/lib/agent/graph.test.ts` (19 tests)

**Implementation Notes**:
- State snapshots complement EventEmitter pattern (snapshots for reading, EventEmitter for async requests)
- Graph uses placeholder nodes ready for Phase 4 implementation
- Checkpointing is optional - graph compiles with or without it

### Phase 3: Tool Development ✅ COMPLETE

**Status**: Implemented and tested

1. **Convert existing commands to LangChain Tools** ✅
   - ✅ Wrapped existing command handlers
   - ✅ Defined Zod schemas for all parameters
   - ✅ Added descriptive tool descriptions for LLM
   - ✅ All tools return JSON.stringify() responses

2. **Create world state query tools** ✅
   - ✅ `getPlayerPosition` - Returns bot position and rotation
   - ✅ `getNearbyPlayers` - Lists players with optional distance filtering
   - ✅ `getSubchunkData` - Uses RequestManager for async subchunk data
   - ✅ `getChunkData` - Uses RequestManager for async chunk data
   - ✅ `getBlockAt` - Gets block info at coordinates (requires loaded chunk)
   - ✅ `getGameStateSummary` - Returns overall game state summary
   - **Location**: `src/lib/agent/tools/worldState/` (each tool in separate file)
   - **Tests**: 6 test files, 30 tests total

3. **Create action tools** ✅
   - ✅ `move` - Moves bot towards target position with optional yaw/pitch
   - ✅ `teleport` - Instantly teleports bot (coordinates or player name)
   - ✅ `look` - Changes viewing direction (yaw/pitch or preset directions)
   - ✅ `fill` - Fills rectangular region with blocks
   - ✅ `say` - Sends chat message to all players
   - **Location**: `src/lib/agent/tools/actions/` (each tool in separate file)
   - **Tests**: 5 test files, 31 tests total

**Implementation Notes**:
- **Tool organization**: Each tool factory in its own file within `worldState/` or `actions/` subdirectories
- **Entry point**: `tools/index.ts` exports `createAllTools()` function
- **Error handling**: All tools return JSON with error field on failure
- **Response size limits**: `getSubchunkData` limits to 100 blocks for response size
- **Tool naming**: Uses snake_case for tool names (LangChain convention)
- **Total**: 11 tools (6 query, 5 action), 61 tests passing

### Phase 4: Agent Orchestration 🔄 IN PROGRESS

**Status**: Ready to implement

1. **Set up LangGraph workflow**
   - Implement actual nodes (currently placeholders):
     - `update_state` - Update gameState snapshot before LLM calls
     - `llm_call` - Call LLM with tools bound
     - `execute_tools` - Execute tool calls from LLM
   - Use Supervisor pattern for multi-agent coordination (if needed)
   - Or use simple agent executor for single-agent flow
   - Define edges: START → update_state → llm_call → execute_tools → END

2. **Integrate with chat pipeline**
   - Replace or extend existing `ConversationManager`
   - Route agent-capable conversations to LangGraph
   - Maintain backward compatibility with simple chat
   - Bind tools to LLM model using `createAllTools()`

3. **Add error handling**
   - Tool timeout handling (already in RequestManager)
   - Network error recovery
   - Invalid input handling
   - Graceful degradation

**Implementation Notes**:
- Graph structure already set up in `src/lib/agent/graph.ts`
- Tools ready to bind via `createAllTools(client, gameState, username)`
- Need to implement actual node logic (currently placeholders)
- Consider using LangGraph's built-in tool calling support

## Key Design Principles

### 1. Separation of Concerns

- **Bot Layer**: Handles all packet I/O, updates GameState via methods (emits events), runs independently
- **Request Bridge**: Subscribes to GameState events, coordinates async operations, provides promise-based API
- **Agent Layer**: Reads state, calls tools, makes decisions

### 2. Non-Blocking Operations

- Bot layer never waits on LLM decisions
- Tools use async/await with timeouts
- Background operations continue independently
- Agent reads snapshots, doesn't lock GameState

### 3. State Consistency

- GameState snapshots may be slightly stale (acceptable)
- Tools check for immediate availability before requesting
- Clear error messages when data unavailable
- LLM can retry or choose alternatives

### 4. Error Handling

- All async tools have timeouts
- Clear error messages returned to LLM
- Request manager cleans up stale requests
- Graceful degradation when operations fail

## Example Flow: Requesting Subchunk Data

```
1. LLM decides it needs block data at chunk (5, 2, 5)
   → Calls tool: getSubchunkData(5, 2, 5)

2. Tool checks if data already available
   → Checks gameState.receivedSubChunks
   → If yes: return immediately

3. If not available:
   → Call requestManager.requestSubchunk(5, 2, 5)
   → RequestManager creates promise, sends packet
   → Tool awaits promise (max 2-5 seconds)

4. Background handler receives subchunk packet
   → Parses data, updates gameState.world
   → Calls gameState.addReceivedSubchunk(5, 2, 5)
   → GameState emits 'subchunk-received' event with coordinates
   → RequestManager's event listener receives event
   → RequestManager checks pending requests, finds match
   → RequestManager retrieves block data from gameState.world
   → RequestManager fulfills promise with data
   → Promise resolves

5. Tool returns data to LLM
   → LLM receives block information
   → Makes next decision based on data
```

## User-Facing Features

### Structure Building Agent Flow

**Feature**: An agent flow that builds structures using the `fill` command and verifies completion by introspecting chunks/subchunks.

**User Experience**:
- User requests: "Build a 10x10x5 stone house at my location"
- Agent plans the structure, executes fill commands, and verifies completion
- Agent reports when structure is finished

**Agent Flow**:

1. **Planning Phase**:
   - Agent receives build request (structure type, dimensions, location, block type)
   - Plans build sequence (e.g., foundation → walls → roof)
   - Determines required chunks/subchunks to monitor

2. **Execution Phase**:
   - Agent moves to build location (if needed)
   - Executes `fill` commands for each section of the structure
   - After each fill command, requests relevant subchunk data

3. **Verification Phase**:
   - Agent requests subchunk data for build area using `getSubchunkData()`
   - Parses block data to verify blocks were placed correctly
   - Compares expected structure vs. actual blocks in world
   - Identifies any missing or incorrect blocks

4. **Completion Detection**:
   - Agent checks all relevant subchunks contain expected blocks
   - Verifies structure matches planned dimensions
   - Reports completion status to user
   - Optionally fixes any discrepancies found

**Required Tools**:
- `fillBlock(blockType, startPos, endPos)` - Execute fill command
- `getSubchunkData(chunkX, chunkY, chunkZ)` - Retrieve block data for verification
- `getBlockAt(x, y, z)` - Check specific block (for spot verification)
- `verifyStructure(expectedBlocks, actualBlocks)` - Compare expected vs actual

**Implementation Considerations**:
- Handle multi-chunk structures (may span multiple chunks/subchunks)
- Request subchunks asynchronously and wait for data
- Retry verification if subchunk data not immediately available
- Handle partial builds (structure spans multiple fill commands)
- Detect and report build failures (blocks not placed)

**Example Flow**:
```
User: "Build a 5x5x3 cobblestone platform here"

Agent:
1. Plans: 5x5x3 platform = 75 blocks
2. Gets current position: (100, 64, 200)
3. Calculates fill bounds: (100,64,200) to (104,66,204)
4. Determines affected chunks: chunk(6,4) subchunks Y=4,5
5. Executes: fillBlock('cobblestone', (100,64,200), (104,66,204))
6. Waits 1 second for server to process
7. Requests: getSubchunkData(6, 4, 4) and getSubchunkData(6, 5, 4)
8. Verifies: All 75 blocks are cobblestone at expected positions
9. Reports: "Platform built successfully at (100,64,200)"
```

**Error Handling**:
- If verification fails, agent can retry fill command
- If subchunk data unavailable, agent waits and retries verification
- If structure partially built, agent identifies missing blocks and fills them
- Reports specific issues to user (e.g., "3 blocks failed to place")

## Dependencies

Already installed:
- `@langchain/core` - Tool definitions and base classes
- `@langchain/openai` - OpenAI integration with tool calling
- `@langchain/langgraph` - Agent workflow orchestration
- `zod` - Tool parameter schemas

No additional dependencies required.

## Future Enhancements

1. **Multi-Agent Coordination**: Use LangGraph Supervisor pattern for specialized agents (navigator, builder, planner)

2. **Plan-and-Execute Pattern**: Agent creates plan first, then executes steps sequentially

3. **Human-in-the-Loop**: Add interrupts for human approval of critical actions

4. **State Persistence**: Use LangGraph checkpoints to persist agent state across restarts

5. **Visualization Integration**: Show agent decisions and tool calls in browser visualization

6. **Advanced Error Recovery**: Retry logic, fallback strategies, learning from failures

## Implementation Status

### Completed Phases

- ✅ **Phase 1**: Request Manager Foundation (18 tests)
- ✅ **Phase 2**: LangGraph Integration (32 tests)
- ✅ **Phase 3**: Tool Development (61 tests)

### Current Phase

- 🔄 **Phase 4**: Agent Orchestration (Ready to implement)

### Test Coverage

- **Total**: 111 tests across all agent components
- **WorldStateRequestManager**: 18 tests
- **Snapshot & Graph utilities**: 32 tests
- **Tools**: 61 tests (30 worldState, 31 actions)

## Implementation Decisions

### EventEmitter Pattern
- **Decision**: Use EventEmitter pattern for async coordination instead of direct handler calls
- **Rationale**: Keeps packet handlers decoupled from RequestManager
- **Implementation**: GameState extends EventEmitter, emits events when chunks/subchunks received
- **Benefit**: Handlers only update GameState, RequestManager automatically reacts

### State Snapshots vs EventEmitter
- **Decision**: Use both patterns - they serve different purposes
- **State Snapshots**: For reading current state (position, players, time, etc.)
- **EventEmitter**: For async request/response coordination (chunks/subchunks)
- **Rationale**: Snapshots provide point-in-time views, EventEmitter handles async operations

### Tool Organization
- **Decision**: Each tool factory in separate file within subdirectories
- **Structure**: `tools/worldState/` and `tools/actions/` subdirectories
- **Rationale**: Better maintainability, easier to find and modify tools
- **Pattern**: Factory functions (`create*Tool()`) that return DynamicStructuredTool instances

### RequestManager Location
- **Decision**: Initialize RequestManager in GameState constructor
- **Access**: Via `gameState.worldStateRequestManager`
- **Rationale**: Single instance, accessible to all tools, lifecycle tied to GameState

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Tools Documentation](https://js.langchain.com/docs/modules/tools/)
- Existing command system: `src/lib/command/`
- GameState implementation: `src/lib/GameState.ts`
- Packet handlers: `src/lib/client/handlers/`
- Agent implementation: `src/lib/agent/`
