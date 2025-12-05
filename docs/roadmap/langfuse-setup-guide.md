# Langfuse Setup Guide

Quick setup guide for Langfuse observability with LangChain callbacks.

## What's Included

The LangChain callback integration automatically tracks:
- ✅ **LLM Calls**: Input messages, outputs, token usage, latency
- ✅ **Tool Calls**: Tool names, arguments, results, execution time
- ✅ **Errors**: LLM and tool execution errors with context
- ✅ **Metadata**: Model configuration, temperature, max tokens

## Setup Steps

### 1. Get Langfuse Credentials

Sign up at [langfuse.com](https://langfuse.com) and get:
- **Public Key** (`pk-...`)
- **Secret Key** (`sk-...`)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Langfuse Configuration
LANGFUSE_SECRET_KEY=sk-your-secret-key-here
LANGFUSE_PUBLIC_KEY=pk-your-public-key-here
LANGFUSE_BASE_URL=https://cloud.langfuse.com  # or your self-hosted URL
LANGFUSE_ENABLED=true  # Set to false to disable
```

### 3. Restart the Bot

The integration is automatic - just restart your bot:

```bash
pnpm dev
```

## What You'll See in Langfuse

### Traces
Each user message creates a trace showing:
- User input message
- Agent processing flow
- LLM calls and responses
- Tool executions
- Final response

### LLM Generations
For each LLM call, you'll see:
- **Input**: System prompt + conversation history
- **Output**: AI response content
- **Model**: gpt-5-mini (or configured model)
- **Tokens**: Input/output token counts
- **Latency**: Response time
- **Parameters**: Temperature, max tokens

### Tool Calls
For each tool execution:
- **Tool Name**: e.g., `get_nearby_players`, `teleport`
- **Arguments**: Input parameters
- **Result**: Tool output (truncated if large)
- **Duration**: Execution time
- **Status**: Success or error

## Viewing Traces

1. Go to [langfuse.com](https://langfuse.com) (or your self-hosted instance)
2. Navigate to **Traces** in the sidebar
3. See all agent interactions in real-time
4. Click on any trace to see detailed breakdown

## Debugging

### Check if Langfuse is Enabled

Look for this log message on bot startup:
```json
{
  "langfuse": "initialized",
  "baseUrl": "https://cloud.langfuse.com"
}
```

### If Langfuse is Disabled

You'll see:
```json
{
  "langfuse": "disabled",
  "reason": "LANGFUSE_ENABLED is not true"
}
```

or

```json
{
  "langfuse": "disabled",
  "reason": "Missing LANGFUSE_SECRET_KEY or LANGFUSE_PUBLIC_KEY"
}
```

### Common Issues

1. **No traces appearing**:
   - Check `LANGFUSE_ENABLED=true` in `.env`
   - Verify credentials are correct
   - Check bot logs for initialization errors

2. **"Missing keys" error**:
   - Ensure both `LANGFUSE_SECRET_KEY` and `LANGFUSE_PUBLIC_KEY` are set
   - Keys should start with `sk-` and `pk-` respectively

3. **Connection errors**:
   - Check `LANGFUSE_BASE_URL` is correct
   - Verify network connectivity
   - For self-hosted: ensure URL is accessible

## Disabling Langfuse

Set in `.env`:
```env
LANGFUSE_ENABLED=false
```

The agent will continue to work normally without observability.

## Next Steps

Once basic tracing is working, you can:
- Add custom metadata to traces
- Set up alerts for errors
- Create dashboards for metrics
- Track specific user interactions

See `docs/roadmap/langfuse-integration-plan.md` for advanced features.
