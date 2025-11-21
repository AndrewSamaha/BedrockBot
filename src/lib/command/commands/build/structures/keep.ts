
import type { Voxel } from '../types.ts';

const generate = () => {
  // Keep dimensions
  const KEEP_WIDTH = 9;   // x: 0..8
  const KEEP_DEPTH = 9;   // z: 0..8
  const KEEP_HEIGHT = 12; // y: 0..11

  // Doorway config (centered on one side of the keep)
  const DOOR_SIDE_Z = 0; // south wall
  const DOOR_WIDTH = 1;
  const DOOR_HEIGHT = 2;

  // Centered doorway on the south wall
  const DOOR_X_START = Math.floor(KEEP_WIDTH / 2); // 4 when width=9
  const DOOR_X_END = DOOR_X_START + DOOR_WIDTH;    // exclusive upper bound

  const keepVoxels: Voxel[] = [];

  for (let y = 0; y < KEEP_HEIGHT; y++) {
    for (let x = 0; x < KEEP_WIDTH; x++) {
      for (let z = 0; z < KEEP_DEPTH; z++) {
        // Only build perimeter walls / parapet
        const isPerimeter =
          x === 0 ||
          x === KEEP_WIDTH - 1 ||
          z === 0 ||
          z === KEEP_DEPTH - 1;

        if (!isPerimeter) continue;

        // Carve out the doorway: 1 block wide, 2 blocks tall, on south wall
        const inDoorX = x >= DOOR_X_START && x < DOOR_X_END;
        const inDoorY = y >= 0 && y < DOOR_HEIGHT;
        const isDoorway = inDoorX && inDoorY && z === DOOR_SIDE_Z;

        if (isDoorway) continue;

        keepVoxels.push({
          x,
          y,
          z,
          blockType: "stone",
        });
      }
    }
  }
  // ToDo: Wrap this in a currayble thing so I can do keep.rotate and keep.moveTo etc...
  return keepVoxels;
  // keepVoxels now contains all the stone blocks for the 9x9x12 keep
}

export default generate;
