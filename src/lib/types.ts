export enum ItemStatus {
  RECEIVED = 'RECEIVED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  TIMED_OUT = 'TIMED_OUT'
}

export type HistoryItem = {
  timestamp: Date;
  status: ItemStatus;
}

export type UnknownObject = {
  [key: string]: unknown;
}

export type LookVector = {
  yaw: number;
  pitch: number;
  head_yaw: number;
}

export type Vec3 = { x: number; y: number; z: number }

export interface Vec3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Vector2D represents a 2D position or direction with x, z coordinates
 */
export interface Vec2D {
  x: number;
  z: number;
}


