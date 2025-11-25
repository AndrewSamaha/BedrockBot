# BedrockBot

A TypeScript Minecraft Bedrock Edition bot built with `bedrock-protocol`.

## Features

- Real-time Minecraft Bedrock protocol communication
- GameState management and tracking
- Command system with chat integration
- LangChain-based conversation management
- **Real-time 3D visualization** of bot gamestate in browser

## Quick Start

### Prerequisites

- Node.js (version specified in `.nvmrc`)
- pnpm package manager

### Installation

```bash
# Install dependencies
pnpm install

# Activate Node version (if using fnm)
fnm use
```

### Configuration

Create a `.env` file:

```env
BEDROCK_HOST=localhost
BEDROCK_PORT=19132
BEDROCK_USERNAME=YourBotName
ADMIN_XUIDS=your,xuid,here
WEBSOCKET_PORT=8080
```

### Running the Bot

```bash
# Development mode
pnpm dev

# Development with auto-stop after 30 seconds
pnpm dev:autostop

# Build
pnpm build

# Run compiled version
pnpm start
```

## Visualization

The bot includes a real-time 3D visualization of its gamestate. To use it:

1. **Start the bot**:
   ```bash
   pnpm dev
   ```

2. **Serve the visualization** (in another terminal):
   ```bash
   pnpm serve:vis
   ```

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

The visualization shows:
- Player position and rotation in 3D
- Real-time gamestate updates
- Interactive camera controls (pan, zoom, rotate)
- Follow mode to track the bot

See `docs/visualization-implementation.md` for detailed documentation.

## Development

### Scripts

- `pnpm dev` - Run in development mode
- `pnpm dev:watch` - Run with file watching
- `pnpm dev:autostop` - Run with 30s timeout
- `pnpm build` - Build for production
- `pnpm start` - Run compiled version
- `pnpm test` - Run tests
- `pnpm lint` - Lint code
- `pnpm lint:fix` - Fix linting issues
- `pnpm format` - Check formatting
- `pnpm format:write` - Format code
- `pnpm clean` - Remove dist directory
- `pnpm serve:vis` - Serve visualization HTML

### Project Structure

```
src/
  lib/
    client/          # Minecraft protocol handlers
    command/         # Command system
    chat/            # Chat integration
    websocket/        # WebSocket server for visualization
    GameState.ts      # GameState singleton
  config/             # Configuration
  index.ts            # Entry point
public/
  index.html          # Visualization client
docs/                 # Documentation
```

## Documentation

- `docs/visualization-implementation.md` - Visualization system architecture
- `docs/websocket-visualization.md` - WebSocket usage guide
- `docs/websocket-troubleshooting.md` - Troubleshooting guide
- `docs/minecraft-protocols/` - Minecraft protocol documentation

## License

ISC
