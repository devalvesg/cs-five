// Gera os puzzles do jogo Impostor → public/data/impostor-schedule.json.
//
// v1: famílias `team` (jogou pela org) e `award` (MVP de Major). A família
// `title` (campeão de Major) entra quando houver public/data/major-champions.json.
//
// Impostores = jogadores de MAIOR NOTORIEDADE que NÃO satisfazem o critério.
// Notoriedade = aparições nos leaderboards de Major/eventos (caches HLTV) +
// respostas do Top 10 + títulos/MVPs. Determinístico (RNG semeado pelo id do
// critério) → rebuilds estáveis. Ledger garante cada critério uma única vez.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "data");
const CACHE = join(__dirname, ".cache");

const players = JSON.parse(readFileSync(join(OUT, "players.json"), "utf8"));
const teams = JSON.parse(readFileSync(join(OUT, "teams.json"), "utf8"));
const top10Stats = JSON.parse(readFileSync(join(OUT, "top10-stats.json"), "utf8"));
const top10Sched = existsSync(join(OUT, "top10-schedule.json")) ? JSON.parse(readFileSync(join(OUT, "top10-schedule.json"), "utf8")) : [];
const overrides = existsSync(join(OUT, "impostor-overrides.json")) ? JSON.parse(readFileSync(join(OUT, "impostor-overrides.json"), "utf8")) : [];

const byId = new Map(players.map((p) => [p.id, p]));
const teamName = new Map(teams.map((t) => [t.abbr, t.name]));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const deleet = (s) => norm(s).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");
const resolveKey = new Map();
for (const p of players) { resolveKey.set(norm(p.id), p.id); resolveKey.set(deleet(p.id), p.id); }
const resolveId = (nick) => resolveKey.get(norm(nick)) ?? resolveKey.get(deleet(nick)) ?? null;

// ─── notoriedade ───
const noto = new Map(); // playerId -> score
const bump = (id, n) => { if (id) noto.set(id, (noto.get(id) || 0) + n); };
// aparições nos caches de evento (3 por evento distinto)
const linkRe = /<a href="\/stats\/players\/\d+\/[a-z0-9_-]+\?event=\d+"[^>]*>([^<]+)<\/a>/g;
for (const f of readdirSync(CACHE).filter((f) => /^hltv_event_\d+\.html$/.test(f))) {
  const html = readFileSync(join(CACHE, f), "utf8");
  const seen = new Set();
  for (const m of html.matchAll(linkRe)) { const id = resolveId(m[1].trim()); if (id && !seen.has(id)) { seen.add(id); bump(id, 3); } }
}
// respostas do Top 10 (1 cada)
for (const t of top10Sched) if (t.entityKind === "player") for (const a of t.answers) bump(a.id, 1);
// títulos/MVPs (2 por contagem)
for (const tbl of top10Stats) if (/player_(titles|mvps)/.test(tbl.key)) for (const e of tbl.entries) bump(e.entity.id, 2 * (e.value || 1));
const notoOf = (id) => noto.get(id) || 0;

// ─── RNG determinístico ───
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (arr, rng) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// pool global de jogadores notórios (p/ impostores), desc por notoriedade
const notoriousPlayers = players.filter((p) => notoOf(p.id) > 0).sort((a, b) => notoOf(b.id) - notoOf(a.id)).map((p) => p.id);

/**
 * Monta um puzzle: correct = satisfatores mais notórios; impostores = mais
 * notórios que falham. total 8–10, corretos 3–6, ≥2 impostores.
 */
function makePuzzle(id, title, family, satisfiesSet) {
  const rng = mulberry32(hash(id));
  const correctPool = [...satisfiesSet].filter((pid) => notoOf(pid) > 0).sort((a, b) => notoOf(b) - notoOf(a));
  if (correctPool.length < 3) return null;
  const nCorrect = 3 + Math.floor(rng() * (Math.min(6, correctPool.length) - 2)); // [3, min(6,len)]
  const correct = correctPool.slice(0, nCorrect);
  const total = 8 + Math.floor(rng() * 3); // [8,10]
  const nImp = Math.max(2, total - nCorrect);
  const impostors = notoriousPlayers.filter((pid) => !satisfiesSet.has(pid)).slice(0, nImp);
  if (impostors.length < 2) return null;
  const options = shuffle(
    [...correct.map((pid) => ({ kind: "player", id: pid, correct: true })),
     ...impostors.map((pid) => ({ kind: "player", id: pid, correct: false }))],
    rng,
  );
  return { id, title, family, entityKind: "player", options };
}

const puzzles = [];
const usedKeys = new Set();
function add(p) { if (p && !usedKeys.has(p.id)) { usedKeys.add(p.id); puzzles.push(p); } }

// ─── família team: "Já jogou pela {org}" ───
for (const t of teams) {
  const members = new Set(players.filter((p) => p.teamsNotable?.includes(t.abbr)).map((p) => p.id));
  add(makePuzzle(`team_${t.abbr}`, `Já jogou pela ${t.name}`, "team", members));
}

// ─── família award: "Já foi MVP de Major" ───
const mvpTbl = top10Stats.find((t) => t.key === "player_mvps");
if (mvpTbl) {
  const mvps = new Set(mvpTbl.entries.map((e) => e.entity.id));
  add(makePuzzle("award_mvp_major", "Já foi MVP de um Major", "award", mvps));
}

// ─── overrides curados (substituem por id) ───
for (const o of overrides) { const i = puzzles.findIndex((p) => p.id === o.id); if (i >= 0) puzzles[i] = o; else add(o); }

// ordem determinística estável (hash do id)
puzzles.sort((a, b) => hash(a.id) - hash(b.id));
writeFileSync(join(OUT, "impostor-schedule.json"), JSON.stringify(puzzles, null, 2));
console.log(`✔ ${puzzles.length} puzzles → impostor-schedule.json`);
for (const p of puzzles.slice(0, 8)) console.log(`  ${p.id.padEnd(16)} ${p.options.filter((o) => o.correct).length}✓/${p.options.length} — ${p.title}`);
