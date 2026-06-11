// Protótipo de validação do pipeline Liquipedia (sem dependências; Node 18+).
// Busca o wikitext de páginas de jogador (com cache em disco + rate-limit),
// parseia o Infobox player e extrai país, roles e histórico de times.
//
// Uso:  node scripts/proto-parse-player.mjs S1mple ZywOo device
//
// Respeita os Termos de Uso da API da Liquipedia: User-Agent descritivo,
// 1 request a cada ~2s, e cache local (não re-baixa).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, ".cache");
mkdirSync(CACHE_DIR, { recursive: true });

const API = "https://liquipedia.net/counterstrike/api.php";
const USER_AGENT =
  "cs-5-dataset-builder/0.1 (gabrieldamasceno.bad@gmail.com; CS daily games project)";
const RATE_MS = 2100;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWikitext(page) {
  const cacheFile = join(CACHE_DIR, `${page.replace(/[^a-z0-9]/gi, "_")}.json`);
  if (existsSync(cacheFile)) {
    return JSON.parse(readFileSync(cacheFile, "utf8")).parse.wikitext["*"];
  }
  const url = `${API}?action=parse&page=${encodeURIComponent(
    page
  )}&prop=wikitext&format=json&redirects=1`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${page}`);
  const json = await res.json();
  writeFileSync(cacheFile, JSON.stringify(json));
  await sleep(RATE_MS); // rate-limit só após download real (cache não conta)
  return json.parse.wikitext["*"];
}

// Extrai o bloco {{Infobox player ...}} balanceando chaves.
function extractInfobox(wt) {
  const start = wt.indexOf("{{Infobox player");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < wt.length; i++) {
    if (wt[i] === "{" && wt[i + 1] === "{") { depth++; i++; }
    else if (wt[i] === "}" && wt[i + 1] === "}") { depth--; i++; if (depth === 0) return wt.slice(start, i + 1); }
  }
  return wt.slice(start);
}

// Lê um campo simples |key=value do infobox (até a próxima linha que começa com |).
function field(infobox, key) {
  const re = new RegExp(`\\n\\|${key}\\s*=\\s*([^\\n]*)`, "i");
  const m = infobox.match(re);
  return m ? m[1].trim() : undefined;
}

const ROLE_MAP = { rifle: "rifler", awp: "awper", igl: "igl", support: "support", entry: "entry" };
const COUNTRY_ISO = {
  Ukraine: "UA", Denmark: "DK", Sweden: "SE", Russia: "RU", France: "FR",
  Brazil: "BR", "United States": "US", Poland: "PL", Finland: "FI", Norway: "NO",
  "Bosnia and Herzegovina": "BA", Slovakia: "SK", Kazakhstan: "KZ", Israel: "IL",
  Turkey: "TR", Germany: "DE", Canada: "CA", "United Kingdom": "GB", China: "CN",
  Australia: "AU", Estonia: "EE", Latvia: "LV", Serbia: "RS", Mongolia: "MN",
};

// Parseia os templates {{TH|daterange|Team|...flags/link=}} do team_history.
function parseTeamHistory(infobox) {
  const out = [];
  let currentGame = null;
  // Percorre o team_history preservando os marcadores de era ('''Counter-Strike...''').
  const thStart = infobox.indexOf("|team_history=");
  const section = thStart === -1 ? infobox : infobox.slice(thStart);
  const tokenRe = /'''(Counter-Strike[^']*)'''|\{\{TH\|([^}]*)\}\}/g;
  let mt;
  while ((mt = tokenRe.exec(section))) {
    if (mt[1]) { currentGame = /Global Offensive/.test(mt[1]) ? "csgo" : "cs2"; continue; }
    const parts = mt[2].split("|").map((s) => s.trim());
    const [range, team, ...rest] = parts;
    let link, flags = [];
    for (const r of rest) {
      if (r.startsWith("link=")) link = r.slice(5);
      else if (r) flags.push(r);
    }
    const [from, to] = range.split(/\s*[—–-]\s*/).map((s) => s.replace(/'''/g, "").trim());
    out.push({ org: team, link, from, to, flags, game: currentGame });
  }
  return out;
}

function parsePlayer(page, wt) {
  const ib = extractInfobox(wt);
  if (!ib) return { page, error: "sem Infobox player" };
  const country = field(ib, "country");
  const roles = (field(ib, "roles") || "")
    .split(/[,/]/).map((r) => ROLE_MAP[r.trim().toLowerCase()]).filter(Boolean);
  const history = parseTeamHistory(ib);
  // Orgs distintas (identidade pelo link canônico quando houver, senão o nome de exibição).
  const teamOrgs = [...new Set(history.map((h) => h.link || h.org))];
  return {
    id: field(ib, "id"),
    page,
    realName: field(ib, "romanized_name") || field(ib, "name"),
    country,
    countryCode: COUNTRY_ISO[country] || null,
    roles,
    status: field(ib, "status"),
    csgo: field(ib, "csgo") === "y",
    cs2: field(ib, "cs2") === "y",
    teamOrgs,
    historyCount: history.length,
    history,
  };
}

const pages = process.argv.slice(2);
if (pages.length === 0) pages.push("S1mple", "ZywOo", "device");

for (const page of pages) {
  try {
    const wt = await fetchWikitext(page);
    const p = parsePlayer(page, wt);
    console.log("\n=== " + page + " ===");
    console.log(`id: ${p.id} | nome: ${p.realName} | país: ${p.country} (${p.countryCode}) | status: ${p.status}`);
    console.log(`roles: ${p.roles.join(", ") || "—"} | csgo:${p.csgo} cs2:${p.cs2} | entradas de histórico: ${p.historyCount}`);
    console.log(`orgs distintas (${p.teamOrgs.length}): ${p.teamOrgs.join(", ")}`);
  } catch (e) {
    console.log(`\n=== ${page} === ERRO: ${e.message}`);
  }
}
