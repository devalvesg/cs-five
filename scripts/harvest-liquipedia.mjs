// Harvester COMPLIANT da Liquipedia (MediaWiki API gratuita — não a LPDB paga).
//
// Corrige exatamente o que nos bloqueou antes:
//  1. User-Agent que identifica projeto + contato (genérico é bloqueado).
//  2. gzip: o fetch do Node (undici) já pede e descomprime gzip por padrão —
//     NÃO setamos Accept-Encoding na mão (isso desliga a descompressão automática).
//  3. Reuso de conexão: undici usa um pool keep-alive global por padrão.
//  4. action=query&prop=revisions (limite 1 req/2s) em vez de action=parse
//     (1 req/30s, o "caro"). Mesmo wikitext cru, 15× mais rápido e dentro do TOS.
//  5. Enumeração via list=categorymembers (até 500 títulos por request).
//
// Uso:
//   node scripts/harvest-liquipedia.mjs --category "Danish Players" --limit 20 --dry
//     → TESTE pequeno: lista a categoria, baixa N jogadores, imprime, NÃO escreve.
//   node scripts/harvest-liquipedia.mjs            → crawl completo (CATEGORIES), escreve players.json/teams.json
//   CS5_FROM_CACHE=1 node scripts/harvest-liquipedia.mjs  → só do cache (offline)

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, ".cache");
const OUT_DIR = join(__dirname, "..", "public", "data");
mkdirSync(CACHE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const API = "https://liquipedia.net/counterstrike/api.php";
// Identifica projeto + contato, conforme exigido pelo TOS da Liquipedia.
const USER_AGENT = "cs5-bot/0.2 (https://csfive.gg; gabrieldamasceno.bad@gmail.com) dataset-harvester";
const RATE_MS = 2200; // > 1 req/2s exigido para requests padrão (query)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FROM_CACHE = process.env.CS5_FROM_CACHE === "1";

let lastCall = 0;
async function apiGet(params) {
  // Throttle global: garante o espaçamento mínimo entre QUALQUER request real.
  const since = Date.now() - lastCall;
  if (since < RATE_MS) await sleep(RATE_MS - since);
  const usp = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const url = `${API}?${usp}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Api-User-Agent": USER_AGENT },
      // undici já envia Accept-Encoding: gzip e descomprime — não sobrescrever.
    });
    lastCall = Date.now();
    if (res.status === 429) {
      const ra = parseInt(res.headers.get("retry-after") || "", 10);
      const wait = (Number.isFinite(ra) ? ra : 60) * 1000 + 1500;
      process.stdout.write(`  …429, aguardando ${Math.round(wait / 1000)}s\n`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error.info || "api error");
    return json;
  }
  throw new Error("429 persistente");
}

/** Lista títulos de páginas de uma categoria (paginado via cmcontinue). */
async function listCategory(category, limit = Infinity) {
  const titles = [];
  let cont;
  do {
    const json = await apiGet({
      action: "query", list: "categorymembers",
      cmtitle: `Category:${category}`, cmlimit: "500", cmtype: "page",
      ...(cont ? { cmcontinue: cont } : {}),
    });
    for (const m of json.query?.categorymembers || []) {
      titles.push(m.title);
      if (titles.length >= limit) return titles;
    }
    cont = json.continue?.cmcontinue;
  } while (cont);
  return titles;
}

/** Wikitext cru via revisions (request padrão, 2s) — com cache em disco. */
async function fetchWikitext(page) {
  const cacheFile = join(CACHE_DIR, `${page.replace(/[^a-z0-9]/gi, "_")}.wikitext`);
  if (existsSync(cacheFile)) return readFileSync(cacheFile, "utf8");
  if (FROM_CACHE) throw new Error("não cacheado");
  const json = await apiGet({
    action: "query", prop: "revisions", rvslots: "main", rvprop: "content",
    titles: page, redirects: "1",
  });
  const pg = json.query?.pages?.[0];
  if (!pg || pg.missing) throw new Error("página inexistente");
  const content = pg.revisions?.[0]?.slots?.main?.content;
  if (!content) throw new Error("sem conteúdo");
  writeFileSync(cacheFile, content);
  return content;
}

// ─── Parsing do Infobox player (mesma lógica do build-dataset.mjs) ───
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

const COUNTRY_ISO = {
  Ukraine: "UA", Denmark: "DK", Sweden: "SE", Russia: "RU", France: "FR", Brazil: "BR",
  "United States": "US", Poland: "PL", Finland: "FI", Norway: "NO", "Bosnia and Herzegovina": "BA",
  Slovakia: "SK", Kazakhstan: "KZ", Israel: "IL", Turkey: "TR", Germany: "DE", Canada: "CA",
  "United Kingdom": "GB", Estonia: "EE", Belgium: "BE", Latvia: "LV", Serbia: "RS", Lithuania: "LT",
  "Czech Republic": "CZ", Netherlands: "NL", Hungary: "HU", Guatemala: "GT", Bulgaria: "BG",
  Indonesia: "ID", Mongolia: "MN", Australia: "AU", China: "CN", "United Kingdom of Great Britain and Northern Ireland": "GB",
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
    let link;
    const roleParts = [];
    for (const r of rest) {
      if (r.startsWith("link=")) link = r.slice(5);
      else if (r && !r.includes("=")) roleParts.push(r);
    }
    // 3º campo do TH indica a função na passagem: "Coach", "Inactive Coach", etc.
    const isCoach = /coach|manager|analyst/i.test(roleParts.join(" "));
    const [from, to] = range.split(/\s*[—–]\s*/).map((s) => s.replace(/'''/g, "").trim());
    out.push({ org: link || team, from, to, game, isCoach });
  }
  return out;
}

function parsePlayer(page, wt) {
  const ib = extractInfobox(wt);
  if (!ib) return null;
  const country = field(ib, "country");
  const history = parseTeamHistory(ib);
  // Só conta como time do jogador as passagens em que ele JOGOU (exclui coach/manager/analyst).
  const playedOrgs = [...new Set(history.filter((h) => !h.isCoach).map((h) => h.org))];
  const orgsRaw = [...new Set(history.map((h) => h.org))];
  const teamsNotable = [...new Set(playedOrgs.map((o) => ORG_MAP[normOrg(o)]).filter(Boolean))];
  const roles = (field(ib, "roles") || "")
    .split(/[,/]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  return {
    id: field(ib, "id") || page,
    realName: field(ib, "romanized_name") || field(ib, "name"),
    country, countryCode: COUNTRY_ISO[country] || null,
    roles,
    status: field(ib, "status"),
    csgo: field(ib, "csgo") === "y", cs2: field(ib, "cs2") === "y",
    teamsNotable,
    teamOrgsRaw: orgsRaw,
  };
}

// ─── Pool de orgs notáveis (mesmo esquema de abbr do build-curated) ───
const TEAM_NAMES = {
  Astralis: "Astralis", NAVI: "Natus Vincere", FaZe: "FaZe Clan", G2: "G2 Esports",
  Vitality: "Team Vitality", MOUZ: "MOUZ", Liquid: "Team Liquid", NIP: "Ninjas in Pyjamas",
  fnatic: "Fnatic", "Virtus.pro": "Virtus.pro", SK: "SK Gaming", MIBR: "MIBR",
  Luminosity: "Luminosity", Heroic: "Heroic", ENCE: "ENCE", OG: "OG", Spirit: "Team Spirit",
  Gambit: "Gambit", Cloud9: "Cloud9", EG: "Evil Geniuses", NRG: "NRG", Complexity: "Complexity",
  Falcons: "Team Falcons", BIG: "BIG", FURIA: "FURIA", Imperial: "Imperial", paiN: "paiN Gaming",
  Immortals: "Immortals", Renegades: "Renegades", "100T": "100 Thieves", TSM: "Team SoloMid",
  Dignitas: "Dignitas", HellRaisers: "HellRaisers", Titan: "Titan", EnVyUs: "Team EnVyUs",
  VeryGames: "VeryGames", North: "North", GODSENT: "GODSENT", Outsiders: "Outsiders",
  "Eternal Fire": "Eternal Fire", "Space Soldiers": "Space Soldiers", OpTic: "OpTic Gaming",
  "Gen.G": "Gen.G", iBUYPOWER: "iBUYPOWER", FlipSid3: "FlipSid3 Tactics", Apeks: "Apeks",
  GamerLegion: "GamerLegion", "MAD Lions": "MAD Lions", Sprout: "Sprout", "3DMAX": "3DMAX",
  Endpoint: "Endpoint", TheMongolz: "The Mongolz", TYLOO: "TYLOO", FlyQuest: "FlyQuest",
};

const normOrg = (s) => s.replace(/^ex-/i, "").replace(/\s*\(.*\)$/, "").trim().toLowerCase();
// alias (em minúsculas, sem "ex-"/parênteses) -> abbr canônico.
const ORG_ALIASES = {
  "astralis": "Astralis", "natus vincere": "NAVI", "navi": "NAVI",
  "faze clan": "FaZe", "faze": "FaZe", "g2 esports": "G2", "g2": "G2",
  "team vitality": "Vitality", "vitality": "Vitality", "mouz": "MOUZ", "mousesports": "MOUZ",
  "team liquid": "Liquid", "liquid": "Liquid", "ninjas in pyjamas": "NIP", "nip": "NIP",
  "fnatic": "fnatic", "virtus.pro": "Virtus.pro", "sk gaming": "SK", "mibr": "MIBR",
  "made in brazil": "MIBR", "luminosity gaming": "Luminosity", "luminosity": "Luminosity",
  "heroic": "Heroic", "ence": "ENCE", "og": "OG", "team spirit": "Spirit",
  "gambit esports": "Gambit", "gambit gaming": "Gambit", "gambit youngsters": "Gambit", "gambit": "Gambit",
  "cloud9": "Cloud9", "evil geniuses": "EG", "nrg": "NRG", "nrg esports": "NRG",
  "complexity gaming": "Complexity", "complexity": "Complexity", "team falcons": "Falcons", "falcons": "Falcons",
  "big": "BIG", "berlin international gaming": "BIG", "furia": "FURIA", "furia esports": "FURIA",
  "imperial esports": "Imperial", "imperial": "Imperial", "pain gaming": "paiN", "pain": "paiN",
  "immortals": "Immortals", "renegades": "Renegades", "100 thieves": "100T",
  "team solomid": "TSM", "tsm": "TSM", "dignitas": "Dignitas", "team dignitas": "Dignitas",
  "hellraisers": "HellRaisers", "titan": "Titan", "team envyus": "EnVyUs", "envyus": "EnVyUs",
  "verygames": "VeryGames", "north": "North", "godsent": "GODSENT", "outsiders": "Outsiders",
  "eternal fire": "Eternal Fire", "space soldiers": "Space Soldiers",
  "optic gaming": "OpTic", "optic": "OpTic", "gen.g": "Gen.G", "gen.g esports": "Gen.G",
  "ibuypower": "iBUYPOWER", "flipsid3 tactics": "FlipSid3", "flipsid3": "FlipSid3", "apeks": "Apeks",
  "gamerlegion": "GamerLegion", "mad lions": "MAD Lions", "sprout": "Sprout", "3dmax": "3DMAX",
  "endpoint": "Endpoint", "the mongolz": "TheMongolz", "themongolz": "TheMongolz",
  "tyloo": "TYLOO", "flyquest": "FlyQuest",
};
const ORG_MAP = ORG_ALIASES;

// ─── CLI ───
const argv = process.argv.slice(2);
const getFlag = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const hasFlag = (name) => argv.includes(`--${name}`);

async function runTest(category, limit) {
  console.log(`\n🔎 TESTE: Category:${category} (limite ${limit})\n`);
  const titles = await listCategory(category, limit);
  console.log(`Categoria retornou ${titles.length} título(s). Baixando wikitext...\n`);
  let ok = 0;
  for (const t of titles) {
    try {
      const wt = await fetchWikitext(t);
      const p = parsePlayer(t, wt);
      if (!p) { console.log(`  ✗ ${t}: sem infobox de player`); continue; }
      ok++;
      console.log(`  ✓ ${(p.id || t).padEnd(16)} ${(p.countryCode || "??").padEnd(3)} orgs: ${p.teamOrgsRaw.slice(0, 8).join(", ") || "-"}`);
    } catch (e) {
      console.log(`  ✗ ${t}: ${e.message}`);
    }
  }
  console.log(`\n✔ Teste OK: ${ok}/${titles.length} jogadores parseados sem bloqueio.`);
  console.log("Nada foi escrito (--dry). Cache em scripts/.cache/.");
}

// Categorias de país a varrer (demônimos da Liquipedia). Misses são tolerados.
const CATEGORIES = [
  "Danish Players", "Swedish Players", "French Players", "Brazilian Players",
  "Russian Players", "Ukrainian Players", "Finnish Players", "Polish Players",
  "American Players", "Canadian Players", "Australian Players", "German Players",
  "Turkish Players", "Norwegian Players", "Slovak Players", "Estonian Players",
  "Israeli Players", "Latvian Players", "British Players", "Bosnian Players",
  "Serbian Players", "Lithuanian Players", "Belgian Players", "Dutch Players",
  "Czech Players", "Spanish Players", "Bulgarian Players", "Mongolian Players",
  "Kazakh Players", "Chinese Players",
];

const TEAM_NAME = (abbr) => TEAM_NAMES[abbr] || abbr;
function writeOut(players) {
  const usedTeams = [...new Set(players.flatMap((p) => p.teamsNotable))].sort();
  const teams = usedTeams.map((abbr) => ({ abbr, name: TEAM_NAME(abbr) }));
  writeFileSync(join(OUT_DIR, "players.json"), JSON.stringify(players, null, 2));
  writeFileSync(join(OUT_DIR, "teams.json"), JSON.stringify(teams, null, 2));
}

async function runFull() {
  // Base = roster curado já vetado à mão; só ADICIONAMOS por cima (nunca perde).
  const basePath = join(OUT_DIR, "players.json");
  const base = existsSync(basePath) ? JSON.parse(readFileSync(basePath, "utf8")) : [];
  const merged = [...base];
  const seen = new Set(base.map((p) => p.id.toLowerCase()));
  console.log(`Base curada: ${base.length} jogadores. Iniciando crawl de ${CATEGORIES.length} categorias...\n`);

  let added = 0, fetched = 0;
  for (const cat of CATEGORIES) {
    let titles = [];
    try { titles = await listCategory(cat); }
    catch (e) { console.log(`[${cat}] ERRO ao listar: ${e.message}`); continue; }
    console.log(`[${cat}] ${titles.length} títulos`);
    let catAdded = 0;
    for (const t of titles) {
      if (seen.has(t.toLowerCase())) continue;
      let p;
      try { fetched++; p = parsePlayer(t, await fetchWikitext(t)); }
      catch { continue; }
      if (!p) continue;
      const idLow = (p.id || t).toLowerCase();
      if (seen.has(idLow)) continue;
      if (p.teamsNotable.length === 0) continue; // filtro de notabilidade (resolve homônimos/ruído)
      seen.add(idLow);
      delete p.country;
      merged.push(p);
      added++; catAdded++;
      writeOut(merged); // incremental: utilizável a qualquer momento
    }
    console.log(`[${cat}] +${catAdded} notáveis (total: ${merged.length}, fetches: ${fetched})`);
  }
  writeOut(merged);
  const usedTeams = [...new Set(merged.flatMap((p) => p.teamsNotable))];
  console.log(`\n✔ Crawl completo. ${merged.length} jogadores (+${added} novos) · ${usedTeams.length} times.`);
}

// Reconstrói o dataset OFFLINE reprocessando todo o cache com o parser atual
// (ex.: depois de corrigir o filtro de coach). Base = roster curado vetado à mão;
// reaplica o filtro de notabilidade — quem zera teamsNotable (ex.: coach puro) cai fora.
function rebuildFromCache() {
  const backupPath = join(OUT_DIR, "players.curated-backup.json");
  const basePath = existsSync(backupPath) ? backupPath : join(OUT_DIR, "players.json");
  const base = JSON.parse(readFileSync(basePath, "utf8"));
  const merged = [...base];
  const seen = new Set(base.map((p) => p.id.toLowerCase()));
  console.log(`Base curada: ${base.length} (de ${basePath}). Reprocessando cache...\n`);

  const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".wikitext"));
  let added = 0, dropped = 0;
  for (const f of files) {
    const wt = readFileSync(join(CACHE_DIR, f), "utf8");
    let p;
    try { p = parsePlayer(f.replace(/\.wikitext$/, ""), wt); } catch { continue; }
    if (!p || !p.countryCode) continue;
    const idLow = p.id.toLowerCase();
    if (seen.has(idLow)) continue;
    if (p.teamsNotable.length === 0) { dropped++; continue; } // coach puro / ruído
    seen.add(idLow);
    delete p.country;
    merged.push(p);
    added++;
  }
  writeOut(merged);
  const usedTeams = [...new Set(merged.flatMap((p) => p.teamsNotable))];
  console.log(`\n✔ Rebuild. ${merged.length} jogadores (+${added} do cache, ${dropped} descartados) · ${usedTeams.length} times.`);
}

// Achata leetspeak p/ casar id curado (device) com página da Liquipedia (dev1ce).
const deleet = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a")
    .replace(/5/g, "s").replace(/7/g, "t").replace(/[$]/g, "s").replace(/@/g, "a");

// Verifica os curados contra a Liquipedia: re-deriva teamsNotable DA FONTE
// (descarta a curadoria de memória, que tinha erros tipo device→Falcons) e reconcilia
// com os colhidos, deduplicando por leetspeak (device == dev1ce).
async function verifyCurated() {
  const curated = JSON.parse(readFileSync(join(OUT_DIR, "players.curated-backup.json"), "utf8"));
  console.log(`Verificando ${curated.length} curados contra a Liquipedia (fetch do que faltar)...\n`);

  // 1. Indexa TODO o cache por leetspeak(id parseado) → player da fonte.
  const sourceByLeet = new Map();
  for (const f of readdirSync(CACHE_DIR).filter((x) => x.endsWith(".wikitext"))) {
    let sp; try { sp = parsePlayer(f.replace(/\.wikitext$/, ""), readFileSync(join(CACHE_DIR, f), "utf8")); } catch { continue; }
    if (sp && sp.countryCode && sp.teamsNotable.length) sourceByLeet.set(deleet(sp.id), sp);
  }

  // 2. Garante a página de cada curado (fetch se ainda não há fonte p/ ele).
  const misses = [];
  for (const c of curated) {
    if (sourceByLeet.has(deleet(c.id))) continue;
    let sp;
    try { sp = parsePlayer(c.id, await fetchWikitext(c.id)); }
    catch (e) { misses.push(`${c.id} — ${e.message}`); continue; }
    if (!sp || !sp.countryCode) { misses.push(`${c.id} — sem infobox/país`); continue; }
    if (sp.teamsNotable.length === 0) { misses.push(`${c.id} — fonte sem time notável`); continue; }
    sourceByLeet.set(deleet(sp.id), sp);
    sourceByLeet.set(deleet(c.id), sp);
  }

  // Mesma pessoa? Trava contra homônimos (ex.: GuardiaN SK ≠ "Guardian" finlandês).
  // Regra: país precisa bater (quando ambos têm) E, se ambos têm nome real, precisam
  // compartilhar ≥1 token de nome (tolera sobrenome duplo/grafia: "Mario Samayoa" ~
  // "Mario Alberto Samayoa Díaz"). Sem nome de um dos lados, país basta.
  const normName = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const tokens = (s) => new Set(normName(s).split(/\s+/).filter((t) => t.length > 1));
  const samePerson = (c, src) => {
    const an = normName(c.realName), bn = normName(src.realName);
    if (an && bn && an === bn) return true; // nome idêntico → mesma pessoa (corrige país curado errado)
    if (c.countryCode && src.countryCode && c.countryCode !== src.countryCode) return false;
    const a = tokens(c.realName), b = tokens(src.realName);
    if (a.size && b.size && ![...a].some((t) => b.has(t))) return false; // nenhum nome em comum
    return true;
  };

  // 3. Reconcilia: curado vence no nick/realName; FONTE vence em teamsNotable (se for a mesma pessoa).
  const out = [];
  const seen = new Set();
  const diffs = [], unverified = [], homonyms = [];
  for (const c of curated) {
    const src = sourceByLeet.get(deleet(c.id));
    if (src && samePerson(c, src)) {
      const before = [...c.teamsNotable].sort().join(",");
      const after = [...src.teamsNotable].sort().join(",");
      if (before !== after) diffs.push(`${c.id}: [${c.teamsNotable.join(", ")}] → [${src.teamsNotable.join(", ")}]`);
      out.push({ ...c, realName: c.realName || src.realName, countryCode: src.countryCode,
        csgo: src.csgo, cs2: src.cs2, teamsNotable: src.teamsNotable, teamOrgsRaw: src.teamOrgsRaw });
      seen.add(deleet(c.id)); seen.add(deleet(src.id));
    } else {
      if (src) { homonyms.push(`${c.id} (${c.countryCode}/${c.realName || "?"}) ≠ fonte (${src.countryCode}/${src.realName || "?"})`); seen.add(deleet(src.id)); }
      out.push(c); unverified.push(c.id); seen.add(deleet(c.id));
    }
  }
  // 4. Acrescenta os colhidos que não correspondem a nenhum curado.
  let harvested = 0;
  for (const [leet, sp] of sourceByLeet) {
    if (seen.has(leet)) continue;
    seen.add(leet);
    const { country, ...rest } = sp;
    out.push(rest); harvested++;
  }
  writeOut(out);

  console.log(`\n── Diffs corrigidos da curadoria (${diffs.length}) ──`);
  console.log(diffs.join("\n") || "(nenhum)");
  console.log(`\n── Homônimos rejeitados (curado preservado) (${homonyms.length}) ──`);
  console.log(homonyms.join("\n") || "(nenhum)");
  console.log(`\n── Curados NÃO verificados (mantidos como estavam) (${unverified.length}) ──`);
  console.log(unverified.join(", ") || "(nenhum)");
  console.log(`\n── Detalhe das falhas de fetch (${misses.length}) ──`);
  console.log(misses.join("\n") || "(nenhum)");
  const usedTeams = [...new Set(out.flatMap((p) => p.teamsNotable))];
  console.log(`\n✔ ${out.length} jogadores (${curated.length} curados verificados + ${harvested} colhidos) · ${usedTeams.length} times.`);
}

// Repara os curados que o verify não conseguiu casar (homônimo/colisão de índice):
// força o fetch da página EXATA do nick, revalida identidade e aplica se conferir.
async function repairUnverified() {
  const UNVERIFIED = [
    "HooXi", "roeJ", "refrezh", "Plopski", "ScreaM", "AmaNEk", "misutaaa", "Maka",
    "magixx", "b1t", "zont1x", "xseveN", "NEO", "Liazz", "NiKo", "GuardiaN", "k1to",
    "nex", "imoRR", "xertioN", "AdreN", "acoR", "Djoko", "Graviti", "Ex3rcice",
    "brnz4n", "ANGE1", "dexter", "xfl0ud", "Wicadia", "oskar", "CeRq", "bLitzZ",
    "Techno4K", "mzinho", "Senzu",
  ];
  // Títulos certos p/ nicks que caem em página de desambiguação.
  const TITLE = { ScreaM: "ScreaM (Belgian player)", AdreN: "AdreN (Kazakh player)" };
  // Curados com nick errado que já existem com o nick certo (colhido) → remover duplicata.
  const DROP = new Set(["bLitzZ"]); // = bLitz (Garidmagnai Byambasuren), já no dataset
  const players = JSON.parse(readFileSync(join(OUT_DIR, "players.json"), "utf8"));
  const byId = new Map(players.map((p) => [p.id, p]));

  // A página canônica do nick (id=nick) é autoritativa — minha curadoria de nome/país
  // é que era falha. Aplica a fonte por inteiro (nome/país/times) quando id confere.
  const matched = [], missed = [], dropped = [];
  for (const id of UNVERIFIED) {
    if (DROP.has(id)) { dropped.push(id); continue; }
    let sp;
    try { sp = parsePlayer(id, await fetchWikitext(TITLE[id] || id)); }
    catch (e) { missed.push(`${id} — fetch: ${e.message}`); continue; }
    if (!sp) { missed.push(`${id} — sem infobox de player na página`); continue; }
    if (sp.id.toLowerCase() !== id.toLowerCase()) { missed.push(`${id} — página redirecionou p/ "${sp.id}" (verificar)`); continue; }
    if (sp.teamsNotable.length === 0) { missed.push(`${id} — fonte sem time notável (${sp.realName || "?"})`); continue; }
    const cur = byId.get(id);
    if (cur) {
      matched.push(`${id}: [${cur.teamsNotable.join(", ")}] → [${sp.teamsNotable.join(", ")}] (${sp.realName || "?"}/${sp.countryCode})`);
      cur.realName = sp.realName || cur.realName;
      cur.teamsNotable = sp.teamsNotable; cur.teamOrgsRaw = sp.teamOrgsRaw;
      cur.countryCode = sp.countryCode; cur.csgo = sp.csgo; cur.cs2 = sp.cs2;
    }
  }
  const final = players.filter((p) => !DROP.has(p.id));
  writeOut(final);
  if (dropped.length) console.log(`\n── Duplicatas removidas (nick errado, já existe o certo) (${dropped.length}) ──\n${dropped.join(", ")}`);
  console.log(`\n── Reparados pela página correta (${matched.length}) ──\n${matched.join("\n") || "(nenhum)"}`);
  console.log(`\n── Ainda sem casar — precisa desambiguação manual (${missed.length}) ──\n${missed.join("\n") || "(nenhum)"}`);
  console.log(`\n✔ ${final.length} jogadores. Restam ${missed.length} curados não verificados.`);
}

const category = getFlag("category");
const limit = parseInt(getFlag("limit") || "20", 10);

if (hasFlag("repair")) {
  await repairUnverified();
} else if (hasFlag("verify-curated")) {
  await verifyCurated();
} else if (hasFlag("rebuild-from-cache")) {
  rebuildFromCache();
} else if (category && hasFlag("dry")) {
  await runTest(category, limit);
} else {
  await runFull();
}
