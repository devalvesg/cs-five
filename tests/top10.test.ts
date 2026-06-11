import { describe, it, expect } from "vitest";
import { matchGuess } from "@/lib/top10/match";
import { getTop10ForPuzzle, themes, type Top10Puzzle } from "@/lib/top10/schedule";

const teamPuzzle: Top10Puzzle = {
  id: "t", title: "teste", entityKind: "team",
  answers: [
    { rank: 1, kind: "team", id: "NAVI", value: 9, aliases: ["NAVI", "Natus Vincere"] },
    { rank: 2, kind: "team", id: "FaZe", value: 8, aliases: ["FaZe", "FaZe Clan"] },
  ],
};
const playerPuzzle: Top10Puzzle = {
  id: "p", title: "teste", entityKind: "player",
  answers: [
    { rank: 1, kind: "player", id: "m0NESY", value: 5, aliases: ["m0NESY", "Ilya Osipov"] },
    { rank: 2, kind: "player", id: "ZywOo", value: 4, aliases: ["ZywOo", "Mathieu Herbaut"] },
  ],
};

describe("matchGuess", () => {
  it("casa time por abbr e por nome completo", () => {
    expect(matchGuess(teamPuzzle, "navi")?.id).toBe("NAVI");
    expect(matchGuess(teamPuzzle, "Natus Vincere")?.id).toBe("NAVI");
    expect(matchGuess(teamPuzzle, "faze clan")?.id).toBe("FaZe");
  });
  it("casa jogador por nick, nome real e leetspeak", () => {
    expect(matchGuess(playerPuzzle, "m0NESY")?.id).toBe("m0NESY");
    expect(matchGuess(playerPuzzle, "monesy")?.id).toBe("m0NESY"); // leetspeak
    expect(matchGuess(playerPuzzle, "zywoo")?.id).toBe("ZywOo");
    expect(matchGuess(playerPuzzle, "Mathieu Herbaut")?.id).toBe("ZywOo");
  });
  it("retorna null p/ palpite inválido ou vazio", () => {
    expect(matchGuess(teamPuzzle, "Astralis")).toBeNull();
    expect(matchGuess(teamPuzzle, "   ")).toBeNull();
  });
});

describe("schedule", () => {
  it("getTop10ForPuzzle é determinístico e cicla", () => {
    if (!themes.length) return;
    const a = getTop10ForPuzzle(3);
    expect(getTop10ForPuzzle(3)?.id).toBe(a?.id);
    expect(getTop10ForPuzzle(3 + themes.length)?.id).toBe(a?.id);
  });
  it("todo tema tem exatamente 10 respostas com ranks 1..10", () => {
    for (const t of themes) {
      expect(t.answers).toHaveLength(10);
      expect(t.answers.map((a) => a.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });
});
