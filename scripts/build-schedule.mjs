// Pré-assa a SCHEDULE do Grid: colhe todos os tabuleiros válidos únicos que o
// gerador consegue formar com o dataset atual e os ordena de forma determinística.
//
// Por quê pré-assar? Gerar ao vivo falha na maioria das sementes (grids válidos
// são raros no espaço aleatório). Colhendo offline garantimos que (a) todo dia
// tem um grid válido e (b) a ordem é fixa → não-repetição controlada. A janela
// de não-repetição = tamanho desta lista, que cresce sozinha quando o dataset
// cresce (mais jogadores ⇒ mais interseções ⇒ mais grids).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateGrid } from "../lib/grid/generator.ts";
import { players } from "../lib/data/players.ts";
import { loadExisting, stabilize } from "./stable-merge.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data", "grid-schedule.json");

// Assinatura canônica (ignora posição das colunas/linhas e qual eixo é qual):
// dois grids com o mesmo conjunto de 6 cabeçalhos são "o mesmo".
function signature(g) {
  const side = (arr) => arr.map((h) => `${h.kind[0]}:${h.value}`).sort().join("|");
  return [side(g.cols), side(g.rows)].sort().join("  ##  ");
}

// mulberry32 p/ embaralhar determinístico (mesma PRNG do app).
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = 60000;
const seen = new Map(); // sig -> grid
for (let s = 1; s <= SEEDS; s++) {
  const g = generateGrid(players, (s * 2654435761) % 2147483647);
  if (g) {
    const sig = signature(g);
    if (!seen.has(sig)) seen.set(sig, g);
  }
}

let grids = [...seen.values()];
// Ordem canônica dos NOVOS grids: embaralha com semente fixa p/ não agrupar por composição.
const rng = mulberry32(0x5f3759df);
for (let i = grids.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [grids[i], grids[j]] = [grids[j], grids[i]];
}

// Estabiliza contra a schedule já publicada: dias fixados não mudam de grid.
grids = stabilize(loadExisting(OUT), grids, signature);

writeFileSync(OUT, JSON.stringify(grids, null, 2));

const comp = {};
for (const g of grids) {
  const nc = [...g.cols, ...g.rows].filter((h) => h.kind === "country").length;
  comp[nc] = (comp[nc] || 0) + 1;
}
console.log(`✔ ${grids.length} grids únicos colhidos (de ${SEEDS} sementes)`);
console.log("Composição (#países por grid):", JSON.stringify(comp));
console.log(`≈ ${Math.round(grids.length / 30)} meses de não-repetição (1 grid/dia)`);
