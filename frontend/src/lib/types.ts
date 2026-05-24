export interface PiecePayload {
  r: number;
  c: number;
  side: boolean;
}

export interface TurnInfo {
  side: string;
  turn_type: string;
  actions_used: number;
  max_actions: number;
  last_action: string;
  turn_number: number;
  can_end_turn: boolean;
}

export interface Reserves {
  black: number;
  white: number;
}

export interface Outcome {
  winner: boolean | null;
  condition: string;
  reason: string;
}

export interface GameState {
  session_id: string;
  board: PiecePayload[];
  width: number;
  height: number;
  current_side: boolean | null;
  is_over: boolean;
  outcome: Outcome | null;
  turn_info: TurnInfo;
  reserves: Reserves;
  can_undo: boolean;
  can_redo: boolean;
}

export type MoveAction = "PLACE" | "MOVE" | "END_TURN";

export interface JoinResponse {
  side: boolean;
  session_id: string;
}

export interface LobbyStatus {
  player_false_joined: boolean;
  session_id: string;
}

export interface Coord {
  r: number;
  c: number;
}

export interface MoveRequest {
  action: MoveAction;
  start?: Coord;
  end?: Coord;
}
