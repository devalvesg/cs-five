// Harvest de stats agregadas de Major da Liquipedia para o jogo Top 10.
// Fonte: HTML renderizado (action=parse, grátis, 1 req/30s) das páginas
//   Majors/Team_Statistics e Majors/Player_Statistics — as tabelas LPDB já vêm preenchidas.
// Extrai apenas DADOS FACTUAIS (entidade + contagens); Liquipedia é CC-BY-SA.
// Saída: public/data/top10-stats.json (StatTable[]).
//
// Uso:
//   node scripts/harvest-top10-stats.mjs --test   → imprime as tabelas parseadas, não escreve
//   node scripts/harvest-top10-stats.mjs          → escreve top10-stats.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, ".cache");
const OUT_DIR = join(__dirname, "..", "public", "data");
mkdirSync(CACHE_DIR, { recursive: true });

const API = "https://liquipedia.net/counterstrike/api.php";
const UA = "cs5-bot/0.3 (https://csfive.gg; gabrieldamasceno.bad@gmail.com) top10-stats";
const FROM_CACHE = process.env.CS5_FROM_CACHE === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastParse = 0;
async function fetchRenderedHtml(page) {
  const cacheFile = join(CACHE_DIR, `parse_${page.replace(/[^a-z0-9]/gi, "_")}.html`);
  if (existsSync(cacheFile)) return readFileSync(cacheFile, "utf8");
  if (FROM_CACHE) throw new Error("não cacheado");
  const wait = 31000 - (Date.now() - lastParse); // action=parse: 1 req/30s
  if (wait > 0) { console.log(`  …aguardando ${Math.ceil(wait / 1000)}s (limite parse)`); await sleep(wait); }
  lastParse = Date.now();
  const u = new URL(API);
  u.search = new URLSearchParams({ action: "parse", page, prop: "text", format: "json", formatversion: "2" }).toString();
  const res = await fetch(u, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const html = json.parse?.text;
  if (!html) throw new Error(json.error?.info || "sem HTML");
  writeFileSync(cacheFile, html);
  return html;
}

// ─── parsing de tabela HTML ───
const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();
const cellsOf = (rowHtml) => [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => m[1]);
function tablesOf(html) {
  return [...html.matchAll(/<table[^>]*>[\s\S]*?<\/table>/g)].map((m) => m[0])
    .map((t) => [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]));
}
// nome da entidade numa célula: ÚLTIMA âncora com title= (p/ jogador, a 1ª é a bandeira do país;
// p/ time, há só uma). Cai p/ alt= da img, senão texto.
function entityName(cellHtml) {
  const anchors = [...cellHtml.matchAll(/<a\b[^>]*\btitle="([^"]+)"/g)].map((m) => m[1]);
  if (anchors.length) return anchors[anchors.length - 1];
  return (cellHtml.match(/\balt="([^"]+)"/) || [])[1] || stripTags(cellHtml);
}

// ─── resolução de entidade → id do nosso dataset ───
const teams = JSON.parse(readFileSync(join(OUT_DIR, "teams.json"), "utf8"));
const players = JSON.parse(readFileSync(join(OUT_DIR, "players.json"), "utf8"));
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const deleet = (s) => norm(s).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t");

const teamByName = new Map();
for (const t of teams) { teamByName.set(norm(t.name), t.abbr); teamByName.set(norm(t.abbr), t.abbr); }
// aliases p/ nomes históricos que a página usa e diferem do teams.json
for (const [alias, abbr] of Object.entries({
  "team envyus": "EnVyUs", "envyus": "EnVyUs", "ninjas in pyjamas": "NIP", "natus vincere": "NAVI",
  "team vitality": "Vitality", "team spirit": "Spirit", "team liquid": "Liquid", "faze clan": "FaZe",
  "sk gaming": "SK", "g2 esports": "G2", "mousesports": "MOUZ", "luminosity gaming": "Luminosity",
  "gambit esports": "Gambit", "team gambit": "Gambit", "team ibuypower": "iBUYPOWER", "ibuypower": "iBUYPOWER",
  "complexity gaming": "Complexity", "evil geniuses": "EG", "optic gaming": "OpTic", "tyloo": "TYLOO",
  "renegades": "Renegades", "the mongolz": "TheMongolz", "imperial esports": "Imperial",
  "godsent": "GODSENT", "dignitas": "Dignitas", "team dignitas": "Dignitas", "heroic": "Heroic",
})) teamByName.set(norm(alias), abbr);

const playerByKey = new Map();
for (const p of players) { playerByKey.set(norm(p.id), p.id); playerByKey.set(deleet(p.id), p.id); }

