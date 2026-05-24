from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from cynmeith.utils import Coord
from cynmeith.utils.aliases import InvalidMoveError, MoveHistoryError

from .schemas import GameStatePayload, JoinResponse, LobbyStatus, MoveRequest
from .serializers import serialize_game
from .session import SessionStore

app = FastAPI(title="Exist Web", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

store = SessionStore()


def _require_session(session_id: str):
    entry = store.get(session_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return entry


@app.post("/api/game/new", response_model=GameStatePayload)
def new_game() -> GameStatePayload:
    session_id, entry = store.create()
    return serialize_game(session_id, entry.game)


@app.get("/api/game/{session_id}/state", response_model=GameStatePayload)
def get_state(session_id: str) -> GameStatePayload:
    entry = _require_session(session_id)
    with entry.lock:
        return serialize_game(session_id, entry.game)


@app.post("/api/game/{session_id}/move", response_model=GameStatePayload)
def make_move(session_id: str, payload: MoveRequest) -> GameStatePayload:
    entry = _require_session(session_id)
    with entry.lock:
        game = entry.game
        try:
            if payload.action == "END_TURN":
                game.end_turn()
            elif payload.action == "PLACE":
                if payload.end is None:
                    raise HTTPException(
                        status_code=400, detail="PLACE requires an end coordinate."
                    )
                game.move(
                    Coord.null(),
                    Coord(payload.end.r, payload.end.c),
                    "PLACE",
                )
            elif payload.action == "MOVE":
                if payload.start is None or payload.end is None:
                    raise HTTPException(
                        status_code=400,
                        detail="MOVE requires start and end coordinates.",
                    )
                game.move(
                    Coord(payload.start.r, payload.start.c),
                    Coord(payload.end.r, payload.end.c),
                    "MOVE",
                )
        except InvalidMoveError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return serialize_game(session_id, game)


@app.post("/api/game/{session_id}/undo", response_model=GameStatePayload)
def undo(session_id: str) -> GameStatePayload:
    entry = _require_session(session_id)
    with entry.lock:
        try:
            entry.game.undo_move()
        except MoveHistoryError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return serialize_game(session_id, entry.game)


@app.post("/api/game/{session_id}/redo", response_model=GameStatePayload)
def redo(session_id: str) -> GameStatePayload:
    entry = _require_session(session_id)
    with entry.lock:
        try:
            entry.game.redo_move()
        except MoveHistoryError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        return serialize_game(session_id, entry.game)


@app.post("/api/game/{session_id}/reset", response_model=GameStatePayload)
def reset(session_id: str) -> GameStatePayload:
    entry = _require_session(session_id)
    with entry.lock:
        entry.game.reset()
        return serialize_game(session_id, entry.game)


@app.delete("/api/game/{session_id}", status_code=204)
def delete_session(session_id: str) -> None:
    if not store.delete(session_id):
        raise HTTPException(status_code=404, detail="Session not found.")


@app.post("/api/game/{session_id}/join", response_model=JoinResponse)
def join_game(session_id: str) -> JoinResponse:
    entry = _require_session(session_id)
    with entry.lock:
        if entry.player_false_joined:
            raise HTTPException(status_code=409, detail="Game already has two players.")
        entry.player_false_joined = True
        return JoinResponse(side=False, session_id=session_id)


@app.get("/api/game/{session_id}/lobby", response_model=LobbyStatus)
def lobby_status(session_id: str) -> LobbyStatus:
    entry = _require_session(session_id)
    return LobbyStatus(
        player_false_joined=entry.player_false_joined,
        session_id=session_id,
    )


@app.get("/api/health")
def health() -> dict[str, str | int]:
    return {"status": "ok", "active_sessions": len(store)}
