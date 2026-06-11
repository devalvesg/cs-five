import { describe, it, expect } from "vitest";
import { buildGridCardData } from "@/lib/share/grid-card";
import type { GridPuzzle } from "@/lib/grid/generator";

const puzzle: GridPuzzle = {
  cols: [
    { kind: "team", value: "NAVI", label: "NAVI" },
    { kind: "country", value: "BR", label: "Brasil" },
    { kind: "team", value: "FaZe", label: "FaZe" },
  ],
  rows: [
    { kind: "country", value: "DK", label: "Dinamarca" },
    { kind: "team", value: "Astralis", label: "Astralis" },
    { kind: "country", value: "FR", label: "França" },
  ],
};

describe("buildGridCardData", () => {
  it("monta matriz 3x3 de acertos e conta corretos", () => {
    const cells = { "0-0": "device", "0-2": "rain", "2-1": "fer" }; // 3 preenchidas
    const data = buildGridCardData(puzzle, cells, 23);
    expect(data.correct).toBe(3);
    expect(data.solved).toEqual([
      [true, false, true],
      [false, false, false],
      [false, true, false],
    ]);
  });

  it("preserva linhas e colunas do puzzle e usa o número recebido", () => {
    const data = buildGridCardData(puzzle, {}, 42);
    expect(data.cols).toBe(puzzle.cols);
    expect(data.rows).toBe(puzzle.rows);
    expect(data.correct).toBe(0);
    expect(data.puzzle).toBe(42);
  });
});
