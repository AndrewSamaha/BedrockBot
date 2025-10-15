
// Types reused from your code
type Vec3 = { x: number; y: number; z: number }

export type RandomMoverOptions = {
  // Target max horizontal speed (blocks/sec). ~4.3 is walk; ~5.6 sprint.
  maxSpeedBps?: number
  // How quickly direction wanders each tick (radians). 0.0 = straight line, 0.5 ≈ erratic.
  wanderPerTick?: number
  // Friction (0..1). Higher = more damping. 0.10–0.20 feels good.
  friction?: number
  // Occasional micro-pauses to look more “botty”
  pauseChancePerSecond?: number
  // Seed heading (degrees). If omitted, random.
  initialHeadingDeg?: number
  // Allow small vertical drift? Default off.
  allowVertical?: boolean
  // Max vertical speed in blocks/sec if vertical is allowed.
  maxVerticalBps?: number
}

/**
 * Returns a function you can call once per 20 Hz tick to get a world-space moveVector (delta/tick).
 * The generator keeps internal velocity and heading for smooth motion.
 */
export function createRandomMoveVectorGenerator(opts: RandomMoverOptions = {}) {
  const {
    maxSpeedBps = 4.3,            // walk speed
    wanderPerTick = 0.12,         // small heading jitter
    friction = 0.14,              // velocity damping
    pauseChancePerSecond = 0.15,  // ~15% chance/sec to micro-pause
    initialHeadingDeg = Math.random() * 360,
    allowVertical = false,
    maxVerticalBps = 0.0
  } = opts

  // Internal state
  let headingRad = (initialHeadingDeg * Math.PI) / 180
  let vx = 0, vz = 0, vy = 0
  const TICKS_PER_SEC = 20
  const DT = 1 / TICKS_PER_SEC

  // Helper for random in [-1, 1]
  const r1 = () => Math.random() * 2 - 1

  return function nextMoveVector(): Vec3 {
    // 1) Occasional micro-pause (don’t change heading/velocity sometimes)
    const pauseProbPerTick = pauseChancePerSecond * DT
    const paused = Math.random() < pauseProbPerTick

    if (!paused) {
      // 2) Wander: nudge heading a little each tick
      headingRad += (r1() * wanderPerTick)

      // 3) Target acceleration along heading to approach max speed
      const targetVx = Math.sin(headingRad) * maxSpeedBps
      const targetVz = Math.cos(headingRad) * maxSpeedBps

      // Simple critically-damped-ish approach toward target
      const accelGain = 0.6 // bigger = snappier turns
      vx += (targetVx - vx) * accelGain * DT
      vz += (targetVz - vz) * accelGain * DT

      if (allowVertical && maxVerticalBps > 0) {
        // Slow vertical meander
        const targetVy = r1() * maxVerticalBps * 0.2
        vy += (targetVy - vy) * 0.4 * DT
      } else {
        vy = 0
      }

      // 4) Friction/damping
      vx *= (1 - friction)
      vz *= (1 - friction)
      vy *= (1 - friction * 0.5)

      // 5) Clamp horizontal speed to max
      const speed = Math.hypot(vx, vz)
      if (speed > maxSpeedBps) {
        const s = maxSpeedBps / speed
        vx *= s; vz *= s
      }
    } else {
      // Light damping while paused
      vx *= (1 - friction * 1.2)
      vz *= (1 - friction * 1.2)
      vy *= (1 - friction * 0.8)
    }

    // 6) Convert velocity (blocks/sec) → per-tick delta for 20 Hz
    return { x: vx * DT, y: vy * DT, z: vz * DT }
  }
}
