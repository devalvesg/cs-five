// Constrói uma fatia real do dataset a partir de uma semente curada de jogadores
// notáveis. Busca cada página na Liquipedia (cache + rate-limit), parseia o
// Infobox player (país, roles, histórico de times) e normaliza os nomes de org.
//
// Uso:  node scripts/build-dataset.mjs
// Saída: public/data/players.json, public/data/teams.json

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, ".cache");
const OUT_DIR = join(__dirname, "..", "public", "data");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const API = "https://liquipedia.net/counterstrike/api.php";
const USER_AGENT = "cs-5-dataset-builder/0.1 (gabrieldamasceno.bad@gmail.com; CS daily games project)";
const RATE_MS = 8000; // espaçamento respeitoso entre downloads reais
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWikitext(page) {
  const cacheFile = join(CACHE_DIR, `${page.replace(/[^a-z0-9]/gi, "_")}.json`);
  if (existsSync(cacheFile)) return JSON.parse(readFileSync(cacheFile, "utf8")).parse.wikitext["*"];
  if (process.env.CS5_FROM_CACHE === "1") throw new Error("não cacheado");
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&redirects=1`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 429) {
      const ra = parseInt(res.headers.get("retry-after") || "", 10);
      const wait = (Number.isFinite(ra) ? ra : 60) * 1000 + 1500;
      process.stdout.write(`\r  …429 (rate limit), aguardando ${Math.round(wait / 1000)}s\n`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.info || "api error");
    writeFileSync(cacheFile, JSON.stringify(json));
    await sleep(RATE_MS);
    return json.parse.wikitext["*"];
  }
  throw new Error("429 persistente");
}

function extractInfobox(wt) {
  const start = wt.search(/\{\{Infobox player/i);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < wt.length; i++) {
    if (wt[i] === "{" && wt[i + 1] === "{") { depth++; i++; }
    else if (wt[i] === "}" && wt[i + 1] === "}") { depth--; i++; if (depth === 0) return wt.slice(start, i + 1); }
  }
  return wt.slice(start);
}
function field(ib, key) {
  const m = ib.match(new RegExp(`\\n\\|${key}\\s*=\\s*([^\\n]*)`, "i"));
  return m ? m[1].trim() : undefined;
}

const ROLE_MAP = { rifle: "rifler", awp: "awper", igl: "igl", support: "support", entry: "entry" };
const COUNTRY_ISO = {
  Ukraine: "UA", Denmark: "DK", Sweden: "SE", Russia: "RU", France: "FR", Brazil: "BR",
  "United States": "US", Poland: "PL", Finland: "FI", Norway: "NO", "Bosnia and Herzegovina": "BA",
  Slovakia: "SK", Kazakhstan: "KZ", Israel: "IL", Turkey: "TR", Germany: "DE", Canada: "CA",
  "United Kingdom": "GB", Estonia: "EE", Belgium: "BE", Latvia: "LV", Serbia: "RS",
};

// Normalização de orgs: nome na Liquipedia -> abbr canônico (pool notável do Grid).
const ORG_MAP = {
  "Natus Vincere": "NAVI", "FaZe Clan": "FaZe", "Team Liquid": "Liquid",
  "Ninjas in Pyjamas": "NIP", "Team SoloMid": "TSM", Astralis: "Astralis",
  "Team Vitality": "Vitality", "G2 Esports": "G2", Fnatic: "fnatic", "Virtus.pro": "Virtus.pro",
  mousesports: "MOUZ", MOUZ: "MOUZ", Cloud9: "Cloud9", Heroic: "Heroic", ENCE: "ENCE",
  FURIA: "FURIA", "FURIA Esports": "FURIA", "Team Spirit": "Spirit", BIG: "BIG",
  "Complexity Gaming": "Complexity", "Evil Geniuses": "EG", "100 Thieves": "100T",
  Renegades: "Renegades", "Team Dignitas": "Dignitas", Dignitas: "Dignitas", "SK Gaming": "SK",
  "Luminosity Gaming": "Luminosity", MIBR: "MIBR", "Gambit Esports": "Gambit", "Gambit Gaming": "Gambit",
  OG: "OG", HellRaisers: "HellRaisers", "Team Falcons": "Falcons", "NRG Esports": "NRG", TYLOO: "TYLOO",
  "FlipSid3 Tactics": "FlipSid3", "Titan": "Titan", "Team EnVyUs": "EnVyUs", "Team Vitality": "Vitality",
};
const TEAM_NAMES = {
  NAVI: "Natus Vincere", FaZe: "FaZe Clan", Liquid: "Team Liquid", NIP: "Ninjas in Pyjamas",
  TSM: "Team SoloMid", Astralis: "Astralis", Vitality: "Team Vitality", G2: "G2 Esports",
  fnatic: "Fnatic", "Virtus.pro": "Virtus.pro", MOUZ: "MOUZ", Cloud9: "Cloud9", Heroic: "Heroic",
  ENCE: "ENCE", FURIA: "FURIA", Spirit: "Team Spirit", BIG: "BIG", Complexity: "Complexity",
  EG: "Evil Geniuses", "100T": "100 Thieves", Renegades: "Renegades", Dignitas: "Dignitas",
  SK: "SK Gaming", Luminosity: "Luminosity", MIBR: "MIBR", Gambit: "Gambit", OG: "OG",
  HellRaisers: "HellRaisers", Falcons: "Team Falcons", NRG: "NRG", TYLOO: "TYLOO", FlipSid3: "FlipSid3 Tactics",
};

function parseTeamHistory(ib) {
  const out = [];
  let game = null;
  const start = ib.indexOf("|team_history=");
  const section = start === -1 ? ib : ib.slice(start);
  const re = /'''(Counter-Strike[^']*)'''|\{\{TH\|([^}]*)\}\}/g;
  let m;
  while ((m = re.exec(section))) {
    if (m[1]) { game = /Global Offensive/.test(m[1]) ? "csgo" : "cs2"; continue; }
    const parts = m[2].split("|").map((s) => s.trim());
    const [range, team, ...rest] = parts;
    let link, flags = [];
    for (const r of rest) { if (r.startsWith("link=")) link = r.slice(5); else if (r) flags.push(r); }
    const [from, to] = range.split(/\s*[—–]\s*/).map((s) => s.replace(/'''/g, "").trim());
    out.push({ org: link || team, from, to, flags, game });
  }
  return out;
}

function parsePlayer(page, wt) {
  const ib = extractInfobox(wt);
  if (!ib) return null;
  const country = field(ib, "country");
  const history = parseTeamHistory(ib);
  const teamsNotable = [...new Set(history.map((h) => ORG_MAP[h.org]).filter(Boolean))];
  return {
    id: field(ib, "id") || page,
    realName: field(ib, "romanized_name") || field(ib, "name"),
    country, countryCode: COUNTRY_ISO[country] || null,
    roles: (field(ib, "roles") || "").split(/[,/]/).map((r) => ROLE_MAP[r.trim().toLowerCase()]).filter(Boolean),
    status: field(ib, "status"),
    csgo: field(ib, "csgo") === "y", cs2: field(ib, "cs2") === "y",
    teamsNotable,
    teamOrgsRaw: [...new Set(history.map((h) => h.org))],
  };
}

const SEED = [
  // Dinamarca
  "device", "dupreeh", "Xyp9x", "gla1ve", "Magisk", "karrigan", "cadiaN", "blameF", "stavn", "TeSeS",
  "jabbi", "sjuush", "MSL", "k0nfig", "Kjaerbye", "Bubzkji", "HooXi", "Staehr", "nicoodoz", "refrezh", "roeJ", "Snappi",
  // Suécia
  "f0rest", "GeT_RiGhT", "JW", "KRIMZ", "flusha", "olofmeister", "REZ", "dennis", "twist", "Brollan",
  "Plopski", "friberg", "Xizt", "hampus", "draken", "pronax",
  // Ucrânia
  "s1mple", "b1t", "Zeus (Ukrainian player)", "npl", "sdy", "w0nderful", "jL", "zont1x",
  // Rússia
  "electronic", "flamie", "Perfecto", "sh1ro", "Ax1Le", "interz", "Boombl4", "jame", "n0rb3r7",
  "magixx", "donk", "chopper", "KrizzeN",
  // França
  "ZywOo", "apEX", "shox", "NBK", "kennyS", "Happy", "RpK", "kioShiMa", "ScreaM", "SmithZz",
  "Maniac", "Ex6TenZ", "bodyy", "AmaNEk", "misutaaa", "JACKZ", "mezii",
  // Brasil
  "coldzera", "FalleN", "fer", "TACO", "fnx", "boltz", "steel", "felps", "HEN1", "kscerato",
  "yuurih", "saffee", "chelo", "skullz",
  // Bósnia / Eslováquia
  "NiKo", "huNter-", "GuardiaN", "frozen",
  // Polônia
  "NEO", "TaZ", "pashaBiceps", "Snax", "byali", "MICHU", "dycha", "Furlan",
  // Finlândia
  "allu", "Aleksib", "sergej", "suNny", "xseveN", "Jamppi", "Aerial",
  // Noruega / Estônia
  "rain", "jkaem", "ropz",
  // Alemanha
  "tabseN", "k1to", "syrsoN", "tiziaN", "JDC", "faveN", "Krimbo", "nex",
  // EUA / Canadá
  "EliGE", "Twistzz", "NAF", "stewie2k", "tarik", "autimatic", "Brehze", "Ethan", "daps", "oSee",
  "floppy", "FNS", "RUSH", "Skadoodle", "n0thing", "nitr0",
  // Austrália
  "jks", "AZR", "Liazz",
  // Turquia
  "XANTARES", "woxic", "imoRR", "MAJ3R", "Calyx",
  // Estrelas atuais (G2 / MOUZ / etc.)
  "m0NESY", "malbsMd", "siuhy", "torzsi", "xertioN", "Jimpphat", "broky", "Spinx",
];

const TEAM_NAME = (abbr) => TEAM_NAMES[abbr] || abbr;
function writeOut(players) {
  const usedTeams = [...new Set(players.flatMap((p) => p.teamsNotable))].sort();
  const teams = usedTeams.map((abbr) => ({ abbr, name: TEAM_NAME(abbr) }));
  writeFileSync(join(OUT_DIR, "players.json"), JSON.stringify(players, null, 2));
  writeFileSync(join(OUT_DIR, "teams.json"), JSON.stringify(teams, null, 2));
}

const players = [];
const errors = [];
let i = 0;
for (const page of SEED) {
  i++;
  try {
    const wt = await fetchWikitext(page);
    const p = parsePlayer(page, wt);
    if (!p) { errors.push(`${page}: sem infobox`); continue; }
    players.push(p);
    writeOut(players); // escrita incremental: dataset utilizável a qualquer momento
    process.stdout.write(`\r[${i}/${SEED.length}] ${p.id.padEnd(14)} (${p.countryCode}) times: ${p.teamsNotable.join(",") || "-"}\n`);
  } catch (e) { errors.push(`${page}: ${e.message}`); process.stdout.write(`\r[${i}/${SEED.length}] ${page}: ERRO ${e.message}\n`); }
}

writeOut(players);
const usedTeams = [...new Set(players.flatMap((p) => p.teamsNotable))];
console.log(`\n✔ ${players.length} jogadores · ${usedTeams.length} times notáveis`);
if (errors.length) console.log(`⚠ ${errors.length} erros: ${errors.join(" | ")}`);
