// Harvest de stats por evento do HLTV → temas do Top 10.
//
// Fonte: /stats/players?event=<id> (leaderboard já ranqueada por Rating). O
// Cloudflare é furado pelo Chrome headed via CDP (ver scripts/hltv-fetch.mjs).
// Cada evento emite até 3 StatTables: Rating, diferença de abates (K-D Diff) e K/D.
// Cobre os 23 Majors (2013→2025) + eventos tier-1 curados do índice INTLLAN
// (scripts/.cache/hltv-events-index.json, gerado por hltv-collect-events.mjs).
//
// Saída: MERGE em public/data/top10-stats.json (preserva tabelas da Liquipedia).
// Depois rode `npm run build:top10`. Cache: scripts/.cache/hltv_event_<id>.html.
// CS5_FROM_CACHE=1 → não abre browser, falha se faltar cache.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchHtml, closeBrowser } from "./hltv-fetch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, ".cache");
const OUT = join(__dirname, "..", "public", "data");
mkdirSync(CACHE, { recursive: true });
const FROM_CACHE = process.env.CS5_FROM_CACHE === "1";

// Event IDs do evento PRINCIPAL de cada Major (playoffs/legends), 2013→2025.
const MAJORS = [
  { id: 8042, name: "StarLadder Major Budapest 2025" },
  { id: 7902, name: "BLAST.tv Austin Major 2025" },
  { id: 7524, name: "Perfect World Shanghai Major 2024" },
  { id: 7148, name: "PGL Major Copenhagen 2024" },
  { id: 6793, name: "BLAST.tv Paris Major 2023" },
  { id: 6586, name: "IEM Rio Major 2022" },
  { id: 6372, name: "PGL Major Antwerp 2022" },
  { id: 4866, name: "PGL Major Stockholm 2021" },
  { id: 4443, name: "StarLadder Major Berlin 2019" },
  { id: 3883, name: "IEM Katowice Major 2019" },
  { id: 3564, name: "FACEIT Major London 2018" },
  { id: 3247, name: "ELEAGUE Major Boston 2018" },
  { id: 2720, name: "PGL Major Kraków 2017" },
  { id: 2471, name: "ELEAGUE Major Atlanta 2017" },
  { id: 2062, name: "ESL One Cologne 2016" },
  { id: 2027, name: "MLG Major Columbus 2016" },
  { id: 1617, name: "DreamHack Open Cluj-Napoca 2015" },
  { id: 1666, name: "ESL One Cologne 2015" },
  { id: 1611, name: "ESL One Katowice 2015" },
  { id: 1553, name: "DreamHack Winter 2014" },
  { id: 1444, name: "ESL One Cologne 2014" },
  { id: 1333, name: "EMS One Katowice 2014" },
  { id: 1270, name: "DreamHack Winter 2013" },
];

