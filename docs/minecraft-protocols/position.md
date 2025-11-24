## Position Tracking
These packets are sent by the server to tell the client its current position

move_player <- seems to happen on teleport

{
  "name": "move_player",
  "params": {
    "head_yaw": -142.75982666015625,
    "mode": "teleport",
    "on_ground": true,
    "pitch": -3.872848510742187,
    "position": {
      "x": 28.5023250579834,
      "y": -58.37998962402344,
      "z": 6.685443878173828
    },
    "ridden_runtime_id": 0,
    "runtime_id": 221,
    "teleport": {
      "cause": "command",
      "source_entity_type": 1
    },
    "tick": "1659",
    "yaw": -142.75982666015625
  }
}

correct_player_move_prediction   <-- not sure when this happens?
{
  "name": "correct_player_move_prediction",
  "params": {
    "delta": {
      "x": 0,
      "y": 0,
      "z": 0
    },
    "on_ground": true,
    "position": {
      "x": 28.5023250579834,
      "y": -58.37998962402344,
      "z": 6.685443878173828
    },
    "prediction_type": "player",
    "rotation": {
      "x": 0,
      "z": 0
    },
    "tick": "1660"
  }
}

move_entity_delta

