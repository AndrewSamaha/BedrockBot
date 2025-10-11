import { ItemStatus, type HistoryItem, type UnknownObject } from './types';

class QueueItem {
  packet: UnknownObject;
  result: UnknownObject | undefined | null;
  history: HistoryItem[];
  constructor(packet: UnknownObject) {
    this.packet = packet;
    this.history = [{
      timestamp: new Date(),
      status: ItemStatus.RECEIVED
    }];
  }
  updateStatus(status: ItemStatus) {
    this.history.push({ timestamp: new Date(), status });
  }
  markProcessing(result: UnknowObject | undefined) {
    if (result) {
      this.result = result;
    }
    this.updateStatus(ItemStatus.PROCESSING);
  }
  markSuccess(result: UnknowObject | undefined) {
    if (result) {
      this.result = result;
    }
    this.updateStatus(ItemStatus.SUCCESS);
  }
  markError() {
    this.updateStatus(ItemStatus.ERROR);
  }
  markTimeout() {
    this.updateStatus(ItemStatus.TIMED_OUT);
  }
  getStatus(timeout?): ItemStatus {
    const lastStatus = this.history[this.history.length - 1].status;
    if (lastStatus === ItemStatus.RECEIVED && timeout) {
      if (new Date() >= lastStatus.timestamp + timeout) {
        this.markTimeout()
        return ItemStatus.TIMED_OUT;
      }
    }
    return lastStatus;
  }
}

class Queue {
  name: string;
  processingTimeout: number;
  messages: QueueItem[] = [];
  processCallback: () => {};
  defaultTimeout: number;

  constructor(name: string, timeout = 30_000) {
    this.name = name;
    this.defaultTimeout = timeout;
  }

  push(packet: UnknownObject): QueueItem[] {
    this.messages.push(new QueueItem(packet));
  }

  // gets the next item in the queue that is either processing or received
  getNextMessage(): QueueItem | null {
    return this.messages.find((item) => item.getStatus(this.defaultTimeout) === ItemStatus.RECEIVED || item.getStatus(this.defaultTimeout) === ItemStatus.PROCESSING);
  }

  getNumMessages(statusTypes?: ItemStatus[] | undefined): number {
    if (!statusTypes) return this.messages.length;
    const matches = this.messages.filter((item) => statusTypes.includes(item.getStatus(this.defaultTimeout)));
    return matches.length;
  }
}

export const incomingMessageQueue = new Queue('incomingMessages');
