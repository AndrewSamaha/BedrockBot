# Langfuse Observability Integration Plan

This document outlines the work required to add comprehensive Langfuse observability to the BedrockBot agent flow for debugging and monitoring.

## Overview

Langfuse provides LLM observability with:
- **Traces**: End-to-end request flows
- **Spans**: Individual operations (LLM calls, tool executions)
- **Generations**: LLM input/output tracking
- **Scores**: Performance metrics
- **Metadata**: Custom context and tags

## Current State

- ✅ Langfuse environment variables already in `.env.example`
- ❌ Langfuse SDK not installed
- ❌ No tracing integration in agent code
- ✅ Existing logging infrastructure (`log.ts`)

## Required Work

### Phase 1: Setup and Installation

#### 1.1 Install Dependencies
```bash
pnpm add langfuse
```

#### 1.2 Update Environment Configuration
**File**: `src/config/env.ts`

Add Langfuse configuration:
```typescript
export const env = {
  // ... existing config
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
  LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  LANGFUSE_ENABLED: process.env.LANGFUSE_ENABLED === 'true', // Opt-in flag
};
```

#### 1.3 Create Langfuse Client Module
**New File**: `src/lib/agent/observability/langfuse.ts`

Create a singleton Langfuse client wrapper:
- Initialize Langfuse client (only if enabled)
- Provide helper functions for creating traces/spans
- Handle errors gracefully (don't break agent if Langfuse fails)

### Phase 2: Core Tracing Integration

#### 2.1 Top-Level Trace: `processMessage()`
**File**: `src/lib/agent/executor.ts`

Wrap the entire `processMessage()` method:
- Create a trace for each user message
- Include metadata:
  - `speakerName`: Who sent the message
  - `message`: Original user message
  - `username`: Bot username
  - `gameState`: Snapshot of current game state
- Track timing
- Capture final response
- Handle errors with error tracking

**Trace Structure**:
```
Trace: "agent_process_message"
  - Input: { speakerName, message, gameState }
  - Output: { response, totalMessages, duration }
  - Metadata: { username, timestamp }
```

#### 2.2 Graph Node Spans

**File**: `src/lib/agent/executor.ts` (in `createGraphWithNodes()`)

Add spans for each graph node:

**a) `update_state` node span**:
- Track GameState snapshot updates
- Include snapshot metadata (position, players, time, etc.)
- Duration tracking

**b) `llm_call` node span**:
- Wrap LLM invocation
- Capture:
  - Input messages (system prompt + conversation)
  - Model name and parameters
  - Response content
  - Tool calls (if any)
  - Token usage (if available)
  - Latency
- Use Langfuse's built-in LangChain integration for automatic tracking

**c) `execute_tools` node span**:
- Track tool execution
- Create sub-spans for each tool call:
  - Tool name
  - Tool arguments
  - Tool result (truncated if large)
  - Execution time
  - Success/error status

**Span Structure**:
```
Span: "llm_call"
  - Input: { messages, model, temperature, maxTokens }
  - Output: { content, tool_calls }
  - Metadata: { responseTime, tokenUsage }

Span: "execute_tools"
  - Child Spans:
    - "tool: get_nearby_players" { args, result, duration }
    - "tool: teleport" { args, result, duration }
```

### Phase 3: Detailed Tool Tracing

#### 3.1 Wrap Tool Executions
**File**: `src/lib/agent/executor.ts` (in `execute_tools` node)

For each tool call:
- Create a span with tool name
- Log input arguments
- Log output (truncate large results)
- Track execution time
- Capture errors

#### 3.2 Tool-Level Integration (Optional)
**Files**: Individual tool files in `src/lib/agent/tools/`

Add optional tracing at tool level:
- Wrap `tool.invoke()` calls
- Track tool-specific metrics
- Add tool-specific metadata

### Phase 4: LangChain Integration

#### 4.1 Use Langfuse Callbacks
**File**: `src/lib/agent/executor.ts`

Langfuse has built-in LangChain callbacks that automatically track:
- LLM calls
- Tool calls
- Token usage
- Latency

Integrate via:
```typescript
import { CallbackHandler } from 'langfuse';

const langfuseHandler = new CallbackHandler({
  secretKey: env.LANGFUSE_SECRET_KEY,
  publicKey: env.LANGFUSE_PUBLIC_KEY,
  baseUrl: env.LANGFUSE_BASE_URL,
});

// Pass to ChatOpenAI
this.chatModel = new ChatOpenAI({
  // ... config
  callbacks: [langfuseHandler],
});
```

