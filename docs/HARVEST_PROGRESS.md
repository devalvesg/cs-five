# Harvest da Liquipedia — Progresso

> Estado do crawl de jogadores via MediaWiki API gratuita da Liquipedia.
> **Última atualização: 2026-06-10 — CONCLUÍDO. Dataset 100% Liquipedia.**

## Estado final

- **808 jogadores**, 0 duplicados, todos com time + país. **Nenhum dado de memória** — tudo verificado
  contra a Liquipedia.
- **24.462 grids** em `grid-schedule.json` (~68 anos sem repetir). tsc + 10 testes + `next build` OK.

## Pipeline (ordem de execução, idempotente, usa cache)

```bash
node scripts/harvest-liquipedia.mjs                    # 1. crawl das 30 categorias → ~836
node scripts/harvest-liquipedia.mjs --verify-curated   # 2. re-deriva teamsNotable dos curados da FONTE
node scripts/harvest-liquipedia.mjs --repair           # 3. resolve homônimos/desambiguação dos curados
npm run build:schedule                                 # 4. regenera os grids com o dataset final
```

Etapas 2-3 corrigiram invenções da curadoria de memória (device→Falcons, m0NESY→NAVI, MICHU→MOUZ…) e
erros de nome/país (k1to, acoR, HooXi…). Detalhe técnico em `memory/cs-5-data-pipeline.md`.

⚠️ **Não rode `npm run build:curated`** por cima do dataset final — ele regenera só os 195 seeds e apaga
a colheita+verificação. O seed fica em `players.curated-backup.json`.

---

## Onde paramos

- `public/data/players.json`: **319 jogadores** (195 curados + 124 colhidos), JSON válido, sem duplicados.
- Backup do roster curado original (195): `public/data/players.curated-backup.json`.
- Cache: ~575 wikitexts em `scripts/.cache/*.wikitext` → a retomada **pula** esses downloads.
- Schedule atual (`public/data/grid-schedule.json`): ainda a de **264 grids / 195 jogadores**.
  O app funciona normal (grids válidos, busca já com 319). O rebuild da schedule fica para o fim.

## Por que fazemos assim (contexto)

- A **LPDB API é paga**; a **MediaWiki API é gratuita**. O bloqueio anterior era violação de TOS,
  não paywall.
- Correções que destravaram (em `scripts/harvest-liquipedia.mjs`):
  1. **User-Agent** identifica projeto + contato.
  2. `action=query&prop=revisions` (limite **1 req/2s**) em vez de `action=parse` (1 req/30s).
  3. gzip + keep-alive são padrão do undici (não setar `Accept-Encoding` na mão).
  4. Enumeração via `list=categorymembers` (até 500 títulos/request).
- **Filtro de notabilidade**: só entra quem tem ≥1 org do pool (`ORG_MAP`). Isso descarta
  academies/semi-pros e resolve **homônimos** (ex.: há um acoR dinamarquês ≠ o acoR francês da Vitality).

## Progresso por categoria (ordem do crawl)

| # | Categoria | Status | Net-new notáveis |
|---|-----------|--------|------------------|
| 1 | Danish Players | ✅ completa | +37 |
| 2 | Swedish Players | 🟡 parcial (interrompida) | ~+87 até a parada |
| 3 | French Players | ⬜ pendente | — |
| 4 | Brazilian Players | ⬜ pendente | — |
| 5 | Russian Players | ⬜ pendente | — |
| 6 | Ukrainian Players | ⬜ pendente | — |
| 7 | Finnish Players | ⬜ pendente | — |
| 8 | Polish Players | ⬜ pendente | — |
| 9 | American Players | ⬜ pendente | — |
| 10 | Canadian Players | ⬜ pendente | — |
| 11 | Australian Players | ⬜ pendente | — |
| 12 | German Players | ⬜ pendente | — |
| 13 | Turkish Players | ⬜ pendente | — |
| 14 | Norwegian Players | ⬜ pendente | — |
| 15 | Slovak Players | ⬜ pendente | — |
| 16 | Estonian Players | ⬜ pendente | — |
| 17 | Israeli Players | ⬜ pendente | — |
| 18 | Latvian Players | ⬜ pendente | — |
| 19 | British Players | ⬜ pendente | — |
| 20 | Bosnian Players | ⬜ pendente | — |
| 21 | Serbian Players | ⬜ pendente | — |
| 22 | Lithuanian Players | ⬜ pendente | — |
| 23 | Belgian Players | ⬜ pendente | — |
| 24 | Dutch Players | ⬜ pendente | — |
| 25 | Czech Players | ⬜ pendente | — |
| 26 | Spanish Players | ⬜ pendente | — |
| 27 | Bulgarian Players | ⬜ pendente | — |
| 28 | Mongolian Players | ⬜ pendente | — |
| 29 | Kazakh Players | ⬜ pendente | — |
| 30 | Chinese Players | ⬜ pendente | — |

> Os demônimos pendentes são palpites — se uma categoria não existir, o script loga e segue.
> Conferir/ajustar nomes ao retomar (ex.: "Kazakh" vs "Kazakhstani", "British" vs "United Kingdom").

## O que falta para concluir

1. **Retomar o crawl** (`node scripts/harvest-liquipedia.mjs`) — ~2,5 h restantes no ritmo de 2,2s/jogador.
   - As nações grandes restantes (FR, BR, RU, US) concentram a maior parte dos net-new.
   - A cauda (CZ, ES, BG, MN, KZ, CN…) rende pouco; opcional pular se quiser cortar tempo.
2. **Rebuild da schedule** (`npm run build:schedule`) — regenera os grids com o dataset final
   (esperado: bem mais que os 264 atuais → janela de não-repetição maior).
3. **Validar**: `npx tsc --noEmit`, `npx vitest run`, `npx next build`.
4. **Conferir nomes de times novos**: orgs que entrarem fora do `TEAM_NAMES` aparecem com o abbr cru —
   adicionar nome de exibição em `scripts/harvest-liquipedia.mjs` (e/ou `build-curated.mjs`) se necessário.
5. (Opcional) Revisar `lib/data/players.ts` → mapa `COUNTRIES` para cobrir países novos que surgirem
   no harvest (senão a bandeira/label cai no fallback).

## Arquivos relevantes

- `scripts/harvest-liquipedia.mjs` — o harvester (modo `--dry` de teste e modo completo).
- `scripts/build-curated.mjs` — roster curado à mão (seed de 195; **não rodar por cima do harvest**).
- `scripts/build-schedule.mjs` — pré-assa os grids em `grid-schedule.json`.
- `public/data/players.json` / `teams.json` — dataset servido ao app.
- `public/data/players.curated-backup.json` — backup dos 195 curados.
