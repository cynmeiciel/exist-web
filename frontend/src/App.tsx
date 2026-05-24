import { useEffect, useState } from "react";
import Board from "./components/Board";
import SidePanel from "./components/SidePanel";
import {
  getState,
  getLobbyStatus,
  joinGame,
  newGame,
  postEndTurn,
  postMove,
  postRedo,
  postReset,
  postUndo,
} from "./lib/api";
import type { Coord, GameState } from "./lib/types";

type AppPhase = "lobby" | "waiting" | "playing";

const SID_KEY = "exist-session-id";
const SIDE_KEY = "exist-my-side";

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("lobby");
  const [state, setState] = useState<GameState | null>(null);
  const [mySide, setMySide] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Coord | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [joinInput, setJoinInput] = useState("");
  const [copied, setCopied] = useState(false);

  // Restore session from storage on mount
  useEffect(() => {
    const sid = localStorage.getItem(SID_KEY);
    const sideStr = localStorage.getItem(SIDE_KEY);
    if (!sid || sideStr === null) return;
    const side = sideStr === "true";
    getState(sid)
      .then((gs) => {
        setSessionId(sid);
        setMySide(side);
        setState(gs);
        setPhase("playing");
      })
      .catch(() => {
        localStorage.removeItem(SID_KEY);
        localStorage.removeItem(SIDE_KEY);
      });
  }, []);

  // Poll lobby until Player 2 joins
  useEffect(() => {
    if (phase !== "waiting" || !sessionId) return;
    const id = setInterval(() => {
      getLobbyStatus(sessionId)
        .then((lobby) => {
          if (lobby.player_false_joined) {
            return getState(sessionId).then((gs) => {
              setState(gs);
              setPhase("playing");
            });
          }
        })
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(id);
  }, [phase, sessionId]);

  // Poll for state updates when it's the opponent's turn
  useEffect(() => {
    if (phase !== "playing" || !sessionId || !state) return;
    if (state.is_over || state.current_side === mySide) return;
    const id = setInterval(() => {
      getState(sessionId)
        .then(setState)
        .catch(() => undefined);
    }, 2000);
    return () => clearInterval(id);
  }, [phase, sessionId, state?.current_side, mySide, state?.is_over]);

  async function handleCreateGame() {
    try {
      const gs = await newGame();
      localStorage.setItem(SID_KEY, gs.session_id);
      localStorage.setItem(SIDE_KEY, "true");
      setSessionId(gs.session_id);
      setMySide(true);
      setState(gs);
      setMessage(null);
      setPhase("waiting");
    } catch (e) {
      setMessage(`Failed to create game: ${(e as Error).message}`);
    }
  }

  async function handleJoinGame() {
    const sid = joinInput.trim();
    if (!sid) return;
    try {
      const joinRes = await joinGame(sid);
      const gs = await getState(sid);
      localStorage.setItem(SID_KEY, sid);
      localStorage.setItem(SIDE_KEY, String(joinRes.side));
      setSessionId(sid);
      setMySide(joinRes.side);
      setState(gs);
      setJoinInput("");
      setMessage(null);
      setPhase("playing");
    } catch (e) {
      setMessage(`Failed to join: ${(e as Error).message}`);
    }
  }

  function handleLeaveGame() {
    localStorage.removeItem(SID_KEY);
    localStorage.removeItem(SIDE_KEY);
    setSessionId(null);
    setMySide(null);
    setState(null);
    setSelected(null);
    setMessage(null);
    setJoinInput("");
    setPhase("lobby");
  }

  async function withErrorHandling(
    action: () => Promise<GameState>,
  ): Promise<void> {
    try {
      const next = await action();
      setState(next);
      setSelected(null);
      setMessage(null);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  function pieceAt(target: Coord): boolean | null {
    if (!state) return null;
    const piece = state.board.find((p) => p.r === target.r && p.c === target.c);
    return piece ? piece.side : null;
  }

  async function handleCellClick(r: number, c: number) {
    if (!state || state.is_over || !sessionId) return;
    if (state.current_side !== mySide) return;
    const target: Coord = { r, c };
    const occupant = pieceAt(target);

    if (selected) {
      if (occupant === state.current_side) {
        setSelected(target);
        setMessage(null);
        return;
      }
      await withErrorHandling(() =>
        postMove(sessionId, { action: "MOVE", start: selected, end: target }),
      );
      return;
    }

    if (occupant === state.current_side) {
      setSelected(target);
      setMessage(null);
      return;
    }

    if (occupant === null) {
      await withErrorHandling(() =>
        postMove(sessionId, { action: "PLACE", end: target }),
      );
    }
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  if (phase === "lobby") {
    return (
      <main className="lobby">
        <h1>Exist</h1>
        <p className="layout__subtitle">
          Place from reserve. Move adjacently. Force lines and crowds to capture.
        </p>
        <div className="lobby__actions">
          <button className="lobby__btn-primary" onClick={handleCreateGame}>
            Create New Game
          </button>
          <div className="lobby__divider">or join an existing game</div>
          <div className="lobby__join">
            <input
              type="text"
              className="lobby__input"
              placeholder="Game code"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void handleJoinGame()}
            />
            <button onClick={() => void handleJoinGame()}>Join</button>
          </div>
        </div>
        {message && <p className="panel__message">{message}</p>}
      </main>
    );
  }

  // ── Waiting ────────────────────────────────────────────────────────────────

  if (phase === "waiting") {
    return (
      <main className="lobby">
        <h1>Exist</h1>
        <p>Share this code with your opponent:</p>
        <code className="lobby__code">{sessionId}</code>
        <button
          className="lobby__btn-copy"
          onClick={() => {
            void navigator.clipboard.writeText(sessionId ?? "");
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied!" : "Copy Code"}
        </button>
        <p className="lobby__waiting">Waiting for opponent to join…</p>
        <button className="lobby__btn-back" onClick={handleLeaveGame}>
          Cancel
        </button>
      </main>
    );
  }

  // ── Playing ────────────────────────────────────────────────────────────────

  if (!state) return <main className="loading">Loading…</main>;

  const isMyTurn = state.current_side === mySide;
  const sideLabel = mySide ? "Black" : "White";

  return (
    <main className="layout">
      <header className="layout__header">
        <h1>Exist</h1>
        <p className="layout__subtitle">
          Place from reserve. Move adjacently. Force lines and crowds to capture.
        </p>
        <p className={`layout__turn-badge ${isMyTurn ? "layout__turn-badge--mine" : "layout__turn-badge--theirs"}`}>
          You are <strong>{sideLabel}</strong>
          {" — "}
          {state.is_over ? "Game over" : isMyTurn ? "your turn" : "opponent's turn"}
        </p>
      </header>
      <div className="layout__content">
        <Board
          state={state}
          selected={selected}
          isMyTurn={isMyTurn}
          onCellClick={handleCellClick}
        />
        <SidePanel
          state={state}
          message={message}
          isMyTurn={isMyTurn}
          onEndTurn={() => withErrorHandling(() => postEndTurn(sessionId!))}
          onUndo={() => withErrorHandling(() => postUndo(sessionId!))}
          onRedo={() => withErrorHandling(() => postRedo(sessionId!))}
          onReset={() => withErrorHandling(() => postReset(sessionId!))}
          onNewGame={handleLeaveGame}
        />
      </div>
    </main>
  );
}
