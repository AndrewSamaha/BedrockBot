# WebSocket GameState Visualization

This document describes how to visualize the bot's gamestate in real-time using a browser.

## Overview

The bot exposes its gamestate via a WebSocket server that broadcasts updates whenever the gamestate changes. This allows you to build browser-based visualizations, debug tools, or monitoring dashboards.

## Architecture

- **WebSocket Server**: Runs on port 8080 by default (configurable via `WEBSOCKET_PORT` env var)
- **Broadcasting**: Updates are throttled to ~20fps (50ms intervals) to minimize overhead
- **Zero-overhead when idle**: If no clients are connected, broadcasting is skipped entirely

## Usage

### Starting the Bot

The WebSocket server starts automatically when you run the bot:

```bash
pnpm dev
```

You should see:
```
WebSocket server started on port 8080
```

### Connecting from Browser

1. **Simple HTML Client**: Open `public/index.html` in your browser (you may need to serve it via a local HTTP server)

2. **Custom Client**: Connect to `ws://localhost:8080` (or `wss://` for HTTPS)

### Example JavaScript Client

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onmessage = (event) => {
  const gamestate = JSON.parse(event.data);
  console.log('Position:', gamestate.playerPosition);
  console.log('Game Time:', gamestate.gameTime);
  // ... update your 3D visualization
};
```

## GameState Snapshot Format

Each WebSocket message contains a JSON object with the following structure:

```typescript
interface GameStateSnapshot {
  playerPosition?: { x: number; y: number; z: number };
  pitch?: number;
  yaw?: number;
  headYaw?: number;
  entityId?: number;
  runtimeEntityId?: number;
  spawned: boolean;
  gameTime?: number;
  dayPhase?: string; // 'day' | 'night' | 'sunset' | 'sunrise'
  currentTick?: string; // BigInt serialized as string
  overworldPlayerCount?: number;
  sleepingPlayerCount?: number;
  ableToSleep?: number;
  timestamp: number; // Unix timestamp in milliseconds
}
```

## Performance Considerations

- **Throttling**: Updates are throttled to 50ms intervals (~20fps) to prevent excessive CPU usage
- **Conditional Broadcasting**: If no clients are connected, the broadcast method returns early, avoiding JSON serialization overhead
- **Efficient Updates**: Only broadcasts when gamestate actually changes (position, rotation, time, etc.)

## Integration with 3D Libraries

The example HTML file includes a basic 2D top-down view. You can easily integrate with:

- **Three.js**: Create a 3D scene and update camera/objects based on gamestate
- **Babylon.js**: Similar to Three.js, great for Minecraft-like rendering
- **A-Frame**: WebVR/AR visualization
- **React Three Fiber**: React-based 3D rendering

### Example Three.js Integration

```javascript
import * as THREE from 'three';

const ws = new WebSocket('ws://localhost:8080');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

ws.onmessage = (event) => {
  const state = JSON.parse(event.data);
  if (state.playerPosition) {
    // Update camera position
    camera.position.set(
      state.playerPosition.x,
      state.playerPosition.y + 10,
      state.playerPosition.z + 10
    );
    camera.lookAt(state.playerPosition.x, state.playerPosition.y, state.playerPosition.z);
  }
};
```

## Configuration

Set the WebSocket port via environment variable:

```bash
WEBSOCKET_PORT=3000 pnpm dev
```

Or add to your `.env` file:

```
WEBSOCKET_PORT=3000
```

## Troubleshooting

- **Connection refused**: Make sure the bot is running and the WebSocket server started successfully
- **No updates**: Check that the bot has spawned and is receiving position updates from the server
- **High CPU usage**: Reduce the update frequency by increasing `BROADCAST_THROTTLE_MS` in `GameState.ts`
