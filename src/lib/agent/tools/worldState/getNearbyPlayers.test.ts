import { describe, it, expect, beforeEach } from 'vitest';
import { createGetNearbyPlayersTool } from './getNearbyPlayers.js';
import { EventEmitter } from 'events';
import type { GameState } from '../../../GameState.js';
import { SpatialMemory } from '../../../spatialMemory/index.js';

class MockGameState extends EventEmitter {
  playerPosition = { x: 100, y: 64, z: 200 };
  playerList: any[] = [];
  worldStateRequestManager = undefined;
  spatialMemory: SpatialMemory;

  constructor() {
    super();
    this.spatialMemory = new SpatialMemory();
  }
}

describe('createGetNearbyPlayersTool', () => {
  let mockGameState: MockGameState;
  let tool: ReturnType<typeof createGetNearbyPlayersTool>;

  beforeEach(() => {
    mockGameState = new MockGameState();
    tool = createGetNearbyPlayersTool(mockGameState as any);
  });

  it('should return empty array when no players', async () => {
    mockGameState.playerList = [];

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.players).toEqual([]);
  });

  it('should return all players when no maxDistance', async () => {
    mockGameState.playerList = [
      {
        username: 'Player1',
        position: { x: 110, y: 64, z: 210 },
        pitch: 0,
        yaw: 90,
        head_yaw: 90,
      },
      {
        username: 'Player2',
        position: { x: 200, y: 70, z: 300 },
      },
    ];

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.players).toHaveLength(2);
    expect(parsed.count).toBe(2);
    expect(parsed.players[0].username).toBe('Player1');
    expect(parsed.players[1].username).toBe('Player2');
  });

  it('should filter players by maxDistance', async () => {
    mockGameState.playerPosition = { x: 100, y: 64, z: 200 };
    mockGameState.playerList = [
      {
        username: 'Nearby',
        position: { x: 105, y: 64, z: 205 }, // ~7 blocks away
      },
      {
        username: 'Far',
        position: { x: 200, y: 70, z: 300 }, // ~141 blocks away
      },
    ];

    const result = await tool.invoke({ maxDistance: 50 });
    const parsed = JSON.parse(result);

    expect(parsed.players).toHaveLength(1);
    expect(parsed.players[0].username).toBe('Nearby');
    expect(parsed.count).toBe(1);
  });

  it('should include all player fields', async () => {
    mockGameState.playerList = [
      {
        username: 'Player1',
        position: { x: 110, y: 64, z: 210 },
        pitch: 10,
        yaw: 180,
        head_yaw: 175,
      },
    ];

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.players[0]).toEqual({
      username: 'Player1',
      position: { x: 110, y: 64, z: 210 },
      pitch: 10,
      yaw: 180,
      head_yaw: 175,
    });
  });

  it('should handle missing player list', async () => {
    mockGameState.playerList = undefined as any;

    const result = await tool.invoke({});
    const parsed = JSON.parse(result);

    expect(parsed.players).toEqual([]);
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('get_nearby_players');
  });
});
