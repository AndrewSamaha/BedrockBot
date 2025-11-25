# GameState Visualization Implementation

This document describes the real-time 3D visualization system for the BedrockBot gamestate.

## Overview

The visualization system allows you to observe the bot's gamestate in real-time through a browser-based 3D interface. It uses WebSocket for real-time updates and Three.js for 3D rendering.

## Architecture

### Components

1. **WebSocket Server** (`src/lib/websocket/server.ts`)
   - Broadcasts gamestate updates to connected clients
   - Throttled to ~20fps (50ms intervals) to minimize overhead
   - Zero overhead when no clients are connected

2. **GameState Integration** (`src/lib/GameState.ts`)
   - Broadcasting integrated into key update methods
   - Automatic updates on position, rotation, time, and spawn events

3. **Browser Client** (`public/index.html`)
   - Three.js-based 3D visualization
   - OrbitControls for camera manipulation
   - Real-time UI updates showing all gamestate data

### Data Flow

```
GameState Updates → broadcastUpdate() → WebSocket Server → Browser Clients → Three.js Rendering
```

## WebSocket Protocol

### Connection

- **Default Port**: 8080 (configurable via `WEBSOCKET_PORT` env var)
- **Protocol**: `ws://localhost:8080` (or `wss://` for HTTPS)

### Message Format

Each WebSocket message is a JSON object with the following structure:

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

### Connection Behavior

- On connection, clients immediately receive the last known gamestate snapshot
- Updates are broadcast whenever gamestate changes
- Updates are throttled to prevent excessive CPU usage

## Three.js Visualization

### Scene Setup

- **Background**: Dark (#0a0a0a)
- **Fog**: Enabled for depth perception
- **Lighting**: Ambient + directional light with shadows
- **Grid**: 200×200 unit grid helper
- **Axes**: Helper showing X/Y/Z orientation

### Player Representation

- **Body**: Green box (0.6×1.8×0.6 blocks) representing player dimensions
- **Direction**: Arrow cone showing yaw rotation
- **Label**: Sprite text "Player" above head
- **Shadow**: Circular shadow plane beneath player

### Camera Controls

The visualization uses Three.js OrbitControls:

- **Left Click + Drag**: Rotate around target
- **Right Click + Drag**: Pan camera
- **Scroll Wheel**: Zoom in/out
- **Middle Click + Drag**: Pan camera

**UI Controls:**
- **Follow Player**: Checkbox to enable camera following
- **Reset Camera**: Button to return to default view

### Coordinate System

- **Minecraft Yaw**: 0° = South, 90° = West, 180° = North, 270° = East
- **Three.js**: Converts Minecraft coordinates to Three.js coordinate system
- **Player Rotation**: Yaw controls Y-axis rotation, pitch controls head rotation

## Performance Considerations

### Server-Side

- **Throttling**: Updates limited to 50ms intervals (~20fps)
- **Conditional Broadcasting**: No serialization when no clients connected
- **BigInt Handling**: Custom JSON replacer converts BigInt to strings

### Client-Side

- **RequestAnimationFrame**: Smooth 60fps rendering loop
- **Efficient Updates**: Only updates player mesh position/rotation, not recreation
- **CDN Loading**: Three.js loaded from CDN (no build step required)

## File Structure

```
src/
  lib/
    websocket/
      server.ts          # WebSocket server implementation
    GameState.ts         # GameState with broadcasting integration
public/
  index.html             # Browser visualization client
scripts/
  serve-visualization.js  # Simple HTTP server for serving HTML
docs/
  visualization-implementation.md  # This file
  websocket-visualization.md        # Usage guide
  websocket-troubleshooting.md      # Troubleshooting guide
```

## Usage

### Starting the Visualization

1. **Start the bot**:
   ```bash
   pnpm dev
   ```
   Look for: `✅ WebSocket server started on port 8080`

2. **Serve the HTML file**:
   ```bash
   pnpm serve:vis
   ```
   Or open `public/index.html` directly in your browser

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

### Configuration

Set WebSocket port via environment variable:

```bash
WEBSOCKET_PORT=3001 pnpm dev
```

Or add to `.env`:
```
WEBSOCKET_PORT=3001
```

## Extending the Visualization

### Adding New GameState Fields

1. Update `GameStateSnapshot` interface in `src/lib/websocket/server.ts`
2. Add field to snapshot creation in `broadcast()` method
3. Update UI in `public/index.html` to display the new field

### Adding 3D Elements

To add new 3D objects to the scene:

```javascript
// In render3D() function
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);
```

### Adding Chunk Visualization

The bot already parses chunks in `src/lib/client/handlers/level_chunk.ts`. To visualize:

1. Broadcast chunk data via WebSocket (extend `GameStateSnapshot`)
2. Create Three.js meshes for blocks in `render3D()`
3. Use instanced rendering for performance with many blocks

### Custom Camera Modes

Add new camera modes by extending the controls:

```javascript
// Example: First-person view
function setFirstPersonMode() {
  camera.position.copy(playerMesh.position);
  camera.position.y += 1.6; // Eye height
  camera.rotation.copy(playerMesh.rotation);
}
```

## Troubleshooting

See `docs/websocket-troubleshooting.md` for common issues and solutions.

## Future Enhancements

Potential improvements:

- [ ] Chunk/block visualization
- [ ] Entity rendering (other players, mobs)
- [ ] Path visualization (show bot's movement history)
- [ ] Mini-map overlay
- [ ] Performance metrics overlay
- [ ] Export/import camera positions
- [ ] Multiple camera views (split screen)
- [ ] VR support via WebXR

## Technical Details

### BigInt Serialization

Minecraft protocol uses BigInt for tick values. The system handles this by:

1. Converting `currentTick` to string in snapshot creation
2. Using JSON.stringify replacer for any remaining BigInt values
3. Client receives as string, can parse if needed

### Coordinate Conversion

Minecraft uses a different coordinate system than Three.js:

- **Minecraft**: X (east/west), Y (up/down), Z (north/south)
- **Three.js**: X (right), Y (up), Z (toward camera)

Conversion handled in `render3D()` function with yaw rotation adjustment.

### Update Frequency

- **Server broadcasts**: Throttled to 50ms (~20fps)
- **Client rendering**: 60fps via requestAnimationFrame
- **UI updates**: On every WebSocket message

This ensures smooth visualization without overwhelming the server or network.