// ─── eventos tier-1 curados a partir do índice INTLLAN ───
const SLUG_FIX = {
  malm: "Malmö", krakw: "Kraków", cs: "CS", ii: "II", iii: "III", iv: "IV", v: "V",
  dreamhack: "DreamHack", epicenter: "EPICENTER", starladder: "StarLadder",
  eleague: "ELEAGUE", faceit: "FACEIT", ems: "EMS", summit: "Summit",
};
const ACRON = new Set(["iem", "esl", "pgl", "ecs", "blast", "mlg", "epl", "tv"]);
function prettify(slug) {
  return slug.split("-").map((w) => {
    if (SLUG_FIX[w]) return SLUG_FIX[w];
    if (ACRON.has(w)) return w.toUpperCase();
    if (/^\d+$/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}
function curatedEvents() {
  const idxFile = join(CACHE, "hltv-events-index.json");
  if (!existsSync(idxFile)) return [];
  const list = JSON.parse(readFileSync(idxFile, "utf8"));
  const INCLUDE = /(^iem-|^esl-one-|^esl-pro-league-season-\d+-finals|^blast-premier-.*-final|^blast-pro-series.*final|^dreamhack-masters-|^pgl-|^cs-summit|^cs_summit|^epicenter-|^starladder-.*-finals|^esports-world-cup-|^gamers8|^ecs-season-\d+-finals|^intel-extreme|^blast-tv)/i;
  const EXCLUDE = /(rmr|minor|challenger|conference|play-?in|qualifier|relegation|esea|mdl|women|iesf|closed|last-chance|showmatch|all-star|university|college|academy|challenge-series|-stage-\d|-europe$|-asia$|-oceania$|-north-america$|-south-america$|-2026)/i;
  const majorIds = new Set(MAJORS.map((m) => m.id));
  const seen = new Set();
  const out = [];
  for (const e of list) {
    if (!INCLUDE.test(e.slug) || EXCLUDE.test(e.slug)) continue;
    if (majorIds.has(e.id) || seen.has(e.id)) continue;
    seen.add(e.id);
    out.push({ id: e.id, name: prettify(e.slug) });
  }
  return out;
}

// ─── resolução de nick → id do nosso dataset (p/ foto/bandeira) ───
const players = JSON.parse(readFileSync(join(OUT, "players.json"), "utf8"));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const deleet = (s) => norm(s).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");
const byKey = new Map();
for (const p of players) { byKey.set(norm(p.id), p.id); byKey.set(deleet(p.id), p.id); }
const resolveId = (nick) => byKey.get(norm(nick)) ?? byKey.get(deleet(nick)) ?? nick;

// ─── parsing da stats-table ───
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
function parseLeaderboard(html) {
  const tbl = (html.match(/<table[^>]*class="[^"]*stats-table[^"]*"[\s\S]*?<\/table>/i) ||
    html.match(/<table[^>]*>[\s\S]*?<\/table>/i) || [])[0];
  if (!tbl) return null;
  const rows = [...tbl.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]);
  if (!rows.length) return null;
  const header = [...rows[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => strip(m[1]));
  const ratingCol = header.findIndex((h) => /rating/i.test(h));
  const kdDiffCol = header.findIndex((h) => /k-?d diff/i.test(h));
  const kdCol = header.findIndex((h) => /^k\/d$/i.test(h));
  if (ratingCol < 0) return null;
  const entries = [];
  for (const r of rows.slice(1)) {
    const cells = [...r.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => m[1]);
    if (cells.length <= ratingCol) continue;
    const nick = strip(cells[0]);
    if (!nick) continue;
    entries.push({
      nick, id: resolveId(nick),
      rating: parseFloat(strip(cells[ratingCol])),
      kdDiff: kdDiffCol >= 0 ? parseInt(strip(cells[kdDiffCol]).replace(/[^\d-]/g, ""), 10) : NaN,
      kd: kdCol >= 0 ? parseFloat(strip(cells[kdCol])) : NaN,
    });
  }
  return entries;
}

async function getEventHtml(id) {
  const file = join(CACHE, `hltv_event_${id}.html`);
  if (existsSync(file)) return readFileSync(file, "utf8");
  if (FROM_CACHE) throw new Error(`sem cache p/ evento ${id}`);
  const html = await fetchHtml(`https://www.hltv.org/stats/players?event=${id}`, ".stats-table", { timeoutMs: 50000 });
  writeFileSync(file, html);
  return html;
}

function topTable(key, title, entries, valueOf) {
  const ranked = entries
    .map((e) => ({ entity: { kind: "player", id: e.id }, value: valueOf(e) }))
    .filter((e) => Number.isFinite(e.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  if (ranked.length < 10) return null;
  return { key, title, entries: ranked };
}

async function main() {
  const events = [...MAJORS, ...curatedEvents()];
  console.log(`Eventos: ${MAJORS.length} Majors + ${events.length - MAJORS.length} tier-1 = ${events.length}`);
  const tables = [];
  let ok = 0, skip = 0;
  for (const m of events) {
    let html;
    try { html = await getEventHtml(m.id); }
    catch (e) { console.log(`  ✗ ${m.name}: ${e.message}`); skip++; continue; }
    const entries = parseLeaderboard(html);
    if (!entries || entries.length < 10) { console.log(`  ✗ ${m.name}: leaderboard insuficiente (${entries?.length ?? 0})`); skip++; continue; }
    const made = [
      topTable(`hltv_rating_${m.id}`, `Maior rating no ${m.name}`, entries, (e) => e.rating),
      topTable(`hltv_kddiff_${m.id}`, `Maior diferença de abates (K-D) no ${m.name}`, entries, (e) => e.kdDiff),
      topTable(`hltv_kd_${m.id}`, `Maior K/D no ${m.name}`, entries, (e) => e.kd),
    ].filter(Boolean);
    for (const t of made) tables.push(t);
    ok++;
    console.log(`  ✓ ${String(m.id).padEnd(5)} ${m.name.slice(0, 38).padEnd(38)} +${made.length}`);
  }
  if (!FROM_CACHE) await closeBrowser();

  const statsFile = join(OUT, "top10-stats.json");
  const existing = existsSync(statsFile) ? JSON.parse(readFileSync(statsFile, "utf8")) : [];
  // remove TODAS as tabelas hltv_* antigas e regrava (idempotente), preserva Liquipedia
  const kept = existing.filter((t) => !/^hltv_/.test(t.key));
  const merged = [...kept, ...tables];
  writeFileSync(statsFile, JSON.stringify(merged, null, 2));
  console.log(`\n✔ ${ok} eventos OK, ${skip} pulados · +${tables.length} tabelas HLTV · total ${merged.length} → top10-stats.json`);
}

main().then(() => process.exit(0));
