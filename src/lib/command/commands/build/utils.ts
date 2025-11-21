import { mat4, vec3 } from "gl-matrix";
import type { Voxel, Face } from './types.ts';
import { fill } from '@/lib/serverCommands/index';

type TransformOptions = {
  matrix: mat4;
  rotateFace?: (face: Face) => Face;
};

export function transformVoxel(v: Voxel, t: TransformOptions): Voxel {
  const p: vec3 = vec3.fromValues(v.x, v.y, v.z);
  vec3.transformMat4(p, p, t.matrix);

  return {
    ...v,
    x: p[0],
    y: p[1],
    z: p[2],
    face: v.face && t.rotateFace ? t.rotateFace(v.face) : v.face,
  };
}

export function transformVoxels(voxels: Voxel[], t: TransformOptions): Voxel[] {
  return voxels.map(v => transformVoxel(v, t));
}

export const moveTo = (voxels: Voxel[], target: vec3) => {
  const translation = mat4.create();
  mat4.fromTranslation(
    translation,
    vec3.fromValues(target.x, target.y, target.z)
  );

  const movedVoxelArray: Voxel[] = transformVoxels(voxels, {
    matrix: translation,
  });
  return movedVoxelArray;
}

export function makeRotationAroundPoint(
  angleRad: number,
  axis: vec3,
  pivot: vec3
): mat4 {
  const m = mat4.create();

  // T(pivot) * R(angle) * T(-pivot)
  const translateToOrigin = mat4.create();
  const rotate = mat4.create();
  const translateBack = mat4.create();

  mat4.fromTranslation(translateToOrigin, vec3.negate(vec3.create(), pivot));
  mat4.fromRotation(rotate, angleRad, axis);
  mat4.fromTranslation(translateBack, pivot);

  mat4.multiply(m, rotate, translateToOrigin);
  mat4.multiply(m, translateBack, m);

  return m;
}

function makeScaleAroundPoint(scale: vec3, pivot: vec3): mat4 {
  const m = mat4.create();
  const t1 = mat4.create();
  const s = mat4.create();
  const t2 = mat4.create();

  mat4.fromTranslation(t1, vec3.negate(vec3.create(), pivot));
  mat4.fromScaling(s, scale);
  mat4.fromTranslation(t2, pivot);

  mat4.multiply(m, s, t1);
  mat4.multiply(m, t2, m);
  return m;
}
// // example: rotate 30° around Y through pivot (0,0,0)
// const axisY = vec3.fromValues(0, 1, 0);
// const pivot = vec3.fromValues(0, 0, 0);
// const matrix = makeRotationAroundPoint(Math.PI / 6, axisY, pivot);
//
// // map faces for a pure Y rotation
// const rotateFaceY30: (face: Face) => Face = face => {
//   // for non-90° angles it's fuzzy; for now maybe leave faces unchanged,
//   // or only support this map for multiples of 90°
//   return face;
// };
//
// const rotated = transformVoxels(structureVoxels, {
//   matrix,
//   rotateFace: rotateFaceY30,
// });
//

export const build = (client, generator, position) => {
  const template = generator();
  const instance = moveTo(template, position);
  instance.some((voxel, i) => {
    const blockCoordinates = {
      x: voxel.x,
      y: voxel.y,
      z: voxel.z
    };
    fill(client, blockCoordinates, blockCoordinates, voxel.blockType);
    return false;
  })
}

