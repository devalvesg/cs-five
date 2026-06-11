// Baixa logos dos times (Liquipedia, via prop=pageimages) e bandeiras (flagcdn) em PNG,
// armazenando em public/logos/<abbr>.<ext> e public/flags/<cc>.png.
// Uso: node scripts/fetch-assets.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOGO_DIR = join(ROOT, "public", "logos");
const FLAG_DIR = join(ROOT, "public", "flags");
mkdirSync(LOGO_DIR, { recursive: true });
mkdirSync(FLAG_DIR, { recursive: true });

const API = "https://liquipedia.net/counterstrike/api.php";
const UA = "cs5-bot/0.3 (https://csfive.gg; gabrieldamasceno.bad@gmail.com) asset-fetch";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// abbr (nosso) → título da página na Liquipedia (counterstrike)
const TEAM_PAGE = {
  "100T": "100 Thieves", Complexity: "Complexity Gaming", Dignitas: "Team Dignitas",
  EG: "Evil Geniuses", EnVyUs: "Team EnVyUs", FaZe: "FaZe Clan", Falcons: "Team Falcons",
  FlipSid3: "FlipSid3 Tactics", G2: "G2 Esports", Gambit: "Gambit Esports",
  Imperial: "Imperial Esports", Liquid: "Team Liquid", Luminosity: "Luminosity Gaming",
  NAVI: "Natus Vincere", NIP: "Ninjas in Pyjamas", OpTic: "OpTic Gaming", SK: "SK Gaming",
  Spirit: "Team Spirit", TSM: "Team SoloMid", TheMongolz: "The MongolZ", Vitality: "Team Vitality",
  fnatic: "Fnatic", iBUYPOWER: "IBUYPOWER", paiN: "paiN Gaming",
};

let lastApi = 0;
async function apiGet(params) {
  const wait = 2200 - (Date.now() - lastApi);
  if (wait > 0) await sleep(wait);
  lastApi = Date.now();
  const u = new URL(API);
  u.search = new URLSearchParams({ format: "json", formatversion: "2", ...params }).toString();
  const res = await fetch(u, { headers: { "User-Agent": UA, "Api-User-Agent": UA } }); // undici manda gzip
  if (!res.ok) throw new Error(`API HTTP ${res.status}`);
  return res.json();
}

async function liquipediaLogo(abbr) {
  const title = TEAM_PAGE[abbr] || abbr;
  // 1. wikitext do time → campo image=<arquivo> do {{Infobox team}}
  const wt = (await apiGet({ action: "query", prop: "revisions", rvslots: "main", rvprop: "content", redirects: "1", titles: title }))
    .query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
  if (!wt) throw new Error("sem wikitext");
  // Prefere o logo DARKMODE (claro, p/ fundo escuro); cai p/ image/logo padrão.
  const grab = (key) => wt.match(new RegExp(`\\n\\s*\\|\\s*${key}\\s*=\\s*([^\\n|}]+\\.(?:png|svg|jpg|jpeg))`, "i"))?.[1]?.trim();
  const file = grab("imagedark") || grab("image_darkmode") || grab("image") || grab("logo");
  if (!file) throw new Error("sem campo image no infobox");
  // 2. imageinfo do File: → URL real
  const src = (await apiGet({ action: "query", prop: "imageinfo", iiprop: "url", titles: `File:${file}` }))
    .query?.pages?.[0]?.imageinfo?.[0]?.url;
  if (!src) throw new Error(`sem imageinfo p/ ${file}`);
  return src;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

const teams = JSON.parse(readFileSync(join(ROOT, "public", "data", "teams.json"), "utf8"));
const players = JSON.parse(readFileSync(join(ROOT, "public", "data", "players.json"), "utf8"));
const countries = [...new Set(players.map((p) => p.countryCode))].filter(Boolean).sort();

const logoOk = {}, logoFail = [];
console.log(`\n── Logos de ${teams.length} times (Liquipedia) ──`);
for (const t of teams) {
  try {
    const src = await liquipediaLogo(t.abbr);
    const ext = (src.match(/\.(png|svg|jpg|jpeg|webp)(?:$|\?)/i)?.[1] || "png").toLowerCase();
    const file = `${t.abbr.replace(/[^a-z0-9]/gi, "_")}.${ext}`;
    await download(src, join(LOGO_DIR, file));
    await sleep(400);
    logoOk[t.abbr] = `/logos/${file}`;
    console.log(`  ✓ ${t.abbr.padEnd(16)} ${file}`);
  } catch (e) {
    logoFail.push(`${t.abbr}: ${e.message}`);
    console.log(`  ✗ ${t.abbr.padEnd(16)} ${e.message}`);
  }
}

console.log(`\n── Bandeiras de ${countries.length} países (flagcdn) ──`);
const flagFail = [];
for (const cc of countries) {
  try {
    await download(`https://flagcdn.com/w160/${cc.toLowerCase()}.png`, join(FLAG_DIR, `${cc}.png`));
    await sleep(150);
    console.log(`  ✓ ${cc}`);
  } catch (e) { flagFail.push(`${cc}: ${e.message}`); console.log(`  ✗ ${cc} ${e.message}`); }
}

// grava o caminho do logo de volta no teams.json
for (const t of teams) if (logoOk[t.abbr]) t.logo = logoOk[t.abbr];
writeFileSync(join(ROOT, "public", "data", "teams.json"), JSON.stringify(teams, null, 2));

console.log(`\n✔ Logos: ${Object.keys(logoOk).length}/${teams.length} | Bandeiras: ${countries.length - flagFail.length}/${countries.length}`);
if (logoFail.length) console.log(`Logos faltando:\n  ${logoFail.join("\n  ")}`);
if (flagFail.length) console.log(`Bandeiras faltando:\n  ${flagFail.join("\n  ")}`);
