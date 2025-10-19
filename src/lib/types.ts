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