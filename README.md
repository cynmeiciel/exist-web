# Exist Web

A web frontend for the **Exist** board game, built on top of the
[CynMeith](https://github.com/cynmeiciel/CynMeith) engine.

- **Backend:** FastAPI + the `cynmeith` library
- **Frontend:** Vite + React + TypeScript
- **Multiplayer:** two players connect from separate machines, state syncs via polling

## Layout

```
exist-web/
├── backend/
│   ├── main.py         # FastAPI app and routes
│   ├── session.py      # In-memory session store (keyed by uuid)
│   ├── schemas.py      # Pydantic request/response models
│   ├── serializers.py  # ExistGame → JSON
│   └── tests/          # API smoke tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Lobby / Waiting / Playing state machine
│   │   ├── components/       # Board.tsx, SidePanel.tsx
│   │   └── lib/              # api.ts, types.ts
│   ├── vite.config.ts        # proxies /api → backend in dev
│   └── .env.example          # template for VITE_API_URL
└── pyproject.toml
```

Game logic (`ExistGame`, managers, turn policy, pieces, yaml) lives in the
CynMeith repo at `cynmeith/games/exist/` — this project only imports it.

## The CynMeith dependency

`cynmeith` is the board-game engine; `examples/exist/` (inside the CynMeith
repo) is where the Exist game rules live.

This project uses CynMeith as a **git submodule**. An editable install
(`pip install -e ./CynMeith`) does two things at once:

1. Installs the `cynmeith` framework package.
2. Adds the `CynMeith/` directory to `sys.path`, which makes `examples`
   importable — so `from examples.exist.game import ExistGame` works without
   copying any game code here.

The Tk UI code in `examples/exist/` is loaded lazily (only inside
`build_game_spec()`), so importing `ExistGame` on a server without Tk is safe.

### First-time setup

```bash
git clone --recurse-submodules https://github.com/<you>/exist-web.git
cd exist-web
python -m venv .venv && source .venv/bin/activate
pip install -e ./CynMeith
pip install -e '.[dev]'
```

If you already cloned without `--recurse-submodules`:

```bash
git submodule update --init --recursive
```

### Updating to the latest CynMeith

```bash
cd CynMeith && git pull && cd ..
git add CynMeith && git commit -m "bump CynMeith"
pip install -e ./CynMeith   # re-install to pick up changes
```

### Pinning to a specific commit

The submodule pointer in `.gitmodules` / `git submodule status` is the pin.
Commit whatever `CynMeith/` HEAD you want; Render will check out that exact commit.

## Running locally

### Backend

```bash
# (after cloning with --recurse-submodules, or after git submodule update --init)
cd exist-web
python -m venv .venv && source .venv/bin/activate
pip install -e ./CynMeith
pip install -e '.[dev]'

uvicorn backend.main:app --reload
```

API docs: <http://127.0.0.1:8000/docs>

### Frontend

```bash
cd exist-web/frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The Vite dev server proxies `/api/*` to the FastAPI backend.

## Tests

```bash
cd exist-web
.venv/bin/python -m pytest backend/tests
```

## How to play online

1. Both players open the deployed frontend URL.
2. **Player 1** clicks **Create New Game** and copies the game code shown.
3. **Player 2** pastes the code into the *Join* box and clicks **Join**.
4. State syncs automatically every 2 s while waiting for the opponent's move.

Each browser remembers its session and side (`localStorage`). Closing and
reopening the tab resumes the same game.

## Deploy (Render + Vercel)

### 1 — Push to GitHub

```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/<you>/exist-web.git
git push -u origin main
```

### 2 — Backend on Render

| Setting | Value |
|---|---|
| Runtime | Python |
| Build command | `pip install -e .` |
| Start command | `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` |

Note the service URL after deploy, e.g. `https://exist-web.onrender.com`.

### 3 — Frontend on Vercel

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Framework | Vite (auto-detected) |
| Environment variable | `VITE_API_URL = https://exist-web.onrender.com` |

Vercel embeds `VITE_API_URL` at build time so the browser calls the Render backend directly.

## API summary

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/game/new` | Create a session, return state (Player 1 = `true` side). |
| POST | `/api/game/{id}/join` | Player 2 joins; returns `{ side: false, session_id }`. Returns 409 if already full. |
| GET | `/api/game/{id}/lobby` | Poll until `player_false_joined` is `true`. |
| GET | `/api/game/{id}/state` | Fetch current state. |
| POST | `/api/game/{id}/move` | Apply PLACE / MOVE / END_TURN. |
| POST | `/api/game/{id}/undo` | Undo last action. |
| POST | `/api/game/{id}/redo` | Redo previously undone action. |
| POST | `/api/game/{id}/reset` | Reset the game to its initial state. |
| DELETE | `/api/game/{id}` | Delete the session. |
| GET | `/api/health` | Liveness + active session count. |

`/api/game/{id}/move` payload:

```json
{ "action": "PLACE", "end": { "r": 3, "c": 3 } }
{ "action": "MOVE", "start": { "r": 3, "c": 3 }, "end": { "r": 4, "c": 4 } }
{ "action": "END_TURN" }
```

## Session lifecycle

- Sessions idle for more than an hour are evicted opportunistically on the next access.
- Each session has its own `threading.Lock` so concurrent requests serialise without blocking other sessions.
- `max_history=100` bounds per-session undo depth and memory.

## Where the game logic lives

All rule code (`ExistGame`, `exist_manager.py`, `exist_turn_policy.py`,
`piece.py`, `reserve_manager.py`, `exist.yaml`) lives in
**`CynMeith/examples/exist/`** — this project imports from there directly.

- To change the rules: edit CynMeith, commit, then `cd CynMeith && git pull` here.
- `build_game_spec()` in that module is the Tk UI entry point; its imports are
  lazy so the web server never touches Tk.