const resolve = (kind, rawName) => kind === "team"
  ? teamByName.get(norm(rawName))
  : (playerByKey.get(norm(rawName)) ?? playerByKey.get(deleet(rawName)));

// ─── seções (cabeçalho → primeira tabela depois dele) ───
function sectionTables(html) {
  // divide por headings; p/ cada um, a 1ª <table> até o próximo heading
  const parts = html.split(/<h[234][^>]*>/);
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i];
    const heading = stripTags((seg.match(/^([\s\S]*?)<\/h[234]>/) || [])[1] || "");
    const tbl = seg.match(/<table[^>]*>[\s\S]*?<\/table>/);
    if (heading && tbl) out.push({ heading, rows: [...tbl[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1]) });
  }
  return out;
}

// Config por página: cada item localiza a seção por substring do título e extrai 1+ tabela(s).
//  type "table": entidade em nameCol, valor por value(cellsText). type "count": agrega contagem por entidade.
const CONFIG = {
  team: [
    { match: "team medals", emit: [
      { key: "team_titles", title: "Times com mais títulos de Major (all-time)", nameCol: 0, value: (t) => +t[1] },
      { key: "team_finals", title: "Times em mais finais de Major (all-time)", nameCol: 0, value: (t) => (+t[1] || 0) + (+t[2] || 0) },
      { key: "team_podiums", title: "Times com mais pódios em Major (all-time)", nameCol: 0, value: (t) => +t[t.length - 1] },
    ] },
    { match: "team participation", emit: [
      { key: "team_appearances", title: "Times com mais presenças em Major", nameCol: 0, value: (t) => +t[t.length - 1] },
    ] },
  ],
  player: [
    { match: "titles won per player", emit: [
      { key: "player_titles", title: "Jogadores com mais títulos de Major (all-time)", nameCol: 0, value: (t) => +t[1] },
    ] },
    { match: "most major appearances", emit: [
      { key: "player_appearances", title: "Jogadores com mais presenças em Major", nameCol: 0, value: (t) => +t[1] },
    ] },
    { match: "mvp awards", emit: [
      { key: "player_mvps", title: "Jogadores com mais prêmios de MVP de Major", nameCol: 1, count: true },
    ] },
  ],
};

function parseStats(html, kind) {
  const out = [];
  const unresolved = new Set();
  const secs = sectionTables(html);
  for (const cfg of CONFIG[kind]) {
    const sec = secs.find((s) => norm(s.heading).includes(cfg.match));
    if (!sec) continue;
    for (const e of cfg.emit) {
      const counts = new Map(); // p/ type count
      const entries = [];
      for (const r of sec.rows.slice(1)) {
        const c = cellsOf(r);
        if (c.length <= e.nameCol) continue;
        const name = entityName(c[e.nameCol]);
        const id = resolve(kind, name);
        if (!id) { if (name && !/^\s*$/.test(name)) unresolved.add(name); continue; }
        if (e.count) { counts.set(id, (counts.get(id) || 0) + 1); continue; }
        const value = e.value(c.map(stripTags));
        if (!Number.isFinite(value)) continue;
        entries.push({ entity: { kind, id }, value });
      }
      if (e.count) for (const [id, value] of counts) entries.push({ entity: { kind, id }, value });
      entries.sort((a, b) => b.value - a.value);
      if (entries.length) out.push({ key: e.key, title: e.title, entries });
    }
  }
  return { out, unresolved: [...unresolved] };
}

async function main() {
  const test = process.argv.includes("--test");
  const pages = [["team", "Majors/Team_Statistics"], ["player", "Majors/Player_Statistics"]];
  const all = [];
  for (const [kind, page] of pages) {
    console.log(`\n[${page}]`);
    let html;
    try { html = await fetchRenderedHtml(page); }
    catch (e) { console.log(`  ✗ ${e.message}`); continue; }
    const { out, unresolved } = parseStats(html, kind);
    for (const tbl of out) console.log(`  ✓ ${tbl.key.padEnd(20)} ${tbl.entries.length} entradas · top: ${tbl.entries.slice(0, 3).map((e) => `${e.entity.id}(${e.value})`).join(", ")}`);
    if (unresolved.length) console.log(`  ⚠ não resolvidos (${unresolved.length}): ${unresolved.slice(0, 12).join(", ")}`);
    all.push(...out);
  }
  if (test) { console.log("\n--test: nada escrito."); return; }
  writeFileSync(join(OUT_DIR, "top10-stats.json"), JSON.stringify(all, null, 2));
  console.log(`\n✔ ${all.length} tabelas → public/data/top10-stats.json`);
}

main();
