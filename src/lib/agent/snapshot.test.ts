import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGameStateSnapshot } from './snapshot.js';
import type { GameState } from '../GameState.js';
import { EventEmitter } from 'events';

// Mock GameState
class MockGameState extends EventEmitter {
  spawned = false;
  playerPosition = { x: 100, y: 64, z: 200 };
  pitch = 0;
  yaw = 90;
  headYaw = 90;
  entityId = 123;
  runtimeEntityId = 456;
  gameTime = 12000;
  dayPhase = 'day';
  currentTick = 1000n;
  overworldPlayerCount = 5;
  sleepingPlayerCount = 2;
  ableToSleep = 3;
  registry = { blocksByStateId: {} };
  receivedSubChunks: number[][] = [];
  playerList: any[] = [];
  world: any;

  constructor() {
    super();
    this.world = {
      getChunkCount: vi.fn(() => 10),
      getAllChunkCoords: vi.fn(() => [
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
      getHighestBlocksInChunk: vi.fn(() => [
        [0, 64, 0],
        [1, 65, 1],
      ]),
      getChunkBlockStats: vi.fn(() => ({ total: 256, nonAir: 50 })),
      getAllBlocksInSubchunk: vi.fn(() => [
        { x: 100, y: 64, z: 200 },
        { x: 101, y: 64, z: 200 },
      ]),
    };
  }

  addReceivedSubchunk(x: number, y: number, z: number): void {
    this.receivedSubChunks.push([x, y, z]);
  }

  addReceivedChunk(x: number, z: number): void {
    // Mock implementation
  }
}

describe('createGameStateSnapshot', () => {
  let mockGameState: MockGameState;

  beforeEach(() => {
    mockGameState = new MockGameState();
  });

  it('should create a snapshot with all basic fields', () => {
    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.spawned).toBe(false);
    expect(snapshot.playerPosition).toEqual({ x: 100, y: 64, z: 200 });
    expect(snapshot.pitch).toBe(0);
    expect(snapshot.yaw).toBe(90);
    expect(snapshot.headYaw).toBe(90);
    expect(snapshot.entityId).toBe(123);
    expect(snapshot.runtimeEntityId).toBe(456);
    expect(snapshot.gameTime).toBe(12000);
    expect(snapshot.dayPhase).toBe('day');
    expect(snapshot.currentTick).toBe('1000');
    expect(snapshot.overworldPlayerCount).toBe(5);
    expect(snapshot.sleepingPlayerCount).toBe(2);
    expect(snapshot.ableToSleep).toBe(3);
    expect(snapshot.timestamp).toBeTypeOf('number');
  });

  it('should handle missing player position', () => {
    mockGameState.playerPosition = undefined as any;

    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.playerPosition).toBeUndefined();
  });

  it('should handle missing optional fields', () => {
    mockGameState.pitch = undefined;
    mockGameState.yaw = undefined;
    mockGameState.entityId = undefined;
    mockGameState.gameTime = undefined;

    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.pitch).toBeUndefined();
    expect(snapshot.yaw).toBeUndefined();
    expect(snapshot.entityId).toBeUndefined();
    expect(snapshot.gameTime).toBeUndefined();
  });

  it('should serialize BigInt currentTick to string', () => {
    mockGameState.currentTick = 12345678901234567890n;

    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.currentTick).toBe('12345678901234567890');
    expect(typeof snapshot.currentTick).toBe('string');
  });

  it('should include chunk information', () => {
    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.chunkCount).toBe(10);
    expect(snapshot.chunkCoords).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it('should include player chunk information when position exists', () => {
    const snapshot = createGameStateSnapshot(mockGameState as any);

    // Player at (100, 64, 200) = chunk (6, 12)
    // Chunk world base: (6*16, 12*16) = (96, 192)
    // Mock returns local coords [0, 64, 0] and [1, 65, 1]
    // Converted to world: (96+0, 64, 192+0) and (96+1, 65, 192+1)
    expect(snapshot.playerChunkHighestBlocks).toEqual([
      { x: 96, y: 64, z: 192 },
      { x: 97, y: 65, z: 193 },
    ]);
    expect(snapshot.playerChunkBlockStats).toEqual({
      total: 256,
      nonAir: 50,
    });
    expect(snapshot.playerSubchunkBlocks).toEqual([
      { x: 100, y: 64, z: 200 },
      { x: 101, y: 64, z: 200 },
    ]);
  });

  it('should handle errors when getting chunk data gracefully', () => {
    mockGameState.world.getHighestBlocksInChunk.mockImplementation(() => {
      throw new Error('Chunk not loaded');
    });

    const snapshot = createGameStateSnapshot(mockGameState as any);

    // Should not throw, but chunk-specific fields may be undefined
    expect(snapshot.chunkCount).toBe(10); // This should still work
  });

  it('should handle missing registry gracefully', () => {
    mockGameState.registry = undefined;

    const snapshot = createGameStateSnapshot(mockGameState as any);

    // Should not throw, but subchunk blocks may be undefined
    expect(snapshot.playerSubchunkBlocks).toBeUndefined();
  });

  it('should include player list when available', () => {
    mockGameState.playerList = [
      {
        username: 'Player1',
        position: { x: 10, y: 64, z: 20 },
        pitch: 0,
        yaw: 90,
        head_yaw: 90,
      },
      {
        username: 'Player2',
        position: { x: 20, y: 65, z: 30 },
      },
    ];

    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.playerList).toEqual([
      {
        username: 'Player1',
        position: { x: 10, y: 64, z: 20 },
        pitch: 0,
        yaw: 90,
        head_yaw: 90,
      },
      {
        username: 'Player2',
        position: { x: 20, y: 65, z: 30 },
      },
    ]);
  });

  it('should handle empty player list', () => {
    mockGameState.playerList = [];

    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.playerList).toEqual([]);
  });

  it('should handle missing player list', () => {
    mockGameState.playerList = undefined as any;

    const snapshot = createGameStateSnapshot(mockGameState as any);

    expect(snapshot.playerList).toBeUndefined();
  });

  it('should calculate correct chunk coordinates from player position', () => {
    mockGameState.playerPosition = { x: 150, y: 80, z: 250 };

    const snapshot = createGameStateSnapshot(mockGameState as any);

    // Chunk X = floor(150 / 16) = 9
    // Chunk Z = floor(250 / 16) = 15
    // Subchunk Y = floor(80 / 16) = 5
    expect(mockGameState.world.getHighestBlocksInChunk).toHaveBeenCalledWith(
      9,
      15
    );
    expect(mockGameState.world.getAllBlocksInSubchunk).toHaveBeenCalledWith(
      9,
      5,
      15,
      mockGameState.registry
    );
  });

  it('should include timestamp', () => {
    const before = Date.now();
    const snapshot = createGameStateSnapshot(mockGameState as any);
    const after = Date.now();

    expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
    expect(snapshot.timestamp).toBeLessThanOrEqual(after);
  });
});
