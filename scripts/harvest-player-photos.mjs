// Baixa a foto (bodyshot) de cada jogador do HLTV → public/players/<id>.png e
// grava o campo `photo` no players.json. Usa o bypass de Cloudflare
// (scripts/hltv-fetch.mjs): pega o og:image do perfil /player/<id>/<slug>.
//
// nick → {hltvId, slug} sai dos caches de evento já baixados
// (scripts/.cache/hltv_event_*.html). Jogadores sem id ficam sem foto (iniciais).
//
// Resumível (pula quem já tem arquivo). AVISO: abre janela do Chrome durante a coleta.
// Uso: node scripts/harvest-player-photos.mjs
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchHtml, closeBrowser } from "./hltv-fetch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CACHE = join(__dirname, ".cache");
const PHOTO_DIR = join(ROOT, "public", "players");
mkdirSync(PHOTO_DIR, { recursive: true });

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const safeName = (id) => id.replace(/[^a-z0-9_-]/gi, "_");

// nick(lower) → {id, slug} a partir dos caches de evento
const linkRe = /<a href="\/stats\/players\/(\d+)\/([a-z0-9_-]+)\?event=\d+"[^>]*>([^<]+)<\/a>/g;
const hltv = new Map();
for (const f of readdirSync(CACHE).filter((f) => /^hltv_event_\d+\.html$/.test(f))) {
  const html = readFileSync(join(CACHE, f), "utf8");
  for (const m of html.matchAll(linkRe)) {
    const nick = norm(m[3].trim());
    if (!hltv.has(nick)) hltv.set(nick, { id: m[1], slug: m[2] });
  }
}

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
async function downloadImage(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Referer: "https://www.hltv.org/" } });
  if (!res.ok) throw new Error(`img HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const playersFile = join(ROOT, "public", "data", "players.json");
  const players = JSON.parse(readFileSync(playersFile, "utf8"));
  let ok = 0, skip = 0, fail = 0, noId = 0;

  for (const p of players) {
    const file = `${safeName(p.id)}.png`;
    const dest = join(PHOTO_DIR, file);
    if (existsSync(dest)) { p.photo = `/players/${file}`; skip++; continue; }
    const ref = hltv.get(norm(p.id));
    if (!ref) { noId++; continue; }
    try {
      const html = await fetchHtml(`https://www.hltv.org/player/${ref.id}/${ref.slug}`, "meta[property='og:image']", { timeoutMs: 45000 });
      const og = (html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i) ||
        html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i) || [])[1];
      if (!og || /default|silhouette|placeholder/i.test(og)) { fail++; continue; }
      await downloadImage(og.replace(/&amp;/g, "&"), dest);
      p.photo = `/players/${file}`;
      ok++;
      if (ok % 20 === 0) { writeFileSync(playersFile, JSON.stringify(players, null, 2)); console.log(`  …${ok} baixadas`); }
    } catch (e) { fail++; console.log(`  ✗ ${p.id}: ${e.message}`); }
  }

  await closeBrowser();
  writeFileSync(playersFile, JSON.stringify(players, null, 2));
  console.log(`\n✔ fotos: +${ok} novas, ${skip} já tinham, ${fail} falharam, ${noId} sem id HLTV (iniciais). Total com foto: ${players.filter((p) => p.photo).length}/${players.length}`);
}

main().then(() => process.exit(0));
