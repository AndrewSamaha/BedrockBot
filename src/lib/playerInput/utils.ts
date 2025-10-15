export const inputFlags = ({ forward = false, back = false, left = false, right = false, jump = false, sprint = false }) => {
  const flags = new Set()
  if (forward) flags.add('up')         // naming varies by lib: up/forward
  if (back) flags.add('down')
  if (left) flags.add('left')
  if (right) flags.add('right')
  if (jump) flags.add('jumping')
  if (sprint) flags.add('sprinting')
  return flags
}

// Math + types helpers
type Vec3 = { x: number; y: number; z: number }
type Vec2 = { x: number; y: number }
type Rotation = { pitch: number; yaw: number; head_yaw: number }

function toDegrees(rad: number) { return rad * (180 / Math.PI) }
function normalizeAngleDeg(a: number) {
  // Normalize to [-180, 180) which Bedrock tolerates well
  let r = ((a + 180) % 360 + 360) % 360 - 180
  return r
}

/**
 * Given current state and a world-space movement delta for this tick,
 * returns the next state AND a player_auth_input packet object.
 *
 * Assumptions:
 * - moveVector is a world delta per tick (units: blocks). If you’d rather pass
 *   a velocity or local stick vector, adapt where noted below.
 * - Facing rules: the bot always faces where it moves horizontally.
 * - Pitch follows the slope of the moveVector (upward = negative pitch).
 */
