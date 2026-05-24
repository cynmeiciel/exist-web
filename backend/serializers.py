from __future__ import annotations

from examples.exist.game import ExistGame

from .schemas import (
    GameStatePayload,
    OutcomePayload,
    PiecePayload,
    ReservesPayload,
    TurnInfoPayload,
)


def serialize_game(session_id: str, game: ExistGame) -> GameStatePayload:
    """Render the current ExistGame state into a JSON-friendly payload."""

    pieces = [
        PiecePayload(r=position.r, c=position.c, side=piece.side)
        for position, piece in game.board.iter_enumerate()
        if piece is not None
    ]

    raw_turn_info = game.turn_policy.get_turn_info()
    turn_info = TurnInfoPayload(
        side=str(raw_turn_info.get("side", "")),
        turn_type=str(raw_turn_info.get("turn_type", "")),
        actions_used=int(raw_turn_info.get("actions_used", 0)),
        max_actions=int(raw_turn_info.get("max_actions", 0)),
        last_action=str(raw_turn_info.get("last_action", "None")),
        turn_number=int(raw_turn_info.get("turn_number", 0)),
        can_end_turn=bool(raw_turn_info.get("can_end_turn", False)),
    )

    reserves = ReservesPayload(
        black=game.reserves.get_count(True),
        white=game.reserves.get_count(False),
    )

    outcome: OutcomePayload | None = None
    if game.outcome is not None:
        outcome = OutcomePayload(
            winner=game.outcome.winner,
            condition=game.outcome.condition,
            reason=game.outcome.reason,
        )

    return GameStatePayload(
        session_id=session_id,
        board=pieces,
        width=game.board.width,
        height=game.board.height,
        current_side=game.current_side,
        is_over=game.is_over,
        outcome=outcome,
        turn_info=turn_info,
        reserves=reserves,
        can_undo=len(game._state_snapshots) > 1,
        can_redo=len(game._redo_state_snapshots) > 0,
    )
