// types.ts
// TypeScript type definitions for player_auth_input packets based on captured JSON logs

/**
 * Vector3D represents a 3D position or direction with x, y, z coordinates
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Vector2D represents a 2D position or direction with x, z coordinates
 */
export interface Vector2D {
  x: number;
  z: number;
}

/**
 * InputDataFlags represents all the boolean input flags in the player_auth_input packet
 * Based on the captured JSON logs, these are all the input flags that can be set
 */
export interface InputDataFlags {
  _value: string; // The raw bit value as a string
  ascend: boolean;
  descend: boolean;
  north_jump: boolean;
  jump_down: boolean;
  sprint_down: boolean;
  change_height: boolean;
  jumping: boolean;
  auto_jumping_in_water: boolean;
  sneaking: boolean;
  sneak_down: boolean;
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  up_left: boolean;
  up_right: boolean;
  want_up: boolean;
  want_down: boolean;
  want_down_slow: boolean;
  want_up_slow: boolean;
  sprinting: boolean;
  ascend_block: boolean;
  descend_block: boolean;
  sneak_toggle_down: boolean;
  persist_sneak: boolean;
  start_sprinting: boolean;
  stop_sprinting: boolean;
  start_sneaking: boolean;
  stop_sneaking: boolean;
  start_swimming: boolean;
  stop_swimming: boolean;
  start_jumping: boolean;
  start_gliding: boolean;
  stop_gliding: boolean;
  item_interact: boolean;
  block_action: boolean;
  item_stack_request: boolean;
  handled_teleport: boolean;
  emoting: boolean;
  missed_swing: boolean;
  start_crawling: boolean;
  stop_crawling: boolean;
  start_flying: boolean;
  stop_flying: boolean;
  received_server_data: boolean;
  client_predicted_vehicle: boolean;
  paddling_left: boolean;
  paddling_right: boolean;
  block_breaking_delay_enabled: boolean;
  horizontal_collision: boolean;
  vertical_collision: boolean;
  down_left: boolean;
  down_right: boolean;
  start_using_item: boolean;
  camera_relative_movement_enabled: boolean;
  rot_controlled_by_move_direction: boolean;
  start_spin_attack: boolean;
  stop_spin_attack: boolean;
  hotbar_only_touch: boolean;
  jump_released_raw: boolean;
  jump_pressed_raw: boolean;
  jump_current_raw: boolean;
  sneak_released_raw: boolean;
  sneak_pressed_raw: boolean;
  sneak_current_raw: boolean;
}

/**
 * InputMode represents the input method being used
 * Based on logs: "mouse" is the observed value
 */
export type InputMode = "mouse" | "touch" | "gamepad" | "motion_controller";

/**
 * PlayMode represents the current play mode
 * Based on logs: "normal" and "screen" are observed values
 */
export type PlayMode = "normal" | "screen" | "vr";

/**
 * InteractionModel represents the interaction model
 * Based on logs: "touch" is the observed value
 */
export type InteractionModel = "touch" | "mouse" | "gamepad";

/**
 * PlayerAuthInputParams represents the core parameters of a player_auth_input packet
 * This matches the structure found in the captured JSON logs
 */
export interface PlayerAuthInputParams {
  // Rotation and position
  pitch: number;
  yaw: number;
  position: Vector3D;
  head_yaw: number;

  // Movement
  move_vector: Vector2D;
  analogue_move_vector: Vector2D;
  raw_move_vector: Vector2D;

  // Input data
  input_data: InputDataFlags;
  input_mode: InputMode;
  play_mode: PlayMode;
  interaction_model: InteractionModel;

  // Interaction
  interact_rotation: Vector2D;

  // Timing
  tick: string; // Appears as string in logs, likely varint64

  // Motion delta
  delta: Vector3D;

  // Camera orientation
  camera_orientation: Vector3D;
}

/**
 * PlayerAuthInputPacket represents the complete player_auth_input packet structure
 * This matches the structure found in the captured JSON logs
 */
export interface PlayerAuthInputPacket {
  name: "player_auth_input";
  params: PlayerAuthInputParams;
}

/**
 * LogEntry represents a single log entry from the captured JSON logs
 * Contains timestamp, direction, and the actual packet
 */
export interface LogEntry {
  timestamp: string;
  serverbound: string;
  packet: PlayerAuthInputPacket;
}

/**
 * Simplified input flags for easier manipulation
 * Contains only the most commonly used movement flags
 */
export interface SimpleInputFlags {
  forward?: boolean;
  back?: boolean;
  left?: boolean;
  right?: boolean;
  jump?: boolean;
  sprint?: boolean;
  sneak?: boolean;
  up?: boolean;
  down?: boolean;
}

/**
 * Movement state for tracking player position and rotation
 */
export interface MovementState {
  position: Vector3D;
  rotation: {
    pitch: number;
    yaw: number;
    headYaw: number;
  };
}

/**
 * Helper type for creating movement vectors
 */
export interface MovementVector {
  x: number;
  z: number;
}

/**
 * Helper type for creating rotation data
 */
export interface RotationData {
  pitch: number;
  yaw: number;
  headYaw: number;
}