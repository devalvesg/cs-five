import type { Player } from "@/lib/data/players";
import { teamName, countryLabel } from "@/lib/data/players";
import { mulberry32 } from "@/lib/daily";

export type Criterion = { kind: "team" | "country"; value: string; label: string };
export type GridPuzzle = { cols: Criterion[]; rows: Criterion[] };

/** Um jogador satisfaz um critério (jogou pelo time, OU é do país). */
export function playerMatches(p: Player, c: Criterion): boolean {
  return c.kind === "team" ? p.teamsNotable.includes(c.value) : p.countryCode === c.value;
}

export function eligiblePlayers(players: Player[], a: Criterion, b: Criterion): Player[] {
  return players.filter((p) => playerMatches(p, a) && playerMatches(p, b));
}

/**
 * Um grid só é REALMENTE solúvel se existir uma atribuição de 9 jogadores
 * DISTINTOS (um por célula) — não basta cada célula ter ≥1 elegível, porque o
 * jogador não pode repetir. Isso é um emparelhamento bipartido perfeito
 * (células ↔ jogadores); resolvido por caminhos aumentantes (Kuhn).
 */
export function isFullySolvable(players: Player[], cols: Criterion[], rows: Criterion[]): boolean {
  const cells: string[][] = [];
  for (const r of rows)
    for (const c of cols) {
      const ids = eligiblePlayers(players, r, c).map((p) => p.id);
      if (ids.length === 0) return false;
      cells.push(ids);
    }
  const matchOf = new Map<string, number>(); // playerId -> cellIndex
  const assign = (cell: number, seen: Set<string>): boolean => {
    for (const pid of cells[cell]) {
      if (seen.has(pid)) continue;
      seen.add(pid);
      const cur = matchOf.get(pid);
      if (cur === undefined || assign(cur, seen)) {
        matchOf.set(pid, cell);
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < cells.length; i++) if (!assign(i, new Set())) return false;
  return true;
}

/**
 * Para o botão "Desistir": preenche as células ainda VAZIAS com jogadores
 * distintos válidos (respeitando os já usados pelo jogador). Backtracking; se o
 * preenchimento parcial do jogador travou um emparelhamento perfeito, cai num
 * fallback guloso (pode repetir) só para mostrar uma resposta plausível.
 */
export function solveRemaining(
  players: Player[],
  puzzle: GridPuzzle,
  filled: Record<string, string>
): Record<string, string> {
  const used = new Set(Object.values(filled));
  const empties: { key: string; r: number; c: number }[] = [];
  for (let r = 0; r < puzzle.rows.length; r++)
    for (let c = 0; c < puzzle.cols.length; c++) {
      const key = `${r}-${c}`;
      if (!filled[key]) empties.push({ key, r, c });
    }
  // Domínio distinto (sem repetir jogadores do usuário) e domínio completo
  // (qualquer elegível) p/ a célula. O completo é o último recurso do reveal:
  // garante que NENHUMA célula fique em branco enquanto houver ≥1 elegível.
  const fullDomain = empties.map((e) =>
    eligiblePlayers(players, puzzle.rows[e.r], puzzle.cols[e.c]).map((p) => p.id)
  );
  const domain = fullDomain.map((ids) => ids.filter((id) => !used.has(id)));
  const result: Record<string, string> = {};
  const taken = new Set<string>();
  const bt = (i: number): boolean => {
    if (i === empties.length) return true;
    for (const id of domain[i]) {
      if (taken.has(id)) continue;
      taken.add(id);
      result[empties[i].key] = id;
      if (bt(i + 1)) return true;
      taken.delete(id);
      delete result[empties[i].key];
    }
    return false;
  };
  if (!bt(0)) {
    // Fallback guloso: prefere jogador distinto; se não houver (todos já usados
    // pelo usuário), cai p/ qualquer elegível da célula (pode repetir). Só fica
    // vazia se a célula realmente não tiver elegível — o que não ocorre num grid
    // válido (isFullySolvable garante ≥1), só com dado defasado.
    for (let i = 0; i < empties.length; i++) {
      if (result[empties[i].key]) continue;
      const pick = domain[i][0] ?? fullDomain[i][0];
      if (pick) result[empties[i].key] = pick;
    }
  }
  return result;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Distribuição de quantos PAÍSES o grid terá (o resto vira Time). Favorece
// misturas (1-2 países) sobre os extremos (0 = só times, 3 = só países num eixo).
const COUNTRY_WEIGHTS = [0.18, 0.34, 0.33, 0.15]; // índices 0,1,2,3
function pickCountryCount(rng: () => number, max: number): number {
  const r = rng();
  let acc = 0;
  for (let k = 0; k <= 3; k++) {
    acc += COUNTRY_WEIGHTS[k];
    if (r < acc) return Math.min(k, max);
  }
  return Math.min(3, max);
}

/**
 * Gera um grid 3×3 determinístico. Cada um dos 6 cabeçalhos é Time ou País,
 * livremente — surgindo células Time×Time (jogou pelas duas orgs), Time×País
 * (jogou pela org e é do país). Países ficam todos num eixo (país×país é
 * impossível). Garante que TODA interseção tenha ≥1 jogador elegível.
 * Retorna null só se os dados forem insuficientes.
 */
export function generateGrid(players: Player[], seed: number): GridPuzzle | null {
  const rng = mulberry32(seed);

  const teamCounts: Record<string, number> = {};
  const ctryCounts: Record<string, number> = {};
  for (const p of players) {
    for (const t of p.teamsNotable) teamCounts[t] = (teamCounts[t] ?? 0) + 1;
    if (p.countryCode) ctryCounts[p.countryCode] = (ctryCounts[p.countryCode] ?? 0) + 1;
  }
  const teamPool = Object.keys(teamCounts).filter((t) => teamCounts[t] >= 2);
  const ctryPool = Object.keys(ctryCounts).filter((c) => ctryCounts[c] >= 2);
  if (teamPool.length < 3) return null; // mínimo absoluto (grid com muitos países)

  const team = (v: string): Criterion => ({ kind: "team", value: v, label: teamName(v) });
  const ctry = (v: string): Criterion => ({ kind: "country", value: v, label: countryLabel(v) });

  for (let attempt = 0; attempt < 1500; attempt++) {
    const nCountries = pickCountryCount(rng, ctryPool.length);
    const nTeams = 6 - nCountries; // times distintos no grid inteiro
    if (teamPool.length < nTeams) continue;

    const countriesOnRows = rng() < 0.5;
    const teams = shuffle(teamPool, rng).slice(0, nTeams).map(team);
    const countries = shuffle(ctryPool, rng).slice(0, nCountries).map(ctry);

    // Eixo dos países recebe os países + times suficientes p/ completar 3.
    const cAxis = [...countries, ...teams.slice(0, 3 - nCountries)];
    const tAxis = teams.slice(3 - nCountries, 3 - nCountries + 3);
    if (cAxis.length !== 3 || tAxis.length !== 3) continue;

    const rows = countriesOnRows ? cAxis : tAxis;
    const cols = countriesOnRows ? tAxis : cAxis;

    // Exige 9 jogadores DISTINTOS preenchíveis (emparelhamento perfeito).
    if (isFullySolvable(players, cols, rows)) return { cols, rows };
  }
  return null;
}
