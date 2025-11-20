export type BotConfig = {
  movement: {
    maxSpeedBps: number;
    wanderPerTick: number;
    friction: number;
  };
  look: {
    downOneBlockPitch: number;
    upOneBlockPitch: number;
    straightUpPitch: number;
    straightDownPitch: number;
    forwardPitch: number;
  };
  night: {
    autoDisconnectAtNight: boolean;
    autoDisconnectAtNightdurationMs: number;
  };
};

export const botConfig: BotConfig = {
  movement: {
    maxSpeedBps: 4.3,
    wanderPerTick: 0.10,
    friction: 0.14
  },
  look: {
    downOneBlockPitch: 50,
    upOneBlockPitch: -50,
    straightUpPitch: -89.899,
    straightDownPitch: 89.899,
    forwardPitch: 0
  },
  night: {
    autoDisconnectAtNight: true,
    autoDisconnectAtNightDurationMs: 10_000
  }
}


