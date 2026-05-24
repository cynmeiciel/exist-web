import type { GameState } from "../lib/types";

interface SidePanelProps {
  state: GameState;
  onEndTurn: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onNewGame: () => void;
  message: string | null;
  isMyTurn: boolean;
}

export default function SidePanel({
  state,
  onEndTurn,
  onUndo,
  onRedo,
  onReset,
  onNewGame,
  message,
  isMyTurn,
}: SidePanelProps) {
  const { turn_info, reserves, outcome, is_over } = state;

  return (
    <aside className="panel">
      <section className="panel__section">
        <h2 className="panel__title">Turn</h2>
        <dl className="panel__stats">
          <dt>Side</dt>
          <dd>{turn_info.side}</dd>
          <dt>Turn</dt>
          <dd>#{turn_info.turn_number}</dd>
          <dt>Type</dt>
          <dd>{turn_info.turn_type}</dd>
          <dt>Actions</dt>
          <dd>
            {turn_info.actions_used} / {turn_info.max_actions}
          </dd>
          <dt>Last</dt>
          <dd>{turn_info.last_action}</dd>
        </dl>
      </section>

      <section className="panel__section">
        <h2 className="panel__title">Reserves</h2>
        <dl className="panel__stats">
          <dt>Black</dt>
          <dd>{reserves.black}</dd>
          <dt>White</dt>
          <dd>{reserves.white}</dd>
        </dl>
      </section>

      <section className="panel__section panel__section--actions">
        <button
          onClick={onEndTurn}
          disabled={!isMyTurn || !turn_info.can_end_turn || is_over}
        >
          End Turn
        </button>
        <button onClick={onUndo} disabled={!isMyTurn || !state.can_undo}>
          Undo
        </button>
        <button onClick={onRedo} disabled={!isMyTurn || !state.can_redo}>
          Redo
        </button>
        <button onClick={onReset}>Reset</button>
        <button onClick={onNewGame}>New Game</button>
      </section>

      {outcome && (
        <section className="panel__section panel__outcome">
          <h2 className="panel__title">Result</h2>
          <p>
            {outcome.winner === null
              ? "Draw"
              : outcome.winner
                ? "Black wins"
                : "White wins"}
          </p>
          <p className="panel__reason">{outcome.reason}</p>
        </section>
      )}

      {message && <p className="panel__message">{message}</p>}
    </aside>
  );
}
