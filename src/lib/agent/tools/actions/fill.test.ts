import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createFillTool } from './fill.js';
import type { Client } from 'bedrock-protocol';
import * as serverCommands from '../../../serverCommands/index.js';

vi.mock('../../../serverCommands/index.js', () => ({
  fill: vi.fn(),
}));

describe('createFillTool', () => {
  let mockClient: any;
  let tool: ReturnType<typeof createFillTool>;

  beforeEach(() => {
    mockClient = {
      queue: vi.fn(),
    };
    tool = createFillTool(mockClient);
    vi.clearAllMocks();
  });

  it('should fill region with blocks', async () => {
    const result = await tool.invoke({
      startX: 100,
      startY: 64,
      startZ: 200,
      endX: 105,
      endY: 64,
      endZ: 205,
      blockType: 'stone',
    });
    const parsed = JSON.parse(result);

    expect(parsed.success).toBe(true);
    expect(parsed.blockType).toBe('stone');
    expect(parsed.region.start).toEqual({ x: 100, y: 64, z: 200 });
    expect(parsed.region.end).toEqual({ x: 105, y: 64, z: 205 });
    expect(parsed.note).toContain('Fill command sent');

    expect(serverCommands.fill).toHaveBeenCalledWith(
      mockClient,
      { x: 100, y: 64, z: 200 },
      { x: 105, y: 64, z: 205 },
      'stone'
    );
  });

  it('should handle different block types', async () => {
    await tool.invoke({
      startX: 100,
      startY: 64,
      startZ: 200,
      endX: 100,
      endY: 64,
      endZ: 200,
      blockType: 'dirt',
    });

    expect(serverCommands.fill).toHaveBeenCalledWith(
      mockClient,
      { x: 100, y: 64, z: 200 },
      { x: 100, y: 64, z: 200 },
      'dirt'
    );
  });

  it('should handle fill errors', async () => {
    vi.mocked(serverCommands.fill).mockImplementation(() => {
      throw new Error('Fill failed');
    });

    const result = await tool.invoke({
      startX: 100,
      startY: 64,
      startZ: 200,
      endX: 105,
      endY: 64,
      endZ: 205,
      blockType: 'stone',
    });
    const parsed = JSON.parse(result);

    expect(parsed.error).toBe('Fill failed');
    expect(parsed.blockType).toBe('stone');
    expect(parsed.region).toBeDefined();
  });

  it('should have correct tool name', () => {
    expect(tool.name).toBe('fill');
  });

  it('should validate schema parameters', () => {
    expect(tool.schema.shape.startX).toBeDefined();
    expect(tool.schema.shape.startY).toBeDefined();
    expect(tool.schema.shape.startZ).toBeDefined();
    expect(tool.schema.shape.endX).toBeDefined();
    expect(tool.schema.shape.endY).toBeDefined();
    expect(tool.schema.shape.endZ).toBeDefined();
    expect(tool.schema.shape.blockType).toBeDefined();
  });
});
