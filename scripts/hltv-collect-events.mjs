// Coleta IDs de eventos tier-1 (INTLLAN) do arquivo do HLTV, paginando por offset.
// Saída: scripts/.cache/hltv-events-index.json  [{id, slug, name}]
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { fetchHtml, closeBrowser } from "./hltv-fetch.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE = join(__dirname, ".cache");
mkdirSync(CACHE, { recursive: true });

const TYPES = (process.env.CS5_EVENT_TYPES || "INTLLAN").split(",");
const PAGES = +(process.env.CS5_PAGES || 9); // ~50 eventos/página
const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, " ").replace(/\s+/g, " ").trim();

async function main() {
  const found = new Map();
  for (const type of TYPES) {
    for (let p = 0; p < PAGES; p++) {
      const offset = p * 50;
      const url = `https://www.hltv.org/events/archive?eventType=${type}&offset=${offset}`;
      const cacheFile = join(CACHE, `hltv_archive_${type}_${offset}.html`);
      let html;
      if (existsSync(cacheFile)) html = readFileSync(cacheFile, "utf8");
      else { html = await fetchHtml(url, "a[href*='/events/']", { timeoutMs: 45000 }); writeFileSync(cacheFile, html); }
      const evs = [...html.matchAll(/href="\/events\/(\d+)\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/gi)];
      let added = 0;
      for (const m of evs) {
        const id = m[1], slug = m[2], name = strip(m[3]) || slug;
        if (!found.has(id)) { found.set(id, { id: +id, slug, name }); added++; }
      }
      console.log(`  ${type} offset ${offset}: +${added} (total ${found.size})`);
    }
  }
  await closeBrowser();
  const list = [...found.values()];
  writeFileSync(join(CACHE, "hltv-events-index.json"), JSON.stringify(list, null, 2));
  console.log(`\n✔ ${list.length} eventos → scripts/.cache/hltv-events-index.json`);
}
main().then(() => process.exit(0));
