// Renderiza páginas do HLTV furando o Cloudflare (challenge "Just a moment"/Turnstile).
//
// COMO funciona (descoberto em 2026-06-12, espelhado do tictachoopers):
//   O challenge gerenciado do HLTV detecta Chrome headless e NUNCA emite o
//   cf_clearance → headless fica preso em "Um momento…". A solução é Chrome
//   HEADED (com janela) num display X real (DISPLAY=:0) dirigido via DevTools
//   Protocol (CDP) — sem instalar Puppeteer. Usamos um user-data-dir
//   PERSISTENTE: o cf_clearance fica salvo, então só o 1º load resolve o
//   desafio; os seguintes vêm diretos.
//
// AVISO: abre uma janela do Chrome no display do usuário durante a coleta.
//
// Uso (programático):
//   import { fetchHtml, closeBrowser } from "./hltv-fetch.mjs";
//   const html = await fetchHtml(url, ".stats-table");  // espera o seletor
//   await closeBrowser();
import { spawn } from "node:child_process";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const PORT = +(process.env.CS5_CDP_PORT || 9344);
const DISPLAY = process.env.CS5_DISPLAY || ":0";
const PROFILE = process.env.CS5_CHROME_PROFILE || "/tmp/cf-chrome-profile";
const CHROME = process.env.CHROME_BIN || "google-chrome";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let proc = null;
let ws = null;
let nextId = 0;
const pending = new Map();

async function ensureBrowser() {
  if (ws && ws.readyState === 1) return;
  proc = spawn(CHROME, [
    "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    `--remote-debugging-port=${PORT}`, `--user-agent=${UA}`,
    `--user-data-dir=${PROFILE}`, "--window-size=1400,1000", "--lang=en-US",
    "about:blank",
  ], { stdio: "ignore", env: { ...process.env, DISPLAY } });

  let list;
  for (let i = 0; i < 80; i++) {
    try { list = await (await fetch(`http://localhost:${PORT}/json`)).json(); if (list.length) break; } catch { /* aguardando */ }
    await sleep(300);
  }
  const page = list.find((t) => t.type === "page") || list[0];
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  await send("Runtime.enable");
  await send("Page.enable");
}

function send(method, params = {}) {
  return new Promise((res) => { const id = ++nextId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true });
  return r.result?.result?.value;
}

/** Navega e devolve o outerHTML quando `marker` (seletor CSS) aparece e o título não é mais o do challenge. */
export async function fetchHtml(url, marker = "body", { timeoutMs = 45000 } = {}) {
  await ensureBrowser();
  await send("Page.navigate", { url });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await sleep(1000);
    const v = JSON.parse((await evaluate(
      `JSON.stringify({t:document.title||'',m:!!document.querySelector(${JSON.stringify(marker)})})`
    )) || "{}");
    if (v.m && !/moment|momento|attention|just a/i.test(v.t)) {
      return await evaluate("document.documentElement.outerHTML");
    }
  }
  return (await evaluate("document.documentElement.outerHTML")) || "";
}

/** Avalia uma expressão (que pode retornar Promise) NO contexto da página atual.
 * Útil p/ baixar imagens via fetch do próprio site (passa o Cloudflare/CDN que
 * bloqueia fetch externo). Retorna o valor resolvido por valor. */
export async function evalInPage(expression) {
  await ensureBrowser();
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return r.result?.result?.value;
}

export async function closeBrowser() {
  try { ws?.close(); } catch { /* noop */ }
  try { proc?.kill(); } catch { /* noop */ }
  ws = null; proc = null;
}

// CLI: node scripts/hltv-fetch.mjs <url> [marker]  → imprime o HTML
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const marker = process.argv[3] || "body";
  const html = await fetchHtml(url, marker);
  process.stdout.write(html);
  await closeBrowser();
  process.exit(0);
}
