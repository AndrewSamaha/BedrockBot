import { WebSocketServer, type WebSocket } from 'ws';
import type { GameState } from '../GameState.js';

export interface GameStateSnapshot {
  playerPosition?: { x: number; y: number; z: number };
  pitch?: number;
  yaw?: number;
  headYaw?: number;
  entityId?: number;
  runtimeEntityId?: number;
  spawned: boolean;
  gameTime?: number;
  dayPhase?: string;
  currentTick?: string; // Serialized as string since BigInt can't be JSON serialized
  overworldPlayerCount?: number;
  sleepingPlayerCount?: number;
  ableToSleep?: number;
  timestamp: number;
}

class GameStateBroadcaster {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private lastSnapshot: GameStateSnapshot | null = null;

  start(port: number): void {
    if (this.wss) {
      console.log('WebSocket server already running');
      return;
    }

    try {
      this.wss = new WebSocketServer({ port });

      this.wss.on('connection', (ws: WebSocket) => {
        console.log(`WebSocket client connected (${this.clients.size + 1} total)`);
        this.clients.add(ws);

        // Send current state immediately on connection
        if (this.lastSnapshot) {
          try {
            ws.send(JSON.stringify(this.lastSnapshot));
          } catch (error) {
            console.error('Error sending initial snapshot:', error);
          }
        }

        ws.on('close', () => {
          console.log(`WebSocket client disconnected (${this.clients.size - 1} total)`);
          this.clients.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('WebSocket client error:', error);
          this.clients.delete(ws);
        });

        ws.on('message', (message) => {
          // Echo back for debugging if needed
          console.log('Received message from client:', message.toString());
        });
      });

      this.wss.on('error', (error) => {
        console.error('WebSocket server error:', error);
        if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use. Try a different port or stop the other service.`);
        }
      });

      this.wss.on('listening', () => {
        console.log(`✅ WebSocket server started on port ${port}`);
        console.log(`   Connect from browser: ws://localhost:${port}`);
      });

      console.log(`Starting WebSocket server on port ${port}...`);
    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.wss) {
      this.clients.forEach((client) => {
        client.close();
      });
      this.clients.clear();
      this.wss.close();
      this.wss = null;
      console.log('WebSocket server stopped');
    }
  }

  broadcast(gameState: GameState): void {
    if (this.clients.size === 0) {
      return; // No clients connected, skip serialization
    }

    // Helper to safely convert potentially BigInt values
    const safeNumber = (value: unknown): number | undefined => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'bigint') return Number(value);
      if (typeof value === 'number') return value;
      return undefined;
    };

    const snapshot: GameStateSnapshot = {
      playerPosition: gameState.playerPosition
        ? {
            x: gameState.playerPosition.x,
            y: gameState.playerPosition.y,
            z: gameState.playerPosition.z,
          }
        : undefined,
      pitch: gameState.pitch,
      yaw: gameState.yaw,
      headYaw: gameState.headYaw,
      entityId: safeNumber(gameState.entityId),
      runtimeEntityId: safeNumber(gameState.runtimeEntityId),
      spawned: gameState.spawned,
      gameTime: gameState.gameTime,
      dayPhase: gameState.dayPhase,
      currentTick: gameState.currentTick?.toString(),
      overworldPlayerCount: gameState.overworldPlayerCount,
      sleepingPlayerCount: gameState.sleepingPlayerCount,
      ableToSleep: gameState.ableToSleep,
      timestamp: Date.now(),
    };

    this.lastSnapshot = snapshot;

    // Custom replacer to handle BigInt values
    const message = JSON.stringify(snapshot, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    });

    // Broadcast to all connected clients
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const gameStateBroadcaster = new GameStateBroadcaster();
