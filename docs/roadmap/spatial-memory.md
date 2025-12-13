# Spatial Memory System V1 Roadmap

## Overview

This document outlines the architecture and implementation plan for a spatial memory system that allows the bot to imagine and manipulate 3D structures separate from the game world. The system enables the agent to visualize, iterate on, and eventually build imagined structures.

## Core Concepts

### SpatialEngram
A **SpatialEngram** represents a small collection of non-air blocks (configurable max, defaults to 512) stored using **local coordinates** centered at (0, 0, 0). Each engram is a self-contained structure that can be positioned, rotated, and manipulated independently.

**Key Properties:**
- Configurable maximum blocks (defaults to 512, set in constructor)
- Unique UUID identifier (`id`)
- Name and description fields (string)
- Local coordinate system (center at 0,0,0)
- State stored as `Set<string>` with format `"${x},${y},${z},${blockType}"`
- Serialization/deserialization support (`toJSON()`, `fromJSON()`)
- Immutable once created (or versioned for undo/redo)

**Use Cases:**
- Small structures: houses, towers, bridges, decorations
- Building components: walls, roofs, windows
- Natural features: trees, rocks, waterfalls
- Abstract concepts: burned buildings, ruins, etc.

### SpatialMemory
A **SpatialMemory** instance manages multiple SpatialEngrams, each positioned at specific world coordinates. This allows the bot to imagine multiple structures simultaneously and compose them.

