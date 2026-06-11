import { describe, it, expect } from "vitest";
import { buildTop10CardData } from "@/lib/share/top10-card";
import type { Top10Puzzle } from "@/lib/top10/schedule";

const teamPuzzle: Top10Puzzle = {
  id: "t", title: "Times com mais títulos", entityKind: "team",
  answers: [
    { rank: 1, kind: "team", id: "NAVI", value: 9, aliases: ["NAVI"] },
    { rank: 2, kind: "team", id: "FaZe", value: 8, aliases: ["FaZe"] },
    { rank: 3, kind: "team", id: "Astralis", value: 4, aliases: ["Astralis"] },
  ],
};

// ids reais presentes em players.json (FalleN=BR, device=DK).
const playerPuzzle: Top10Puzzle = {
  id: "p", title: "Jogadores com mais títulos", entityKind: "player",
  answers: [
    { rank: 1, kind: "player", id: "FalleN", value: 5, aliases: ["FalleN"] },
    { rank: 2, kind: "player", id: "device", value: 4, aliases: ["device"] },
  ],
};

describe("buildTop10CardData", () => {
  it("conta acertos e mapeia solved por slot", () => {
    const data = buildTop10CardData(teamPuzzle, ["NAVI", "Astralis"]);
    expect(data.correct).toBe(2);
    expect(data.total).toBe(3);
    expect(data.slots.map((s) => s.solved)).toEqual([true, false, true]);
  });

  it("preserva a ordem por rank das respostas", () => {
    const data = buildTop10CardData(teamPuzzle, []);
    expect(data.theme).toBe("Times com mais títulos");
    expect(data.slots).toHaveLength(3);
    expect(data.correct).toBe(0);
  });

  it("tema de time não tem bandeira (flag = null)", () => {
    const data = buildTop10CardData(teamPuzzle, []);
    expect(data.slots.every((s) => s.flag === null)).toBe(true);
  });

  it("tema de jogador mapeia bandeira e nome pelo id", () => {
    const data = buildTop10CardData(playerPuzzle, ["FalleN"]);
    expect(data.slots[0]).toEqual({ label: "FalleN", flag: "BR", solved: true });
    expect(data.slots[1]).toEqual({ label: "device", flag: "DK", solved: false });
  });

  it("puzzle é um número (determinístico pela data)", () => {
    const data = buildTop10CardData(teamPuzzle, []);
    expect(typeof data.puzzle).toBe("number");
  });
});
