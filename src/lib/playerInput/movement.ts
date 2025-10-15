// movement.ts
// --------- Types
export type Vec3 = { x: number; y: number; z: number }
export type Rotation = { pitch: number; yaw: number; headYaw: number }

const TICKS_PER_SEC = 20
const DT = 1 / TICKS_PER_SEC

// --------- Math helpers
const toDegrees = (rad: number) => rad * (180 / Math.PI)
const normalizeAngleDeg = (a: number) => (((a + 180) % 360 + 360) % 360) - 180

// --------- Input flag bitset (Bedrock 1.21.111 InputFlag mapping)
const INPUT = {
  ASCEND: 1,                    // 0x01 - Moving up (jump/fly up)
  DESCEND: 2,                   // 0x02 - Moving down (crouch/fly down)  
  NORTH_JUMP: 4,                // 0x04 - Moving north + jump
  JUMP_DOWN: 8,                 // 0x08 - Jump down
  SPRINT_DOWN: 16,              // 0x10 - Sprint down
  CHANGE_HEIGHT: 32,            // 0x20 - Height change
  JUMPING: 64,                  // 0x40 - Currently jumping
  AUTO_JUMPING: 128,            // 0x80 - Auto jumping
  SNEAKING: 256,                // 0x100 - Sneaking
  SNEAK_DOWN: 512,              // 0x200 - Sneak down
  CRAWLING: 1024,               // 0x400 - Crawling
  CRAWL_DOWN: 2048,             // 0x800 - Crawl down
  SPRINTING: 4096,              // 0x1000 - Sprinting
  ASCEND_SCAFFOLD: 8192,        // 0x2000 - Ascend scaffold
  DESCEND_SCAFFOLD: 16384,      // 0x4000 - Descend scaffold
  SNEAK_TOGGLE_DOWN: 32768,     // 0x8000 - Sneak toggle down
  PERSIST_SNEAK: 65536,         // 0x10000 - Persist sneak
  START_SPRINTING: 131072,      // 0x20000 - Start sprinting
  STOP_SPRINTING: 262144,       // 0x40000 - Stop sprinting
  START_SNEAKING: 524288,       // 0x80000 - Start sneaking
  STOP_SNEAKING: 1048576,       // 0x100000 - Stop sneaking
  START_SWIMMING: 2097152,      // 0x200000 - Start swimming
  STOP_SWIMMING: 4194304,       // 0x400000 - Stop swimming
  START_JUMPING: 8388608,       // 0x800000 - Start jumping
  START_GLIDING: 16777216,      // 0x1000000 - Start gliding
  STOP_GLIDING: 33554432,       // 0x2000000 - Stop gliding
  INTERACT: 67108864,           // 0x4000000 - Interact
  ITEM_INTERACT: 134217728,     // 0x8000000 - Item interact
  BLOCK_ACTION: 268435456,      // 0x10000000 - Block action
  ITEM_STACK_REQUEST: 536870912, // 0x20000000 - Item stack request
  CLIENT_PREDICTED_VEHICLE: 1073741824 // 0x40000000 - Client predicted vehicle
} as const

export function inputFlags(
  { forward = false, back = false, left = false, right = false, jump = false, sprint = false, sneak = false }:
    { forward?: boolean; back?: boolean; left?: boolean; right?: boolean; jump?: boolean; sprint?: boolean; sneak?: boolean }
) {
  const f = new Set<string>()
  if (forward) f.add('ascend')
  if (back) f.add('descend')
  if (left) f.add('left')
  if (right) f.add('right')
  if (jump) f.add('jumping')
  if (sprint) f.add('sprinting')
  if (sneak) f.add('sneaking')
  return f
}

export function flagsToBits(f: Set<string> | string[]) {
  const s = (f instanceof Set) ? f : new Set(f)
  let bits = 0
  if (s.has('jumping')) bits |= INPUT.JUMPING
  if (s.has('sprinting')) bits |= INPUT.SPRINTING
  if (s.has('sneaking')) bits |= INPUT.SNEAKING
  if (s.has('ascend')) bits |= INPUT.ASCEND
  if (s.has('descend')) bits |= INPUT.DESCEND
  if (s.has('left')) bits |= INPUT.LEFT
  if (s.has('right')) bits |= INPUT.RIGHT
  return bits >>> 0
}

// --------- Random movement generator (world-space delta per tick @20Hz)
export type RandomMoverOptions = {
  maxSpeedBps?: number
  wanderPerTick?: number
  friction?: number
  pauseChancePerSecond?: number
  initialHeadingDeg?: number
  allowVertical?: boolean
  maxVerticalBps?: number
}

