// Gera os temas do Top 10 a partir de public/data/top10-stats.json e pré-assa o schedule.
// Cada StatTable (já ordenada desc) vira um tema {id, title, entityKind, answers[top10]}.
// Saída: public/data/top10-schedule.json. Mesmo padrão do build-schedule.mjs do Grid.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "data");

const stats = JSON.parse(readFileSync(join(OUT, "top10-stats.json"), "utf8"));
const teams = JSON.parse(readFileSync(join(OUT, "teams.json"), "utf8"));
const players = JSON.parse(readFileSync(join(OUT, "players.json"), "utf8"));
const teamByAbbr = new Map(teams.map((t) => [t.abbr, t]));
const playerById = new Map(players.map((p) => [p.id, p]));

// Aliases aceitos no palpite (o match.ts normaliza/leetspeak depois).
function aliasesFor(kind, id) {
  if (kind === "team") {
    const t = teamByAbbr.get(id);
    return [...new Set([id, t?.name].filter(Boolean))];
  }
  const p = playerById.get(id);
  return [...new Set([id, p?.realName].filter(Boolean))];
}

const themes = [];
for (const tbl of stats) {
  const kind = tbl.entries[0]?.entity.kind;
  if (!kind) continue;
  // top 10 por (valor desc, id asc) — desempate estável e determinístico
  const ranked = [...tbl.entries].sort((a, b) => b.value - a.value || a.entity.id.localeCompare(b.entity.id));
  if (ranked.length < 10) { console.log(`  ✗ ${tbl.key}: só ${ranked.length} entradas (<10), pulado`); continue; }
  const answers = ranked.slice(0, 10).map((e, i) => ({
    rank: i + 1, kind, id: e.entity.id, value: e.value, aliases: aliasesFor(kind, e.entity.id),
  }));
  themes.push({ id: tbl.key, title: tbl.title, entityKind: kind, answers });
  console.log(`  ✓ ${tbl.key.padEnd(20)} ${answers.map((a) => a.id).slice(0, 4).join(", ")}…`);
}

// Ordem determinística (hash do id) — estável entre builds, não sequencial.
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
themes.sort((a, b) => hash(a.id) - hash(b.id));

writeFileSync(join(OUT, "top10-schedule.json"), JSON.stringify(themes, null, 2));
console.log(`\n✔ ${themes.length} temas → public/data/top10-schedule.json`);