**Key Properties:**
- Array of `SpatialEngram` instances (each with its own id, name, description)
- World coordinates for each engram (position where engram's (0,0,0) maps to)
- Metadata: timestamps, tags (name/description stored in engram itself)
- Working memory vs long-term memory distinction

## Architecture

### Data Structures

```typescript
class SpatialEngram {
  readonly id: string; // UUID
  name: string;
  description: string;
  private blocks: Set<string>; // "${x},${y},${z},${blockType}"
  private readonly maxBlocks: number; // Configurable, defaults to 512

  constructor(name: string, description: string, maxBlocks?: number);

  // Local coordinate bounds
  getBounds(): { min: Vec3, max: Vec3 };

  // Block operations
  addBlock(x: number, y: number, z: number, blockType: string): boolean;
  removeBlock(x: number, y: number, z: number): boolean;
  getBlock(x: number, y: number, z: number): string | null; // Returns blockType or null
  getAllBlocks(): Array<{ x: number, y: number, z: number, blockType: string }>;

  // Import/Export
  importFromChunk(chunk: ChunkColumn, cx: number, cz: number, bounds: BoundingBox): void;
  importFromSubchunk(chunk: ChunkColumn, cx: number, cy: number, cz: number): void;
  exportToChunk(chunk: ChunkColumn, worldOrigin: Vec3): void; // For building

  // Serialization
  toJSON(): object; // Serialize to JSON
  static fromJSON(json: object): SpatialEngram; // Deserialize from JSON

  // Validation
  isValid(): boolean; // Checks block count, coordinates, etc.
  getBlockCount(): number;
}

class SpatialMemory {
  private engrams: Array<{
    engram: SpatialEngram; // Engram has its own id, name, description
    worldPosition: Vec3; // Where engram's (0,0,0) maps to in world
    createdAt: number;
    tags?: string[];
  }>;

  // Engram management
  addEngram(engram: SpatialEngram, worldPosition: Vec3): string; // Returns engram.id
  removeEngram(id: string): boolean; // Uses engram.id
  getEngram(id: string): SpatialEngram | null; // Uses engram.id
  getAllEngrams(): Array<{ engram: SpatialEngram, worldPosition: Vec3 }>;

  // Query operations
  getBlocksInRegion(min: Vec3, max: Vec3): Array<{ x: number, y: number, z: number, blockType: string, engramId: string }>;
  getEngramsInRegion(min: Vec3, max: Vec3): Array<string>; // Returns engram IDs

  // Import/Export
  importFromGameWorld(region: BoundingBox, gameState: GameState): string; // Returns engram ID
  exportToGameWorld(engramId: string, worldPosition: Vec3, client: Client): Promise<void>;

  // Persistence
  saveToFile(filepath: string): void;
  loadFromFile(filepath: string): void;
  clearWorkingMemory(): void; // Clear all engrams
}
```

### Integration Points

```
┌─────────────────────────────────────┐
│         GameState                    │
│  - world: World                      │
│  - spatialMemory: SpatialMemory     │
└──────────────┬──────────────────────┘
               │
               │ Updates
               ▼
┌─────────────────────────────────────┐
│      WebSocket Broadcaster           │
│  - Includes spatial memory blocks    │
│  - Sends to visualization client     │
└──────────────┬──────────────────────┘
               │
               │ JSON snapshot
               ▼
┌─────────────────────────────────────┐
│    Browser Visualization            │
│  - Renders game blocks              │
│  - Renders imagined blocks          │
│  - Toggle show/hide imagined        │
└─────────────────────────────────────┘
```

## Implementation Phases

### Phase 1: Core Data Structures (Foundation)

**Goal:** Implement `SpatialEngram` and `SpatialMemory` classes with basic operations.

**Tasks:**
1. Create `src/lib/spatialMemory/SpatialEngram.ts`
   - Implement `Set<string>` storage with `"${x},${y},${z},${blockType}"` format
   - Add/remove/get block methods
   - Engrams initialized with a max size (e.g., block count validation ≤ n, defaults to 512)
   - Bounds calculation
   - Basic validation
   - name and description fields of type string
   - id of type uuid

2. Create `src/lib/spatialMemory/SpatialMemory.ts`
   - Array of engrams with world positions
   - Add/remove/get engram methods (use engram.id for identification)
   - Metadata storage (timestamps, tags)
   - Note: Engrams have their own id, name, description fields

3. Add `spatialMemory` property to `GameState`
   - Initialize in constructor
   - Accessible via `gameState.spatialMemory`

4. Unit tests
   - `SpatialEngram.test.ts`
   - `SpatialMemory.test.ts`

**Deliverables:**
- ✅ `SpatialEngram` class with basic block operations, including serialization and deserialization
- ✅ `SpatialMemory` class with engram management
- ✅ Integration with `GameState`
- ✅ Unit tests passing

---

### Phase 2: Import/Export from Chunks

**Goal:** Enable copying blocks between game world and spatial memory.

**Tasks:**
1. Implement `SpatialEngram.importFromChunk()`
   - Takes `ChunkColumn`, chunk coords, and bounding box
   - Iterates blocks in region, converts to local coords (centered at 0,0,0)
   - Adds to `Set<string>` storage
   - Validates block count against engram's maxBlocks limit

2. Implement `SpatialEngram.importFromSubchunk()`
   - Takes `ChunkColumn`, subchunk coords
   - Imports entire 16×16×16 subchunk
   - Converts to local coordinates

3. Implement `SpatialEngram.exportToChunk()`
   - Takes target `ChunkColumn` and world origin
   - Converts local coords to world coords
   - Sets blocks in chunk (for building)

4. Implement `SpatialMemory.importFromGameWorld()`
   - Takes bounding box in world coordinates, name, and description
   - Creates new `SpatialEngram` with name/description
   - Imports blocks from `gameState.world`
   - Adds to memory with world position
   - Returns engram ID (from engram.id)

5. Unit tests for import/export
   - Test importing from chunks/subchunks
   - Test coordinate transformations
   - Test block count limits

**Deliverables:**
- ✅ Import from game world chunks/subchunks
- ✅ Export to chunks (for building)
- ✅ Coordinate transformation (world ↔ local)
- ✅ Unit tests passing

---

### Phase 3: Visualization Integration

**Goal:** Display imagined blocks in web client alongside game world.

**Tasks:**
1. Update `GameStateSnapshot` interface
   ```typescript
   export interface GameStateSnapshot {
     // ... existing fields
     spatialMemoryBlocks?: Array<{
       x: number;
       y: number;
       z: number;
       blockType: string;
       engramId: string;
     }>;
     spatialMemoryEngrams?: Array<{
       id: string; // engram.id
       name: string; // engram.name
       description: string; // engram.description
       worldPosition: { x: number; y: number; z: number };
       blockCount: number;
     }>;
   }
   ```

2. Update `websocket/server.ts` broadcast method
   - Include spatial memory blocks in snapshot
   - Convert engrams to world coordinates
   - Include engram metadata (id, name, description, blockCount)

3. Update `public/index.html` visualization
   - Add `imaginedBlocks` Map for storing rendered blocks
   - Render imagined blocks with different color/material (e.g., semi-transparent purple)
   - Add UI toggle: "Show Imagined Blocks" checkbox
   - Update blocks when spatial memory changes
   - Handle engram removal (remove blocks when engram deleted)

4. Visual distinction
   - Imagined blocks: Semi-transparent, different color (e.g., purple/cyan)
   - Game blocks: Opaque, normal colors
   - Optional: Wireframe mode for imagined blocks

**Deliverables:**
- ✅ Spatial memory blocks visible in web client
- ✅ Toggle to show/hide imagined blocks
- ✅ Visual distinction from game blocks
- ✅ Real-time updates when memory changes

---

### Phase 4: Agent Tools for Imagination

**Goal:** Enable agent to manipulate spatial memory via tool calls.

**Tasks:**
1. Create `src/lib/agent/tools/spatialMemory/` directory

2. Implement tools:
   - `createImaginedStructure.ts` - Create new engram from scratch
   - `addBlockToImagination.ts` - Add single block to engram
   - `removeBlockFromImagination.ts` - Remove block from engram
   - `fillImaginedRegion.ts` - Fill rectangular region in engram
   - `importFromGameWorld.ts` - Copy region from game to memory
   - `clearImagination.ts` - Clear working memory
   - `getImaginedBlocks.ts` - Query imagined blocks
   - `buildImaginedStructure.ts` - Build engram in game world

3. Tool schemas (Zod)
   - Clear parameter descriptions for LLM
   - Coordinate systems (local vs world)
   - Block type validation

4. Register tools in `tools/index.ts`
   - Add to `createAllTools()`
   - Export from `spatialMemory/index.ts`

5. Unit tests for each tool

**Tool Examples:**
```typescript
// Create imagined structure
createImaginedStructure({
  name: "Small House",
  description: "A small stone house with a wooden roof",
  blocks: [{ x: 0, y: 0, z: 0, blockType: "stone" }, ...],
  maxBlocks: 512 // Optional, defaults to 512
})

// Add block to existing engram
addBlockToImagination({
  engramId: "engram-123",
  x: 5, y: 2, z: 3,
  blockType: "oak_planks"
})

// Import from game world
importFromGameWorld({
  name: "Copied Building",
  description: "A building copied from the game world",
  minX: 100, minY: 64, minZ: 200,
  maxX: 115, maxY: 80, maxZ: 215
})

// Build imagined structure
buildImaginedStructure({
  engramId: "engram-123",
  worldX: 200, worldY: 64, worldZ: 300
})
```

**Deliverables:**
- ✅ All spatial memory tools implemented
- ✅ Ability to pass engrams to LLMs as context
- ✅ Tools registered in agent tool list
- ✅ LLM can create/manipulate imagined structures
- ✅ Unit tests passing

---

### Phase 5: Building to Game World

**Goal:** Convert imagined structures to actual blocks in game.

**Tasks:**
1. Implement `SpatialMemory.exportToGameWorld()`
   - Takes engram ID and target world position
   - Converts local coords to world coords
   - Groups blocks by chunk for efficient fills
   - Creates fill commands (respecting Bedrock limits: 32,768 blocks per fill)

2. Implement `buildImaginedStructure` tool
   - Validates engram exists
   - Checks block count (warn if >32,768)
   - Batches fills if needed
   - Returns progress/status

3. Fill command batching
   - Group blocks by chunk
   - Optimize rectangular regions within chunks
   - Handle large structures (multiple fill commands)

4. Error handling
   - Validate block types
   - Check coordinate bounds
   - Handle build failures

**Deliverables:**
- ✅ Build imagined structures in game world
- ✅ Efficient fill command batching
- ✅ Error handling and validation
- ✅ Progress tracking for large builds

---

### Phase 6: Persistence (Long-term Memory)

**Goal:** Save/load spatial memory to/from files.

**Tasks:**
1. Implement `SpatialMemory.saveToFile()`
   - Serialize engrams to JSON
   - Include metadata (timestamps, descriptions)
   - Save to `data/spatial_memory/` directory

2. Implement `SpatialMemory.loadFromFile()`
   - Deserialize JSON
   - Reconstruct engrams using `SpatialEngram.fromJSON()`
   - Validate data (check engram validity, block counts, etc.)

3. File format
   ```json
   {
     "version": 1,
     "engrams": [
       {
         "engram": {
           "id": "uuid-here",
           "name": "Small House",
           "description": "A small stone house with a wooden roof",
           "maxBlocks": 512,
           "blocks": ["0,0,0,stone", "1,0,0,stone", ...]
         },
         "worldPosition": { "x": 100, "y": 64, "z": 200 },
         "createdAt": 1234567890,
         "tags": ["house", "stone"]
       }
     ]
   }
   ```

   Note: Serialization uses `SpatialEngram.toJSON()` and deserialization uses `SpatialEngram.fromJSON()`

4. File management
   - Naming: `spatial_memory_<timestamp>.json`
   - Load on startup (optional)
   - Save on changes (optional, or manual)

**Deliverables:**
- ✅ Save spatial memory to files (using engram serialization)
- ✅ Load spatial memory from files (using engram deserialization)
- ✅ File format specification (includes engram id, name, description)
- ✅ Basic file management

---

## Usage Examples

### Agent Prompt Examples

```
"Imagine a small stone house with a wooden roof"
→ Agent creates SpatialEngram with name="Small House", description="A small stone house with a wooden roof", and house structure

"Add a window to the house you imagined"
→ Agent adds blocks to existing engram

"Imagine a waterfall next to the house"
→ Agent creates new engram for waterfall

"Build the house at coordinates 200, 64, 300"
→ Agent builds imagined structure in game world

"Copy that building over there into your imagination"
→ Agent imports region from game world
```

### Visualization Flow

1. Agent creates/modifies spatial memory via tools
2. `GameState.spatialMemory` updates
3. WebSocket broadcaster includes spatial memory in snapshot
4. Browser receives update
5. Visualization renders imagined blocks (different color)
6. User can toggle visibility in UI

---

## Technical Considerations

### Coordinate Systems

- **Local (Engram)**: Centered at (0,0,0), used within `SpatialEngram`
- **World**: Absolute game coordinates, used in `SpatialMemory` positioning
- **Transformation**: `worldCoord = engram.worldPosition + localCoord`

### Block Type Format

- Store as string: `"stone"`, `"oak_planks"`, `"minecraft:stone"` (consistent with fill tool)
- Validate against registry when building

### Performance

- Set operations: O(1) add/remove/lookup
- Iteration: O(n) for all blocks (acceptable for ≤512 blocks per engram)
- Visualization: Only render visible blocks (frustum culling)

### Memory Limits

- **SpatialEngram**: Configurable max blocks (defaults to 512, can be set in constructor)
- **SpatialMemory**: No hard limit, but consider cleanup of old engrams
- **Working memory**: Clear periodically or on explicit command

### Serialization

- **SpatialEngram**: Implements `toJSON()` and `fromJSON()` for persistence
- **SpatialMemory**: Serializes array of engrams with world positions and metadata
- Used for: file persistence, passing engrams to LLMs as context, visualization

### LLM Context

- Engrams can be serialized and passed to LLMs as context
- Include engram id, name, description, and block count in tool responses
- Allows LLM to reference and manipulate specific engrams by id
- Enables prompts like "add a window to the house you imagined" (LLM uses engram id)

---

## Future Enhancements (Post-V1)

- **Transformations**: Rotate, scale, mirror engrams
- **Composition**: Combine multiple engrams into one
- **Templates**: Save/load common structures (houses, towers, etc.)
- **Undo/Redo**: Version history for engrams
- **Spatial queries**: "Find all engrams near position X"
- **Validation**: Check if structure is buildable (physics, limits)
- **Relative positioning**: Position engrams relative to each other
- **Multi-engram operations**: Copy, move, delete multiple engrams

---

## Testing Strategy

### Unit Tests
- `SpatialEngram.test.ts`: Block operations, import/export, validation, serialization/deserialization, id/name/description fields, configurable maxBlocks
- `SpatialMemory.test.ts`: Engram management, queries, persistence
- Tool tests: Each tool has corresponding `.test.ts` file

### Integration Tests
- Import from game world → visualize → build back
- Multiple engrams → visualization → build
- Coordinate transformations

### Manual Testing
- Agent prompts: "imagine a house", "build it", etc.
- Visualization: Toggle imagined blocks, verify rendering
- Building: Build structures, verify they appear in game

---

## Success Criteria

V1 is complete when:

1. ✅ Agent can create imagined structures via tool calls
2. ✅ Imagined blocks are visible in web client (different color)
3. ✅ User can toggle visibility of imagined blocks
4. ✅ Agent can import structures from game world
5. ✅ Agent can build imagined structures in game world
6. ✅ Basic persistence (save/load) works
7. ✅ All unit tests passing
8. ✅ Documentation complete

---

## Timeline Estimate

- **Phase 1**: 2-3 days (Core data structures)
- **Phase 2**: 2-3 days (Import/Export)
- **Phase 3**: 2-3 days (Visualization)
- **Phase 4**: 3-4 days (Agent tools)
- **Phase 5**: 2-3 days (Building)
- **Phase 6**: 1-2 days (Persistence)

**Total**: ~12-18 days for full V1 implementation

---

## Notes

- Start with simplest implementation (Set<string>)
- Prioritize visualization early (Phase 3) for quick feedback
- Tools can be added incrementally (don't need all at once)
- Persistence can be basic JSON (no need for complex format initially)
- Focus on working memory first, long-term memory can be enhanced later
