// Harvester COMBINADO do perfil HLTV de cada jogador:
//   (1) re-deriva teamsNotable da tabela `.team-breakdown` (AUTORITATIVO — corrige
//       erros do dataset antigo, ex.: Xyp9x→fnatic, device→100T);
//   (2) baixa a bodyshot (og:image) PELO BROWSER (o img-cdn bloqueia fetch externo
//       com 403; em página, com o contexto do HLTV, passa).
//
// nick → {hltvId,slug} vem dos caches de evento. Cache do HTML do perfil em
// scripts/.cache/hltv_profile_<id>.html (re-runs offline). players SEM id HLTV
// (obscuros) ficam intocados. AVISO: abre janela do Chrome.
//
// Uso: node scripts/harvest-hltv-profiles.mjs   (CS5_LIMIT=N p/ testar)
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchHtml, evalInPage, closeBrowser } from "./hltv-fetch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const PHOTO_DIR = join(ROOT, "public", "players");
mkdirSync(PHOTO_DIR, { recursive: true });
const LIMIT = +(process.env.CS5_LIMIT || 0);

const players = JSON.parse(readFileSync(join(ROOT, "public", "data", "players.json"), "utf8"));
const teams = JSON.parse(readFileSync(join(ROOT, "public", "data", "teams.json"), "utf8"));

// ─── mapa slug(HLTV) → abbr(nosso) ───
const slugify = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const slugToAbbr = new Map();
const addSlug = (slug, abbr) => { if (slug && !slugToAbbr.has(slug)) slugToAbbr.set(slug, abbr); };
for (const t of teams) {
  addSlug(slugify(t.abbr), t.abbr);
  addSlug(slugify(t.name), t.abbr);
  addSlug(slugify(t.name.replace(/^team\s+/i, "")), t.abbr);
  addSlug(slugify(t.name.replace(/\s+(gaming|clan|esports|tactics)$/i, "")), t.abbr);
}
for (const [slug, abbr] of Object.entries({
  mousesports: "MOUZ", "gambit-esports": "Gambit", "gambit-gaming": "Gambit",
  "g2-esports": "G2", "team-envyus": "EnVyUs", "ninjas-in-pyjamas": "NIP",
  "luminosity-gaming": "Luminosity", "optic-gaming": "OpTic", "sk-gaming": "SK",
  "the-mongolz": "TheMongolz", "evil-geniuses": "EG", "complexity-gaming": "Complexity",
  virtuspro: "Virtus.pro", "virtus-pro": "Virtus.pro", "space-soldiers": "Space Soldiers",
  "mad-lions": "MAD Lions", "gen-g": "Gen.G", envy: "EnVyUs",
})) addSlug(slug, abbr);

// ─── nick → {id,slug} dos caches de evento ───
const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const linkRe = /<a href="\/stats\/players\/(\d+)\/([a-z0-9_-]+)\?event=\d+"[^>]*>([^<]+)<\/a>/g;
const hltv = new Map();
for (const f of readdirSync(CACHE).filter((f) => /^hltv_event_\d+\.html$/.test(f))) {
  const html = readFileSync(join(CACHE, f), "utf8");
  for (const m of html.matchAll(linkRe)) { const nk = norm(m[3].trim()); if (!hltv.has(nk)) hltv.set(nk, { id: m[1], slug: m[2] }); }
}

const safeName = (id) => id.replace(/[^a-z0-9_-]/gi, "_");
const unmapped = new Map();

/** abbrs notáveis (em ordem, sem repetir) a partir da tabela team-breakdown. */
function parseTeams(html) {
  const tbl = html.match(/<table[^>]*class="[^"]*team-breakdown[^"]*"[\s\S]*?<\/table>/i);
  if (!tbl) return null;
  const out = [];
  for (const m of tbl[0].matchAll(/\/team\/\d+\/([a-z0-9-]+)/gi)) {
    const slug = m[1];
    const abbr = slugToAbbr.get(slug);
    if (abbr) { if (!out.includes(abbr)) out.push(abbr); }
    else unmapped.set(slug, (unmapped.get(slug) || 0) + 1);
  }
  return out;
}

async function downloadPhoto(html, dest) {
  const og = (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i) || [])[1];
  if (!og || /default|silhouette|placeholder|noteam/i.test(og)) return false;
  const url = og.replace(/&amp;/g, "&");
  const dataUrl = await evalInPage(
    `fetch(${JSON.stringify(url)},{cache:'no-store'}).then(r=>r.ok?r.blob():null).then(b=>b?new Promise(res=>{const f=new FileReader();f.onloadend=()=>res(f.result);f.readAsDataURL(b);}):null).catch(()=>null)`
  );
  if (!dataUrl || !dataUrl.startsWith("data:image")) return false;
  writeFileSync(dest, Buffer.from(dataUrl.split(",")[1], "base64"));
  return true;
}

async function main() {
  const targets = players.filter((p) => hltv.has(norm(p.id)));
  const list = LIMIT ? targets.slice(0, LIMIT) : targets;
  console.log(`Perfis a processar: ${list.length} (de ${players.length} jogadores)`);
  let teamsFixed = 0, photos = 0, fail = 0;

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const ref = hltv.get(norm(p.id));
    const cacheFile = join(CACHE, `hltv_profile_${ref.id}.html`);
    let html;
    try {
      html = existsSync(cacheFile) ? readFileSync(cacheFile, "utf8")
        : await fetchHtml(`https://www.hltv.org/player/${ref.id}/${ref.slug}`, ".team-breakdown", { timeoutMs: 45000 });
      if (!existsSync(cacheFile)) writeFileSync(cacheFile, html);
    } catch (e) { fail++; console.log(`  ✗ ${p.id}: ${e.message}`); continue; }

    const abbrs = parseTeams(html);
    if (abbrs && abbrs.length) { p.teamsNotable = abbrs; teamsFixed++; }

    const dest = join(PHOTO_DIR, `${safeName(p.id)}.png`);
    if (!existsSync(dest)) {
      try { if (await downloadPhoto(html, dest)) { p.photo = `/players/${safeName(p.id)}.png`; photos++; } }
      catch { /* foto é best-effort */ }
    } else { p.photo = `/players/${safeName(p.id)}.png`; }

    if ((i + 1) % 20 === 0) {
      writeFileSync(join(ROOT, "public", "data", "players.json"), JSON.stringify(players, null, 2));
      console.log(`  …${i + 1}/${list.length} (teams ${teamsFixed}, fotos ${photos})`);
    }
  }

  await closeBrowser();
  writeFileSync(join(ROOT, "public", "data", "players.json"), JSON.stringify(players, null, 2));
  const topUnmapped = [...unmapped.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`\n✔ teamsNotable re-derivado: ${teamsFixed} · fotos: ${photos} · falhas: ${fail}`);
  console.log(`com foto: ${players.filter((p) => p.photo).length}/${players.length}`);
  if (topUnmapped.length) console.log(`slugs de time não mapeados (freq): ${topUnmapped.map(([s, n]) => `${s}(${n})`).join(", ")}`);
}

main().then(() => process.exit(0));