export function createRandomMoveVectorGenerator(opts: RandomMoverOptions = {}) {
  const {
    maxSpeedBps = 4.3,
    wanderPerTick = 0.10,
    friction = 0.14,
    pauseChancePerSecond = 0.15,
    initialHeadingDeg = Math.random() * 360,
    allowVertical = false,
    maxVerticalBps = 0.0
  } = opts

  let headingRad = initialHeadingDeg * Math.PI / 180
  let vx = 0, vy = 0, vz = 0
  const r1 = () => Math.random() * 2 - 1

  return function nextMoveVector(): Vec3 {
    const paused = Math.random() < pauseChancePerSecond * DT
    if (!paused) {
      headingRad += r1() * wanderPerTick
      const tvx = Math.sin(headingRad) * maxSpeedBps
      const tvz = Math.cos(headingRad) * maxSpeedBps
      const accel = 0.6
      vx += (tvx - vx) * accel * DT
      vz += (tvz - vz) * accel * DT
      if (allowVertical && maxVerticalBps > 0) {
        const tvy = r1() * maxVerticalBps * 0.2
        vy += (tvy - vy) * 0.4 * DT
      } else vy = 0
      vx *= (1 - friction)
      vz *= (1 - friction)
      vy *= (1 - friction * 0.5)
      const sp = Math.hypot(vx, vz)
      if (sp > maxSpeedBps) { const s = maxSpeedBps / sp; vx *= s; vz *= s }
    } else {
      vx *= (1 - friction * 1.2)
      vz *= (1 - friction * 1.2)
      vy *= (1 - friction * 0.8)
    }
    return { x: vx * DT, y: vy * DT, z: vz * DT }
  }
}

// --------- Build player_auth_input packet (camelCase keys for bedrock-protocol)
export function buildAuthInputPacket(params: {
  currentPos: Vec3
  currentRot: Rotation
  moveVector: Vec3            // world delta this tick
  tick: bigint                // client tick
  sprint?: boolean
  sneak?: boolean
}) {
  const { currentPos, currentRot, moveVector, tick, sprint = false, sneak = false } = params

  // 1) Advance position optimistically
  const newPos: Vec3 = {
    x: currentPos.x + moveVector.x,
    y: currentPos.y + moveVector.y,
    z: currentPos.z + moveVector.z
  }

  // 2) Face movement direction (keep if nearly stationary)
  const horizLen = Math.hypot(moveVector.x, moveVector.z)
  const yawDeg = (horizLen > 1e-6)
    ? normalizeAngleDeg(toDegrees(Math.atan2(-moveVector.x, moveVector.z))) // Bedrock 0° = -Z
    : currentRot.yaw
  const pitchDeg = (horizLen > 1e-6 || Math.abs(moveVector.y) > 1e-6)
    ? normalizeAngleDeg(-toDegrees(Math.atan2(moveVector.y, horizLen)))     // up => negative
    : currentRot.pitch

  const newRot: Rotation = { pitch: pitchDeg, yaw: yawDeg, headYaw: yawDeg }

  // 3) Local stick vector (strafe=X, forward=Y)
  const forwardMag = Math.min(1, horizLen)
  const moveVecLocal = { x: 0, y: forwardMag } // vec2f expected as {x,y}

  // 4) Input flag bits (forward if moving)
  const f = inputFlags({ forward: horizLen > 1e-6, sprint, sneak })
  const inputBits = flagsToBits(f)

  // 5) Packet with snake_case keys as required by Bedrock protocol
  const packet = {
    // rotation & position
    position: newPos,                      // vec3f
    pitch: newRot.pitch,                   // lf32
    yaw: newRot.yaw,                       // lf32
    head_yaw: newRot.headYaw,              // lf32 (snake_case)

    // movement & inputs
    move_vector: moveVecLocal,             // vec2f {x,y} (snake_case)
    input_data: inputBits,                 // varint/bitset (snake_case)
    input_mode: 0,                         // 0 = mouse/keyboard (snake_case)
    play_mode: 0,                          // 0 = normal (snake_case)
    interaction_model: 0,                  // (snake_case)

    // look direction when interacting
    interact_rotation: { x: newRot.pitch, y: newRot.yaw }, // vec2f (snake_case)

    // timing
    tick,                                  // varint64 (BigInt)

    // motion delta the client reports this tick
    delta: { x: moveVector.x, y: moveVector.y, z: moveVector.z }, // vec3f

    // Required fields for Bedrock 1.21.111 protocol
    analogue_move_vector: moveVecLocal,    // vec2f (snake_case) - REQUIRED!
    camera_orientation: { x: 0, y: 0, z: 0 }, // vec3f (snake_case) - REQUIRED!
    raw_move_vector: moveVecLocal          // vec2f (snake_case) - REQUIRED!
  }

  return {
    newState: {
      position: newPos,
      rotation: newRot
    },
    packet
  }
}
