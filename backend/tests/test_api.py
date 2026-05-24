from fastapi.testclient import TestClient

from backend.main import app, store

client = TestClient(app)


def setup_function() -> None:
    store._sessions.clear()


def test_new_game_returns_empty_board() -> None:
    response = client.post("/api/game/new")
    assert response.status_code == 200
    payload = response.json()

    assert payload["board"] == []
    assert payload["width"] == 8
    assert payload["height"] == 8
    assert payload["current_side"] is True
    assert payload["reserves"] == {"black": 8, "white": 8}
    assert payload["is_over"] is False
    assert payload["can_undo"] is False


def test_place_then_undo_roundtrip() -> None:
    session_id = client.post("/api/game/new").json()["session_id"]

    placed = client.post(
        f"/api/game/{session_id}/move",
        json={"action": "PLACE", "end": {"r": 3, "c": 3}},
    )
    assert placed.status_code == 200
    placed_payload = placed.json()
    assert {"r": 3, "c": 3, "side": True} in placed_payload["board"]
    assert placed_payload["reserves"]["black"] == 7
    assert placed_payload["can_undo"] is True

    undone = client.post(f"/api/game/{session_id}/undo").json()
    assert undone["board"] == []
    assert undone["reserves"]["black"] == 8
    assert undone["can_undo"] is False
    assert undone["can_redo"] is True


def test_invalid_move_returns_400() -> None:
    session_id = client.post("/api/game/new").json()["session_id"]

    bad = client.post(
        f"/api/game/{session_id}/move",
        json={"action": "MOVE", "start": {"r": 0, "c": 0}, "end": {"r": 1, "c": 1}},
    )
    assert bad.status_code == 400


def test_unknown_session_returns_404() -> None:
    response = client.get("/api/game/does-not-exist/state")
    assert response.status_code == 404
