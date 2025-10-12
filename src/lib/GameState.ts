import { log } from './log';

const TIC_INTERVAL = 1_000;

class GameState {
  position: unknown;
  lastTic: number;
  client: unknown;
  spawned: boolean;
  private ticInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.spawned = false;
    this.lastTic = 0;
  }

  spawn(client: unknown) {
    this.client = client;
    if (this.spawned) {
      return;
    }

    this.spawned = true;

    this.startTic();
  }

  startTic() {
    if (this.ticInterval) {
      console.log('Tic interval already running, clearing previous interval');
      clearInterval(this.ticInterval);
    }

    this.ticInterval = setInterval(() => {
      this.tic();
    }, TIC_INTERVAL);

    console.log(`Started tic interval with ${TIC_INTERVAL}ms interval`);
  }

  tic() {
    this.lastTic = Date.now();
    // Add your tic logic here
    if (this.position) {
      const { position: { x, y, z } } = this.position;
      console.log(`Tic executed at ${new Date().toISOString()} ${x}, ${z}, ${y} `);
      return;
    }
    console.log(`Tic executed at ${new Date().toISOString()} - no position reported`);
  }

  // Method to stop the tic interval (useful for cleanup)
  stopTic() {
    if (this.ticInterval) {
      clearInterval(this.ticInterval);
      this.ticInterval = null;
      console.log('Tic interval stopped');
    }
  }

  // Method to check if tic is running
  isTicRunning(): boolean {
    return this.ticInterval !== null;
  }

  setPosition(position: unknown) {
    this.position = position;
  }
}

export const gameState = new GameState();

