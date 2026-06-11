import type { Criterion, GridPuzzle } from "@/lib/grid/generator";

export type GridCardData = {
  puzzle: number;
  cols: Criterion[];
  rows: Criterion[];
  /** matriz [linha][coluna] de acertos. */
  solved: boolean[][];
  correct: number;
};

/** Monta os dados do card de compartilhamento do Grid a partir das células preenchidas. */
export function buildGridCardData(
  puzzle: GridPuzzle,
  cells: Record<string, string>,
  puzzleNumber: number,
): GridCardData {
  let correct = 0;
  const solved = puzzle.rows.map((_, r) =>
    puzzle.cols.map((_, c) => {
      const ok = !!cells[`${r}-${c}`];
      if (ok) correct++;
      return ok;
    }),
  );
  return { puzzle: puzzleNumber, cols: puzzle.cols, rows: puzzle.rows, solved, correct };
}