export function buildAuthInputPacket(params: {
  currentPos: Vec3,
  currentRot: Rotation,    // ignored for the new facing, but used if standing still
  moveVector: Vec3,        // world delta for this tick
  tick: bigint,            // monotonically increasing client tick
  // optional flags
  sprint?: boolean,
  sneak?: boolean
}) {
  const { currentPos, currentRot, moveVector, tick, sprint = false, sneak = false } = params

  // --- 1) Compute new position
  const newPos: Vec3 = {
    x: currentPos.x + moveVector.x,
    y: currentPos.y + moveVector.y,
    z: currentPos.z + moveVector.z
  }

  // --- 2) Compute facing from movement (world -> yaw/pitch)
  const horizLen = Math.hypot(moveVector.x, moveVector.z)

  // Bedrock yaw degrees: 0 faces -Z. Using atan2(-dx, dz) matches that convention.
  // If not moving horizontally, keep previous yaw/head_yaw.
  const yawDeg = horizLen > 1e-6
    ? normalizeAngleDeg(toDegrees(Math.atan2(-moveVector.x, moveVector.z)))
    : currentRot.yaw

  // Bedrock pitch degrees: positive looks downward. Up movement (dy>0) => negative pitch.
  const pitchDeg = (horizLen > 1e-6 || Math.abs(moveVector.y) > 1e-6)
    ? normalizeAngleDeg(-toDegrees(Math.atan2(moveVector.y, horizLen)))
    : currentRot.pitch

  const headYawDeg = yawDeg

  const newRot: Rotation = {
    pitch: pitchDeg,
    yaw: yawDeg,
    head_yaw: headYawDeg
  }

  // --- 3) Build input flags (Bedrock’s client-auth input expects bitflags)
  // Using a common string-array style many libs convert to a bitset internally.
  const inputFlags: string[] = []
  // We’re “pressing forward” since we face the move direction
  if (horizLen > 1e-6) inputFlags.push('up')
  if (sprint) inputFlags.push('sprinting')
  if (sneak) inputFlags.push('sneaking')
  if (moveVector.y > 0.25) inputFlags.push('jumping')     // crude jump heuristic

  // --- 4) Local analog stick vector (relative to facing)
  // Because we force yaw to point along movement, the local forward is Z+.
  // Magnitude is capped to [0, 1] like a stick.
  const forwardMag = Math.min(1, horizLen) // treat “blocks per tick” as stick magnitude
  const moveVecLocal: { x: number, z: number } = { x: 0, z: forwardMag }

  // Optional “analog” and “raw” move fields (several servers/libs use these):
  const analogMove = { x: moveVecLocal.x, z: moveVecLocal.z }
  const rawMove: { x: number, y: number } = { x: 0, y: forwardMag } // some stacks use a Vec2 as (strafe, forward)

  // --- 5) Per-tick delta the client reports (often echoed from your integration)
  const delta: Vec3 = { ...moveVector }

  // --- 6) Shape the player_auth_input packet (Bedrock 1.21.100+)
  // Field names align with widely used Bedrock libs. If your lib’s keys differ slightly,
  // rename them but keep the values the same.
  let packet = {
    // id 0x90 (player_auth_input)
    position: newPos,                         // vec3f
    pitch: newRot.pitch,                      // lf32
    yaw: newRot.yaw,                          // lf32
    head_yaw: newRot.head_yaw,                // lf32

    // local movement vector (stick): strafe=X, forward=Z
    move_vector: { x: moveVecLocal.x, z: moveVecLocal.z }, // vec2f

    // bitflags (library usually maps these string labels to the proper bitset)
    input_data: inputFlags,

    // typical defaults
    input_mode: 0,          // 0 = mouse/keyboard; set per your client
    play_mode: 0,           // 0 = normal
    interaction_model: 0,   // some libs call this interactionMode

    // where you’re looking when interacting; reuse yaw/pitch
    interact_rotation: { x: newRot.pitch, y: newRot.yaw }, // vec2f

    tick,                   // varlong / long

    // motion delta the client believes it applied this tick
    delta,                  // vec3f

    // optional extras seen in multiple stacks:
    analog_move_vector: analogMove,          // vec2f
    camera_orientation: { x: 0, y: 0, z: 0 },// vec3f (unused here)
    raw_move: rawMove                         // vec2f
  }

  // Common bits used by server impls. Adjust if your lib uses different mapping.
  const INPUT = {
    JUMPING: 1 << 0,
    SPRINTING: 1 << 1,
    SNEAKING: 1 << 2,
    UP: 1 << 3,  // forward
    DOWN: 1 << 4,  // backward
    LEFT: 1 << 5,
    RIGHT: 1 << 6
  }
  function flagsToBits(flags: Set<string> | string[]) {
    const f = (flags instanceof Set) ? flags : new Set(flags)
    let bits = 0
    if (f.has('jumping')) bits |= INPUT.JUMPING
    if (f.has('sprinting')) bits |= INPUT.SPRINTING
    if (f.has('sneaking')) bits |= INPUT.SNEAKING
    if (f.has('up')) bits |= INPUT.UP
    if (f.has('down')) bits |= INPUT.DOWN
    if (f.has('left')) bits |= INPUT.LEFT
    if (f.has('right')) bits |= INPUT.RIGHT
    return bits
  }
  packet = {
    position: newPos,                   // vec3f
    pitch: newRot.pitch,                // lf32
    yaw: newRot.yaw,                    // lf32
    headYaw: newRot.head_yaw,           // lf32

    // vec2f expects { x, y }  (use y for "forward")
    moveVector: { x: moveVecLocal.x, y: moveVecLocal.z },

    // bitset number, not string array (see helper below)
    inputData: flagsToBits(flags),

    inputMode: 0,
    playMode: 0,
    interactionModel: 0,

    interactRotation: { x: newRot.pitch, y: newRot.yaw }, // vec2f
    tick,                                // varlong
    delta: { x: delta.x, y: delta.y, z: delta.z },        // vec3f

    analogMoveVector: { x: moveVecLocal.x, y: moveVecLocal.z }, // vec2f
    cameraOrientation: { x: 0, y: 0, z: 0 },                     // vec3f

    // different stacks call this rawMoveVector / rawMove
    rawMoveVector: { x: 0, y: forwardMag } // vec2f
  }
  return {
    newState: {
      position: newPos,
      rotation: newRot
    },
    packet
  }
}

