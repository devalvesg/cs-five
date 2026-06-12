import { describe, it, expect } from "vitest";
import { applyVerify, correctIds, initialState } from "@/lib/impostor/engine";
import { puzzles, getImpostorForPuzzle, type ImpostorPuzzle } from "@/lib/impostor/schedule";

const p: ImpostorPuzzle = {
  id: "t", title: "teste", family: "title", entityKind: "player",
  options: [
    { kind: "player", id: "A", correct: true },
    { kind: "player", id: "B", correct: true },
    { kind: "player", id: "X", correct: false },
    { kind: "player", id: "Y", correct: false },
  ],
};

describe("engine.applyVerify", () => {
  it("verificar correto mantém 'playing' até achar todos", () => {
    const s1 = applyVerify(p, initialState, "A");
    expect(s1.phase).toBe("playing");
    expect(s1.found).toEqual(["A"]);
    const s2 = applyVerify(p, s1, "B");
    expect(s2.phase).toBe("won");
  });

  it("verificar impostor encerra em derrota (morte súbita)", () => {
    const s = applyVerify(p, initialState, "X");
    expect(s.phase).toBe("lost");
    expect(s.lostId).toBe("X");
  });

  it("ignora id inválido, repetido e jogadas após o fim", () => {
    expect(applyVerify(p, initialState, "ZZZ")).toBe(initialState);
    const s1 = applyVerify(p, initialState, "A");
    expect(applyVerify(p, s1, "A").found).toEqual(["A"]); // sem duplicar
    const lost = applyVerify(p, initialState, "X");
    expect(applyVerify(p, lost, "A")).toBe(lost); // travado após derrota
  });

  it("correctIds retorna só os corretos", () => {
    expect(correctIds(p).sort()).toEqual(["A", "B"]);
  });
});

describe("schedule do Impostor", () => {
  it("getImpostorForPuzzle cicla e aceita índices negativos", () => {
    if (!puzzles.length) return;
    expect(getImpostorForPuzzle(0)).toBe(puzzles[0]);
    expect(getImpostorForPuzzle(-1)).toBe(puzzles[(puzzles.length - 1)]);
    expect(getImpostorForPuzzle(puzzles.length)).toBe(puzzles[0]);
  });

  it("todo puzzle tem 8–10 opções, 3–6 corretas e ≥2 impostores", () => {
    for (const z of puzzles) {
      expect(z.options.length).toBeGreaterThanOrEqual(8);
      expect(z.options.length).toBeLessThanOrEqual(10);
      const nCorrect = z.options.filter((o) => o.correct).length;
      expect(nCorrect).toBeGreaterThanOrEqual(3);
      expect(nCorrect).toBeLessThanOrEqual(6);
      expect(z.options.length - nCorrect).toBeGreaterThanOrEqual(2);
      const ids = z.options.map((o) => o.id);
      expect(new Set(ids).size).toBe(ids.length); // sem id repetido
    }
  });
});
