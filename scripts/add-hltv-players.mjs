// Adiciona ao players.json os nicks que aparecem nas answers do Top 10 (HLTV) mas
// não estavam no dataset — com o countryCode AUTORITATIVO extraído da bandeira que
// o próprio HLTV renderiza na linha (scripts/.cache/hltv_event_*.html). Sem chute.
// Também baixa do flagcdn os PNGs de bandeira de países ainda sem asset.
// Idempotente. Uso: node scripts/add-hltv-players.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const FLAG_DIR = join(ROOT, "public", "flags");
mkdirSync(FLAG_DIR, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1) nick → countryCode (mais frequente) a partir das bandeiras do HLTV
const rowRe = /<img alt="([^"]*)" src="\/img\/static\/flags\/30x20\/([A-Z]{2})\.gif"[^>]*>\s*<a href="\/stats\/players\/\d+\/[^"]+"[^>]*>([^<]+)<\/a>/g;
const nickCC = {};
for (const f of readdirSync(CACHE).filter((f) => /^hltv_event_\d+\.html$/.test(f))) {
  const html = readFileSync(join(CACHE, f), "utf8");
  for (const m of html.matchAll(rowRe)) {
    const cc = m[2], nick = m[3].trim();
    (nickCC[nick] ??= {})[cc] = (nickCC[nick]?.[cc] || 0) + 1;
  }
}
const bestCC = (nick) => {
  const codes = nickCC[nick];
  return codes ? Object.entries(codes).sort((a, b) => b[1] - a[1])[0][0] : null;
};

// 2) nicks faltando = answers de temas de jogador sem entrada no players.json
const playersFile = join(ROOT, "public", "data", "players.json");
const players = JSON.parse(readFileSync(playersFile, "utf8"));
const have = new Set(players.map((p) => p.id));
const sched = JSON.parse(readFileSync(join(ROOT, "public", "data", "top10-schedule.json"), "utf8"));
const missing = new Set();
for (const t of sched) if (t.entityKind === "player") for (const a of t.answers) if (!have.has(a.id)) missing.add(a.id);

let added = 0;
const needFlags = new Set();
for (const nick of missing) {
  const cc = bestCC(nick);
  players.push({ id: nick, countryCode: cc, roles: [], csgo: true, cs2: true, teamsNotable: [], teamOrgsRaw: [] });
  added++;
  if (cc && !existsSync(join(FLAG_DIR, `${cc}.png`))) needFlags.add(cc);
}
players.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(playersFile, JSON.stringify(players, null, 2));
console.log(`✔ +${added} jogadores no players.json (total ${players.length})`);

// 3) baixa bandeiras faltantes do flagcdn
const UA = "cs5-bot/0.3 (https://csfive.gg; gabrieldamasceno.bad@gmail.com) flag-fetch";
console.log(`\nBandeiras novas a baixar: ${[...needFlags].join(", ") || "(nenhuma)"}`);
for (const cc of needFlags) {
  try {
    const res = await fetch(`https://flagcdn.com/w160/${cc.toLowerCase()}.png`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    writeFileSync(join(FLAG_DIR, `${cc}.png`), Buffer.from(await res.arrayBuffer()));
    console.log(`  ✓ ${cc}`);
    await sleep(150);
  } catch (e) { console.log(`  ✗ ${cc} ${e.message}`); }
}
console.log("\nLembre: adicione os países novos ao mapa COUNTRIES em lib/data/players.ts (nome PT).");
