import type { GameState } from '../GameState.js';
import { log } from '../log.js';

export interface SubchunkCoords {
  x: number;
  y: number;
  z: number;
}

export interface ChunkCoords {
  x: number;
  z: number;
}

export interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
  timeoutId: NodeJS.Timeout;
}

/**
 * Manages async requests for world state data (chunks and subchunks).
 * Coordinates between packet handlers and agent tools using EventEmitter pattern.
 */
export class WorldStateRequestManager {
  private pendingSubchunkRequests = new Map<string, PendingRequest<any>>();
  private pendingChunkRequests = new Map<string, PendingRequest<any>>();
  private readonly defaultTimeoutMs: number;
  private gameState: GameState;

  constructor(gameState: GameState, defaultTimeoutMs: number = 5000) {
    this.gameState = gameState;
    this.defaultTimeoutMs = defaultTimeoutMs;

    // Subscribe to GameState events
    this.setupEventSubscriptions();

    // Set up periodic cleanup of stale requests
    this.startCleanupInterval();
  }

  /**
   * Subscribe to GameState events for subchunk and chunk updates
   */
  private setupEventSubscriptions(): void {
    this.gameState.on('subchunk-received', (coords: SubchunkCoords) => {
      this.handleSubchunkReceived(coords);
    });

    this.gameState.on('chunk-received', (coords: ChunkCoords) => {
      this.handleChunkReceived(coords);
    });
  }

