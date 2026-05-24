import type { GameState, PiecePayload } from "../lib/types";

interface BoardProps {
  state: GameState;
  selected: { r: number; c: number } | null;
  isMyTurn: boolean;
  onCellClick: (r: number, c: number) => void;
}

export default function Board({ state, selected, isMyTurn, onCellClick }: BoardProps) {
  const grid: (PiecePayload | null)[][] = Array.from(
    { length: state.height },
    () => Array.from({ length: state.width }, () => null),
  );
  for (const piece of state.board) {
    grid[piece.r][piece.c] = piece;
  }

  return (
    <div
      className="board"
      style={{
        gridTemplateColumns: `repeat(${state.width}, var(--cell-size))`,
        gridTemplateRows: `repeat(${state.height}, var(--cell-size))`,
      }}
    >
      {grid.flatMap((row, r) =>
        row.map((piece, c) => {
          const isSelected = selected?.r === r && selected?.c === c;
          const isLight = (r + c) % 2 === 0;
          const classes = [
            "cell",
            isLight ? "cell--light" : "cell--dark",
            isSelected ? "cell--selected" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={`${r}-${c}`}
              className={classes}
              onClick={() => onCellClick(r, c)}
              disabled={state.is_over || !isMyTurn}
              aria-label={`r${r}c${c}`}
            >
              {piece && (
                <span
                  className={`piece ${piece.side ? "piece--black" : "piece--white"}`}
                />
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
