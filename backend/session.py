from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass

from examples.exist.game import ExistGame


@dataclass
class SessionEntry:
    game: ExistGame
    lock: threading.Lock
    last_touched: float
    player_false_joined: bool = False


class SessionStore:
    """
    In-memory store of active ExistGame sessions.

    Each session has its own lock so concurrent requests against the same
    game serialise correctly without blocking other sessions. Sessions
    that haven't been touched within `idle_seconds` are evicted on
    access; the cleanup is opportunistic so we don't need a background
    task.
    """

    def __init__(
        self, idle_seconds: float = 60 * 60, max_history: int | None = 100
    ) -> None:
        self._sessions: dict[str, SessionEntry] = {}
        self._registry_lock = threading.Lock()
        self._idle_seconds = idle_seconds
        self._max_history = max_history

    def create(self) -> tuple[str, SessionEntry]:
        session_id = uuid.uuid4().hex
        entry = SessionEntry(
            game=ExistGame(max_history=self._max_history),
            lock=threading.Lock(),
            last_touched=time.monotonic(),
        )
        with self._registry_lock:
            self._evict_idle_locked()
            self._sessions[session_id] = entry
        return session_id, entry

    def get(self, session_id: str) -> SessionEntry | None:
        with self._registry_lock:
            self._evict_idle_locked()
            entry = self._sessions.get(session_id)
            if entry is not None:
                entry.last_touched = time.monotonic()
            return entry

    def delete(self, session_id: str) -> bool:
        with self._registry_lock:
            return self._sessions.pop(session_id, None) is not None

    def _evict_idle_locked(self) -> None:
        cutoff = time.monotonic() - self._idle_seconds
        stale = [sid for sid, entry in self._sessions.items() if entry.last_touched < cutoff]
        for sid in stale:
            del self._sessions[sid]

    def __len__(self) -> int:
        with self._registry_lock:
            return len(self._sessions)