  /**
   * Request subchunk data. Returns a promise that resolves when the subchunk is received.
   * @param chunkX Chunk X coordinate
   * @param chunkY Subchunk Y index
   * @param chunkZ Chunk Z coordinate
   * @returns Promise that resolves with block data array
   */
  async requestSubchunk(
    chunkX: number,
    chunkY: number,
    chunkZ: number
  ): Promise<Array<{ x: number; y: number; z: number }>> {
    const key = this.getSubchunkKey(chunkX, chunkY, chunkZ);

    // Check if already received
    const alreadyReceived = this.gameState.receivedSubChunks.some(
      ([x, y, z]) => x === chunkX && y === chunkY && z === chunkZ
    );

    if (alreadyReceived && this.gameState.registry) {
      // Return immediately if data is available
      const blockData = this.gameState.world.getAllBlocksInSubchunk(
        chunkX,
        chunkY,
        chunkZ,
        this.gameState.registry
      );
      log({
        requestManager: 'subchunk-request-immediate',
        key,
        blockCount: blockData.length,
      });
      return blockData;
    }

    // Check if request already pending
    if (this.pendingSubchunkRequests.has(key)) {
      log({ requestManager: 'subchunk-request-duplicate', key });
      // Return existing promise
      return new Promise((resolve, reject) => {
        const existing = this.pendingSubchunkRequests.get(key);
        if (existing) {
          // Create a new promise that resolves when the existing one resolves
          existing.resolve = (value) => {
            resolve(value);
            existing.resolve = resolve;
          };
        } else {
          reject(new Error('Request state inconsistent'));
        }
      });
    }

    // Create new request
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingSubchunkRequests.delete(key);
        const error = new Error(
          `Subchunk request timeout: (${chunkX}, ${chunkY}, ${chunkZ}) after ${this.defaultTimeoutMs}ms`
        );
        log({ requestManager: 'subchunk-request-timeout', key });
        reject(error);
      }, this.defaultTimeoutMs);

      const request: PendingRequest<Array<{ x: number; y: number; z: number }>> = {
        resolve,
        reject,
        timestamp: Date.now(),
        timeoutId,
      };

      this.pendingSubchunkRequests.set(key, request);
      log({
        requestManager: 'subchunk-request-created',
        key,
        timeoutMs: this.defaultTimeoutMs,
      });
    });
  }

  /**
   * Request chunk data. Returns a promise that resolves when the chunk is received.
   * @param chunkX Chunk X coordinate
   * @param chunkZ Chunk Z coordinate
   * @returns Promise that resolves with ChunkColumn data
   */
  async requestChunk(chunkX: number, chunkZ: number): Promise<any> {
    const key = this.getChunkKey(chunkX, chunkZ);

    // Check if already received
    const chunk = this.gameState.world.getChunk(chunkX, chunkZ);
    if (chunk) {
      log({ requestManager: 'chunk-request-immediate', key });
      return chunk;
    }

    // Check if request already pending
    if (this.pendingChunkRequests.has(key)) {
      log({ requestManager: 'chunk-request-duplicate', key });
      // Return existing promise
      return new Promise((resolve, reject) => {
        const existing = this.pendingChunkRequests.get(key);
        if (existing) {
          existing.resolve = (value) => {
            resolve(value);
            existing.resolve = resolve;
          };
        } else {
          reject(new Error('Request state inconsistent'));
        }
      });
    }

    // Create new request
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingChunkRequests.delete(key);
        const error = new Error(
          `Chunk request timeout: (${chunkX}, ${chunkZ}) after ${this.defaultTimeoutMs}ms`
        );
        log({ requestManager: 'chunk-request-timeout', key });
        reject(error);
      }, this.defaultTimeoutMs);

      const request: PendingRequest<any> = {
        resolve,
        reject,
        timestamp: Date.now(),
        timeoutId,
      };

      this.pendingChunkRequests.set(key, request);
      log({
        requestManager: 'chunk-request-created',
        key,
        timeoutMs: this.defaultTimeoutMs,
      });
    });
  }

  /**
   * Handle subchunk received event from GameState
   */
  private handleSubchunkReceived(coords: SubchunkCoords): void {
    const key = this.getSubchunkKey(coords.x, coords.y, coords.z);
    const request = this.pendingSubchunkRequests.get(key);

    if (!request) {
      // No pending request for this subchunk
      return;
    }

    // Clear timeout
    clearTimeout(request.timeoutId);

    // Retrieve block data from GameState
    if (!this.gameState.registry) {
      request.reject(new Error('Registry not initialized'));
      this.pendingSubchunkRequests.delete(key);
      return;
    }

    try {
      const blockData = this.gameState.world.getAllBlocksInSubchunk(
        coords.x,
        coords.y,
        coords.z,
        this.gameState.registry
      );

      log({
        requestManager: 'subchunk-request-fulfilled',
        key,
        blockCount: blockData.length,
        waitTimeMs: Date.now() - request.timestamp,
      });

      // Fulfill promise
      request.resolve(blockData);
      this.pendingSubchunkRequests.delete(key);
    } catch (error) {
      log({
        requestManager: 'subchunk-request-error',
        key,
        error: (error as Error).message,
      });
      request.reject(error as Error);
      this.pendingSubchunkRequests.delete(key);
    }
  }

  /**
   * Handle chunk received event from GameState
   */
  private handleChunkReceived(coords: ChunkCoords): void {
    const key = this.getChunkKey(coords.x, coords.z);
    const request = this.pendingChunkRequests.get(key);

    if (!request) {
      // No pending request for this chunk
      return;
    }

    // Clear timeout
    clearTimeout(request.timeoutId);

    // Retrieve chunk from GameState
    const chunk = this.gameState.world.getChunk(coords.x, coords.z);
    if (!chunk) {
      request.reject(new Error(`Chunk (${coords.x}, ${coords.z}) not found after receipt`));
      this.pendingChunkRequests.delete(key);
      return;
    }

    log({
      requestManager: 'chunk-request-fulfilled',
      key,
      waitTimeMs: Date.now() - request.timestamp,
    });

    // Fulfill promise
    request.resolve(chunk);
    this.pendingChunkRequests.delete(key);
  }

  /**
   * Generate unique key for subchunk request
   */
  private getSubchunkKey(chunkX: number, chunkY: number, chunkZ: number): string {
    return `subchunk:${chunkX},${chunkY},${chunkZ}`;
  }

  /**
   * Generate unique key for chunk request
   */
  private getChunkKey(chunkX: number, chunkZ: number): string {
    return `chunk:${chunkX},${chunkZ}`;
  }

  /**
   * Start periodic cleanup of stale requests
   */
  private startCleanupInterval(): void {
    // Cleanup every 30 seconds
    setInterval(() => {
      const now = Date.now();
      const maxAge = this.defaultTimeoutMs * 2; // Clean up requests older than 2x timeout

      // Clean up stale subchunk requests
      for (const [key, request] of this.pendingSubchunkRequests.entries()) {
        if (now - request.timestamp > maxAge) {
          clearTimeout(request.timeoutId);
          request.reject(
            new Error(`Request cleaned up as stale: ${key} (age: ${now - request.timestamp}ms)`)
          );
          this.pendingSubchunkRequests.delete(key);
          log({ requestManager: 'subchunk-request-cleaned-up', key });
        }
      }

      // Clean up stale chunk requests
      for (const [key, request] of this.pendingChunkRequests.entries()) {
        if (now - request.timestamp > maxAge) {
          clearTimeout(request.timeoutId);
          request.reject(
            new Error(`Request cleaned up as stale: ${key} (age: ${now - request.timestamp}ms)`)
          );
          this.pendingChunkRequests.delete(key);
          log({ requestManager: 'chunk-request-cleaned-up', key });
        }
      }
    }, 30000);
  }

  /**
   * Get statistics about pending requests (for debugging)
   */
  getStats(): {
    pendingSubchunks: number;
    pendingChunks: number;
  } {
    return {
      pendingSubchunks: this.pendingSubchunkRequests.size,
      pendingChunks: this.pendingChunkRequests.size,
    };
  }
}
