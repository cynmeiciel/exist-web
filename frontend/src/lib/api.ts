import type { GameState, JoinResponse, LobbyStatus, MoveRequest } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const BASE = `${API_BASE}/api/game`;

async function expectOk(response: Response): Promise<GameState> {
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await response.json()) as GameState;
}

export async function newGame(): Promise<GameState> {
  return expectOk(await fetch(`${BASE}/new`, { method: "POST" }));
}

export async function getState(sessionId: string): Promise<GameState> {
  return expectOk(await fetch(`${BASE}/${sessionId}/state`));
}

export async function postMove(
  sessionId: string,
  payload: MoveRequest,
): Promise<GameState> {
  return expectOk(
    await fetch(`${BASE}/${sessionId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function postEndTurn(sessionId: string): Promise<GameState> {
  return postMove(sessionId, { action: "END_TURN" });
}

export async function postUndo(sessionId: string): Promise<GameState> {
  return expectOk(await fetch(`${BASE}/${sessionId}/undo`, { method: "POST" }));
}

export async function postRedo(sessionId: string): Promise<GameState> {
  return expectOk(await fetch(`${BASE}/${sessionId}/redo`, { method: "POST" }));
}

export async function postReset(sessionId: string): Promise<GameState> {
  return expectOk(await fetch(`${BASE}/${sessionId}/reset`, { method: "POST" }));
}

export async function joinGame(sessionId: string): Promise<JoinResponse> {
  const res = await fetch(`${BASE}/${sessionId}/join`, { method: "POST" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return (await res.json()) as JoinResponse;
}

export async function getLobbyStatus(sessionId: string): Promise<LobbyStatus> {
  const res = await fetch(`${BASE}/${sessionId}/lobby`);
  if (!res.ok) throw new Error("Session not found");
  return (await res.json()) as LobbyStatus;
}
