import { describe, it, expect } from "vitest";
import { generateGrid, eligiblePlayers, isFullySolvable } from "@/lib/grid/generator";
import type { Player } from "@/lib/data/players";

// Dataset sintético: 3 times × 3 países, 2 jogadores por interseção → sempre solúvel.
function makePlayers(): Player[] {
  const teams = ["A", "B", "C"], countries = ["X", "Y", "Z"];
  const out: Player[] = [];
  for (const t of teams)
    for (const cc of countries)
      for (let i = 0; i < 2; i++)
        out.push({
          id: `${t}${cc}${i}`, countryCode: cc, roles: [], csgo: true, cs2: true,
          teamsNotable: [t], teamOrgsRaw: [t],
        });
  return out;
}

describe("generateGrid", () => {
  const players = makePlayers();

  it("gera grid com TODAS as interseções solúveis", () => {
    const g = generateGrid(players, 42);
    expect(g).not.toBeNull();
    for (const r of g!.rows)
      for (const c of g!.cols)
        expect(eligiblePlayers(players, r, c).length).toBeGreaterThan(0);
  });

  it("grid gerado é preenchível com 9 jogadores DISTINTOS (emparelhamento)", () => {
    const g = generateGrid(players, 42)!;
    expect(isFullySolvable(players, g.cols, g.rows)).toBe(true);
  });

  it("isFullySolvable rejeita grid sem jogadores distintos suficientes", () => {
    // 2 colunas que só compartilham o MESMO único jogador entre si:
    // jogador único 'solo' joga por T1 e T2; célula (T1,Px) e (T2,Px) exigiriam
    // ele duas vezes → sem emparelhamento perfeito.
    const solo: Player[] = [
      { id: "solo", countryCode: "X", roles: [], csgo: true, cs2: true, teamsNotable: ["T1", "T2"], teamOrgsRaw: [] },
    ];
    const cols = [
      { kind: "team" as const, value: "T1", label: "T1" },
      { kind: "team" as const, value: "T2", label: "T2" },
    ];
    const rows = [{ kind: "country" as const, value: "X", label: "X" }];
    expect(isFullySolvable(solo, cols, rows)).toBe(false);
  });

  it("é determinístico para a mesma semente", () => {
    const a = generateGrid(players, 7);
    const b = generateGrid(players, 7);
    expect(a).toEqual(b);
  });

  it("cabeçalhos são únicos e país fica num eixo só (nunca país×país)", () => {
    const g = generateGrid(players, 99)!;
    const all = [...g.cols, ...g.rows];
    // todos os 6 cabeçalhos distintos
    expect(new Set(all.map((h) => `${h.kind}:${h.value}`)).size).toBe(6);
    // países não aparecem nos dois eixos (senão haveria célula país×país)
    const colHasCountry = g.cols.some((c) => c.kind === "country");
    const rowHasCountry = g.rows.some((r) => r.kind === "country");
    expect(colHasCountry && rowHasCountry).toBe(false);
  });

  it("retorna null quando não há dados suficientes", () => {
    expect(generateGrid(players.slice(0, 2), 1)).toBeNull();
  });
});
