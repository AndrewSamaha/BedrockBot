
import type { mat4, vec3 } from "gl-matrix";

export type Face = "north" | "south" | "east" | "west" | "up" | "down";

export type Voxel = {
  x: number;
  y: number;
  z: number;
  blockType: string;      // "minecraft:stone", "minecraft:oak_planks", etc.
  face?: Face;            // optional orientation of the *exposed* face
};
