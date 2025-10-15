export type MovePlayer = {
  runtime_id: BigInt,
  position: {
    x: number,
    y: number,
    z: number,
  },
  pitch: number,
  yaw: number,
  head_yaw: number,
  mode: string,
  on_ground: boolean,
  ridden_runtime_id: number,
  teleport: undefined | unknown,
  tick: BigInt
};