This provides automatic tracking of:
- All LLM invocations
- Tool calls and results
- Token usage
- Latency

### Phase 5: Error Tracking and Debugging

#### 5.1 Error Spans
**File**: `src/lib/agent/executor.ts`

Track errors at multiple levels:
- Top-level errors in `processMessage()`
- LLM call errors
- Tool execution errors
- Graph execution errors

Include:
- Error message
- Stack trace
- Context (state, inputs)
- Recovery actions taken

#### 5.2 Debug Metadata
Add rich metadata for debugging:
- GameState snapshots at key points
- Message filtering decisions
- Tool call sequences
- Graph node execution order
- State transitions

### Phase 6: Performance Metrics

#### 6.1 Track Key Metrics
- **Latency**: Total time per message
- **LLM Latency**: Time for LLM calls
- **Tool Latency**: Time for tool executions
- **Token Usage**: Input/output tokens
- **Tool Call Count**: Number of tools called per message
- **Graph Iterations**: Number of graph loops

#### 6.2 Add Scores (Optional)
Track quality metrics:
- Success rate
- Error rate
- Average response time
- Tool usage patterns

## Implementation Details

### File Structure

```
src/lib/agent/
  observability/
    langfuse.ts          # Langfuse client wrapper
    types.ts             # Observability types
  executor.ts            # Modified with tracing
  chatIntegration.ts     # Optional: trace chat integration
```

### Key Integration Points

1. **AgentExecutor.processMessage()** - Top-level trace
2. **Graph nodes** - Individual spans
3. **LLM calls** - Automatic via LangChain callbacks
4. **Tool executions** - Manual spans
5. **Error handling** - Error tracking

### Configuration

**Environment Variables** (add to `.env`):
```env
LANGFUSE_SECRET_KEY=sk-...
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or self-hosted URL
LANGFUSE_ENABLED=true  # Feature flag
```

### Code Changes Summary

**New Files**:
- `src/lib/agent/observability/langfuse.ts` - Langfuse client wrapper
- `src/lib/agent/observability/types.ts` - Type definitions

**Modified Files**:
- `src/config/env.ts` - Add Langfuse config
- `src/lib/agent/executor.ts` - Add tracing throughout
- `package.json` - Add langfuse dependency

**Estimated Changes**:
- ~200-300 lines of new code
- ~100-150 lines of modifications to existing code
- 1 new dependency

## Benefits

### Debugging
- **Full trace visibility**: See entire agent flow from user message to response
- **Tool execution details**: Know exactly what tools were called and why
- **Error context**: See where and why errors occurred
- **State snapshots**: Understand game state at each step

### Monitoring
- **Performance tracking**: Identify slow operations
- **Token usage**: Monitor API costs
- **Success rates**: Track agent reliability
- **Usage patterns**: Understand how agent is used

### Development
- **Iteration tracking**: Compare different prompts/models
- **A/B testing**: Test different configurations
- **Regression detection**: Identify when behavior changes

## Testing Considerations

1. **Graceful degradation**: Agent should work even if Langfuse fails
2. **Performance impact**: Tracing should be minimal overhead
3. **Privacy**: Ensure sensitive data isn't logged
4. **Feature flag**: Allow disabling via env var

## Future Enhancements

1. **Custom dashboards**: Build Langfuse dashboards for specific metrics
2. **Alerting**: Set up alerts for errors or performance issues
3. **Analytics**: Track user interactions and agent behavior patterns
4. **Prompt management**: Use Langfuse for prompt versioning and testing

## Estimated Effort

- **Phase 1 (Setup)**: 1-2 hours
- **Phase 2 (Core Tracing)**: 3-4 hours
- **Phase 3 (Tool Tracing)**: 2-3 hours
- **Phase 4 (LangChain Integration)**: 1-2 hours
- **Phase 5 (Error Tracking)**: 2-3 hours
- **Phase 6 (Metrics)**: 1-2 hours

**Total**: ~10-16 hours

## Priority Order

1. **Phase 1 + Phase 4**: Quick wins with LangChain callbacks (automatic tracking)
2. **Phase 2**: Core tracing for full visibility
3. **Phase 3**: Detailed tool tracing
4. **Phase 5**: Error tracking for debugging
5. **Phase 6**: Performance metrics

## References

- [Langfuse Documentation](https://langfuse.com/docs)
- [LangChain Integration](https://langfuse.com/docs/integrations/langchain)
- [Langfuse TypeScript SDK](https://langfuse.com/docs/sdk/typescript)
