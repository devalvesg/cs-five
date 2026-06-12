# CS-FIVE — Jogo "Impostor" — Plano de Implementação

Baseado em `docs/superpowers/specs/2026-06-12-impostor-design.md`. Fases independentes e
verificáveis, na ordem em que reduzem risco (dados primeiro, depois motor, depois UI).
Cada fase tem um portão de verificação antes de seguir.

---

## Fase 0 — Andaime de tipos e schedule (sem dados reais)

**Objetivo:** ter o contrato e a rota do jogo de pé, com 1–2 puzzles fixos de exemplo.

- `lib/impostor/schedule.ts`: tipos `ImpostorOption`/`ImpostorPuzzle` + `getImpostorForPuzzle(n)`
  (mesmo padrão de `lib/top10/schedule.ts`, ciclando a lista).
- `public/data/impostor-schedule.json`: 1–2 puzzles placeholder (à mão) pra destravar a UI.
- `lib/stats/impostor.ts`: `loadGame/saveGame/recordResult/loadStats` (espelha
  `lib/stats/top10.ts`; campos `played/wins/losses/currentStreak/maxStreak`).

**Verificação:** `tsc` limpo; import da schedule funciona.

---

## Fase 1 — Tela do jogo (UI + mecânica), com dados placeholder

**Objetivo:** jogo jogável end-to-end com a mecânica final, antes de ligar os dados reais.

- `app/impostor/page.tsx`:
  - Estado: `selectedId` (único), `verified: {id,correct}[]`, `phase: "playing"|"result"`,
    `revealed`.
  - Fluxo: clicar tile → `selectedId`; **Verificar** → comita; correto trava verde; impostor
    → `phase=result`, derrota, revela. Vitória quando todos os corretos verificados.
  - Layout "formação" (plano 600×580 com coords por contagem 8/9/10, `transform: scale()`),
    tiles 92px, estados idle/selected/win/lose/miss, badges, header W–L, centro com categoria,
    botão Verificar, rodapé de resultado ("Revelar corretos", "Jogar de novo", "Volte amanhã").
  - Render de tile: `kind:"player"` → foto/iniciais + bandeira; `kind:"team"` → logo + nome.
  - Persistência localStorage + restauração do jogo do dia (como Grid/Top 10).
- Estilos: adicionar tokens/classe conforme handoff (`docs/design/impostor-handoff/`),
  reusando Tailwind `cs-*` onde equivalente; conferir fontes Oxanium/Barlow.
- `app/page.tsx`: 3º `GameCard` "Impostor" + mini-preview.
- Mapa de posições por contagem: `lib/impostor/layout.ts` (coords x/y p/ 8, 9, 10 tiles).

**Verificação:** jogar manualmente os placeholders (vitória e derrota); `tsc`; `next build`.
Opcional: skill `verify`/`run` pra rodar o app e conferir visual vs handoff.

---

## Fase 2 — Dados: roster campeão de Major

**Objetivo:** set autoritativo de quem ganhou cada Major.

- `scripts/harvest-major-champions.mjs`: para os 23 Majors (mesma lista de
  `harvest-hltv-majors.mjs`), pega da Liquipedia (harvester compliant existente) o **time
  campeão + roster** de cada Major → `public/data/major-champions.json`
  `[{event, year, teamAbbr, players:[ids]}]`.
- Resolve nicks → ids do `players.json` (reusa o resolver `norm/deleet`); loga não-resolvidos.

**Verificação:** conferir manualmente alguns campeões conhecidos (Astralis 2018, NAVI 2021,
Spirit 2024…); todo Major com 5 jogadores resolvidos.

---

## Fase 3 — Dados: fotos de jogador

**Objetivo:** foto nos tiles de jogador.

- `scripts/harvest-player-photos.mjs`: para os jogadores relevantes (que entram nos puzzles
  + respostas do Top 10), baixa foto da página de perfil do HLTV via `scripts/hltv-fetch.mjs`
  (bypass Cloudflare), fallback infobox Liquipedia. Salva `public/players/<id>.png`, grava
  `photo` no `players.json`. Idempotente, cache.

**Verificação:** % de cobertura logada; spot-check de 10 fotos; fallback iniciais OK p/ quem
faltar; `tsc`/`next build` com `players.json` atualizado.

---

## Fase 4 — Motor de geração de puzzles

**Objetivo:** gerar a schedule real a partir dos dados.

- `lib/impostor/notoriety.ts` (ou dentro do script): notoriedade por jogador/time a partir
  de caches HLTV + `top10-schedule.json` + títulos/MVPs.
- `scripts/build-impostor.mjs` (`npm run build:impostor`):
  - **team:** por org notável → corretos = jogadores com a org em `teamsNotable` (mais
    notórios); impostores = craques da era sem a org.
  - **title:** "ganhou um Major" (global) + "campeão do {Major}" (por evento) usando
    `major-champions.json`.
  - **award:** "já foi MVP de Major" via `player_mvps`.
  - Para cada critério: escolhe total 8–10, N corretos 3–6 (≥2 impostores), monta opções,
    embaralha. Descarta critério com <3 satisfatores notórios.
  - **Ledger** (cada critério uma vez) + merge de `impostor-overrides.json`.
  - Escreve `public/data/impostor-schedule.json`.
- `package.json`: script `build:impostor`.

**Verificação:** auditoria (script ou teste): cada puzzle 8–10/3–6/≥2 impostores, correção
factual (correct satisfaz, impostor falha) contra as fontes; nº de puzzles ≥ ~60.

---

## Fase 5 — Testes & compartilhamento

- `tests/impostor.test.ts`: integridade da schedule, correção factual, lógica de jogo (função
  pura de verificação/estado), determinismo de `getImpostorForPuzzle`.
- Extrair a lógica de verificação pra função pura testável (`lib/impostor/engine.ts`).
- Share card do Impostor (reusa `components/share/*` e `lib/share/*`), referência
  `docs/design/impostor-handoff/CS-FIVE Result Card.html`.

**Verificação:** `vitest` (todos verdes), `tsc`, `next build`.

---

## Fase 6 — Polimento & publicação

- Painel "Como jogar" + "Estatísticas" (padrão Grid/Top 10).
- Revisão visual final vs handoff.
- Commit. (Branch sugerida: `feat/impostor-game`.)

---

## Ordem de dependência

```
Fase 0 → Fase 1 (UI com placeholder)
Fase 2 (campeões) ─┐
Fase 3 (fotos) ────┼→ Fase 4 (motor) → Fase 5 (testes/share) → Fase 6
                   ┘
```

Fases 2 e 3 são paralelizáveis e independentes da UI. A Fase 1 pode rodar com placeholders
enquanto os dados são coletados.

## Riscos & mitigações

- **Roster campeão:** substitutos/stand-ins na Liquipedia → validar; `impostor-overrides`
  cobre exceções.
- **Fotos faltando:** fallback iniciais (não bloqueia).
- **Notoriedade fraca:** ajustar pesos / curar os primeiros temas via overrides.
- **Layout responsivo da "formação":** testar 8/9/10 em telas pequenas (scale).
