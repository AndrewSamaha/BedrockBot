// movement.ts
// --------- Types
export type Vec3 = { x: number; y: number; z: number }
export type Rotation = { pitch: number; yaw: number; headYaw: number }

import type { InputDataFlags, InputMode, PlayMode, InteractionModel, Vector3D, Vector2D } from './types.js'

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

export function createInputDataFlags(
  { forward = false, back = false, left = false, right = false, jump = false, sprint = false, sneak = false }:
    { forward?: boolean; back?: boolean; left?: boolean; right?: boolean; jump?: boolean; sprint?: boolean; sneak?: boolean }
): InputDataFlags {
  let bits = 0

  // Set basic movement flags based on observed packet analysis
  if (forward) bits |= 0x1000000000000000 // forward movement flag
  if (back) bits |= 0x2000000000000000 // backward movement flag
  if (left) bits |= 0x4000000000000000 // left movement flag
  if (right) bits |= 0x8000000000000000 // right movement flag
  if (jump) bits |= INPUT.JUMPING
  if (sprint) bits |= INPUT.SPRINTING
  if (sneak) bits |= INPUT.SNEAKING

  // Set block_breaking_delay_enabled (always true in observed packets)
  bits |= 0x1000000000000 // block_breaking_delay_enabled flag (bit 48)

  return {
    _value: bits,
    ascend: forward,
    descend: back,
    north_jump: false,
    jump_down: false,
    sprint_down: false,
    change_height: false,
    jumping: jump,
    auto_jumping_in_water: false,
    sneaking: sneak,
    sneak_down: false,
    up: false,
    down: false,
    left: left,
    right: right,
    up_left: false,
    up_right: false,
    want_up: false,
    want_down: false,
    want_down_slow: false,
    want_up_slow: false,
    sprinting: sprint,
    ascend_block: false,
    descend_block: false,
    sneak_toggle_down: false,
    persist_sneak: false,
    start_sprinting: false,
    stop_sprinting: false,
    start_sneaking: false,
    stop_sneaking: false,
    start_swimming: false,
    stop_swimming: false,
    start_jumping: false,
    start_gliding: false,
    stop_gliding: false,
    item_interact: false,
    block_action: false,
    item_stack_request: false,
    handled_teleport: false,
    emoting: false,
    missed_swing: false,
    start_crawling: false,
    stop_crawling: false,
    start_flying: false,
    stop_flying: false,
    received_server_data: false,
    client_predicted_vehicle: false,
    paddling_left: false,
    paddling_right: false,
    block_breaking_delay_enabled: true,
    horizontal_collision: false,
    vertical_collision: false,
    down_left: false,
    down_right: false,
    start_using_item: false,
    camera_relative_movement_enabled: false,
    rot_controlled_by_move_direction: false,
    start_spin_attack: false,
    stop_spin_attack: false,
    hotbar_only_touch: false,
    jump_released_raw: false,
    jump_pressed_raw: false,
    jump_current_raw: false,
    sneak_released_raw: false,
    sneak_pressed_raw: false,
    sneak_current_raw: false
  }
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

// --------- Build player_auth_input packet (using proper types from analysis)
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
  const newPos: Vector3D = {
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

  // Head yaw can be different from body yaw (for looking around while moving)
  const headYawDeg = (horizLen > 1e-6) 
    ? normalizeAngleDeg(yawDeg + (Math.random() - 0.5) * 20) // Add some random head movement
    : yawDeg
  const newRot: Rotation = { pitch: pitchDeg, yaw: yawDeg, headYaw: headYawDeg }

  // 3) Local stick vector (strafe=X, forward=Z) - based on observed packet structure
  const forwardMag = Math.min(1, horizLen)
  const moveVecLocal: Vector2D = { x: 0, z: forwardMag } // vec2f expected as {x,z}

  // 4) Input data flags (using proper structure)
  const inputData = createInputDataFlags({
    forward: horizLen > 1e-6,
    sprint,
    sneak
  })

  // 5) Camera orientation (based on observed packets)
  const cameraOrientation: Vector3D = {
    x: Math.sin(yawDeg * Math.PI / 180) * Math.cos(pitchDeg * Math.PI / 180),
    y: -Math.sin(pitchDeg * Math.PI / 180),
    z: Math.cos(yawDeg * Math.PI / 180) * Math.cos(pitchDeg * Math.PI / 180)
  }

  // 6) Interaction rotation (based on observed packets)
  const interactRotation: Vector2D = {
    x: pitchDeg,
    z: yawDeg
  }

  // 7) Packet with proper structure matching observed packets
  const packet = {
    name: "player_auth_input",
    params: {
      // rotation & position
      position: newPos,                      // vec3f
      pitch: newRot.pitch,                   // lf32
      yaw: newRot.yaw,                       // lf32
      head_yaw: newRot.headYaw,              // lf32

      // movement & inputs
      move_vector: moveVecLocal,             // vec2f {x,z}
      analogue_move_vector: moveVecLocal,    // vec2f {x,z} - same as move_vector
      raw_move_vector: moveVecLocal,         // vec2f {x,z} - same as move_vector
      input_data: inputData,                 // InputDataFlags object
      input_mode: "mouse" as InputMode,      // string enum
      play_mode: "normal" as PlayMode,       // string enum
      interaction_model: "touch" as InteractionModel, // string enum

      // look direction when interacting
      interact_rotation: interactRotation,   // vec2f {x,z}

      // timing
      tick: tick,                            // BigInt (varint64)

      // motion delta the client reports this tick
      delta: { x: moveVector.x, y: moveVector.y, z: moveVector.z }, // vec3f

      // Camera orientation (required field)
      camera_orientation: cameraOrientation  // vec3f
    }
  }

  // Debug: Check for undefined values
  if (!packet.params.position || typeof packet.params.position.x !== 'number') {
    console.error('Position is invalid:', packet.params.position);
  }
  if (!packet.params.delta || typeof packet.params.delta.x !== 'number') {
    console.error('Delta is invalid:', packet.params.delta);
  }
  if (!packet.params.camera_orientation || typeof packet.params.camera_orientation.x !== 'number') {
    console.error('Camera orientation is invalid:', packet.params.camera_orientation);
  }

  return {
    newState: {
      position: newPos,
      rotation: newRot
    },
    packet
  }
}
