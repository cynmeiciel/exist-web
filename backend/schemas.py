from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CoordPayload(BaseModel):
    r: int
    c: int


class PiecePayload(BaseModel):
    r: int
    c: int
    side: bool


class TurnInfoPayload(BaseModel):
    side: str
    turn_type: str
    actions_used: int
    max_actions: int
    last_action: str
    turn_number: int
    can_end_turn: bool


class ReservesPayload(BaseModel):
    black: int
    white: int


class OutcomePayload(BaseModel):
    winner: bool | None
    condition: str
    reason: str


class GameStatePayload(BaseModel):
    session_id: str
    board: list[PiecePayload]
    width: int
    height: int
    current_side: bool | None
    is_over: bool
    outcome: OutcomePayload | None
    turn_info: TurnInfoPayload
    reserves: ReservesPayload
    can_undo: bool
    can_redo: bool


MoveAction = Literal["PLACE", "MOVE", "END_TURN"]


class MoveRequest(BaseModel):
    action: MoveAction
    start: CoordPayload | None = Field(
        default=None, description="Required for MOVE actions; ignored otherwise."
    )
    end: CoordPayload | None = Field(
        default=None, description="Required for PLACE and MOVE actions."
    )


class NewGameResponse(GameStatePayload):
    pass


class JoinResponse(BaseModel):
    side: bool
    session_id: str


class LobbyStatus(BaseModel):
    player_false_joined: bool
    session_id: str


class ErrorResponse(BaseModel):
    detail: str
