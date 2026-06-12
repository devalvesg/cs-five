# CS-FIVE — Jogo "Impostor" — Design

**Data:** 2026-06-12
**Status:** aprovado (brainstorming) → próximo: plano de implementação (writing-plans)

## 1. Visão geral

Terceiro jogo diário do CS-FIVE (depois de **Grid** e **Top 10**), inspirado no
"impostor" do futbol11. Cada dia mostra uma **categoria/critério** (ex.: "Já levantou
um troféu de Major") e **8–10 entidades** (jogadores ou times). Algumas satisfazem o
critério (**corretas**), o resto são **impostores** de alto perfil, escolhidos pra
confundir (ex.: NiKo — craque que nunca venceu Major). O usuário desmascara os corretos
um a um; verificar um impostor encerra o jogo.

Segue o padrão dos jogos existentes: puzzle determinístico por data UTC, schedule
pré-assada offline, stats no localStorage, sem contas.

## 2. Mecânica (final)

- Mostra a **categoria** no centro e os tiles ao redor (layout "formação", ver §7).
- **Seleção de 1 por vez:** clicar num tile o seleciona; selecionar outro troca a seleção
  (só um selecionado por vez).
- Botão **"Verificar"** comita o tile selecionado:
  - **Correto** → tile fica **verde**, trava (sai do pool), contador `X/N` avança.
  - **Impostor** → tile fica **vermelho**, **fim de jogo (derrota)** e revela todos
    (verde = corretos restantes, X = impostores). É a "morte súbita": acontece ao
    *verificar* um impostor, não a cada clique solto.
- **Vitória** = todos os N corretos verificados sem nunca verificar um impostor.
- Botão "Verificar" fica desabilitado sem seleção e durante o estado de resultado.

### Parâmetros por puzzle
- **Total de tiles:** variável **8–10** (o gerador decide por tema).
- **Corretos (N):** `3 ≤ N ≤ 6`, sempre com **≥2 impostores** (`total − N ≥ 2`).
- Tiles embaralhados; posições atribuídas a partir de um layout de formação por contagem
  (ver §7).

### Estados de tile
`idle` · `selected` · `win-correct` (verde, resultado) · `lose-impostor` (vermelho,
resultado) · `miss` (correto não-achado, revelado no fim). Badges: ✓ (correto), ✕
(impostor/miss).

### Stats (localStorage)
`played`, `wins`, `losses`, `currentStreak`, `maxStreak`. Header mostra placar **W–L**.
Chaves no padrão do projeto (ex.: `csfive_imp_*`). Tela de resultado: pílula
vitória/derrota, resumo, "Revelar jogadores corretos" (só quando perdeu e ainda não
revelou), "Volte amanhã", compartilhar (reusa share card).

## 3. Modelo de dados & schedule

```ts
// lib/impostor/schedule.ts
type ImpostorOption = {
  kind: "player" | "team";
  id: string;          // nick (players.json) ou abbr (teams.json)
  correct: boolean;    // satisfaz o critério?
};
type ImpostorPuzzle = {
  id: string;          // chave única do critério (ledger de não-repetição)
  title: string;       // "Já levantou um troféu de Major"
  family: "title" | "award" | "team";
  entityKind: "player" | "team";
  options: ImpostorOption[]; // 8–10, embaralhadas, 3–6 corretas
};

export function getImpostorForPuzzle(n: number): ImpostorPuzzle | null;
```

- `public/data/impostor-schedule.json` = `ImpostorPuzzle[]`, pré-assada offline.
- App usa o `usePuzzleNumber` / virada à meia-noite UTC já existentes. Janela de
  não-repetição = nº de puzzles (cresce com os dados).
- Render usa `getPlayer(id)` (foto/bandeira) e `teamLogo/teamName(abbr)` — fallback a
  iniciais se faltar foto.

## 4. Famílias de tema & fontes (v1)

| Família | Critério (exemplos) | Corretos (fonte) | Status do dado |
|---|---|---|---|
| **team** | "Já jogou pela NAVI" | `teamsNotable` contém a org | ✅ `players.json` |
| **title** | "Já ganhou um Major" / "Campeão do {Major}" | roster campeão de cada Major | ⚠️ coletar (Liquipedia) |
| **award** | "Já foi MVP de Major" | tabela `player_mvps` | ✅ `top10-stats.json` |

- **Volume v1 estimado:** ~40 (team) + ~24 (title: 1 global + por Major) + MVP ≈ **~65
  puzzles** (~2 meses). Escala depois com "campeão do {evento tier-1}" (69 eventos já em
  cache) e HLTV Top 20 do ano (v2).
- Coleta nova de v1: **roster campeão por Major** (reusa o harvester compliant da
  Liquipedia).

## 5. Seleção de impostores (a "pegadinha")

Sempre craques que chegam perto (decisão do usuário). Motor offline:

1. **Notoriedade por jogador** (derivada de dados já existentes):
   ```
   notoriedade(p) = 3×(nº de Majors em que apareceu no leaderboard HLTV cacheado)
                  + 1×(nº de aparições como resposta no Top 10)
                  + 2×(nº de títulos/MVPs)
   ```
2. **Corretos** = os satisfatores **mais notórios** (não obscuros — como precisam ser
   achados pra vencer, um correto obscuro tornaria o jogo impossível). Se o critério tiver
   <3 satisfatores notórios → descartado.
3. **Impostores** = os **mais notórios que falham** o critério, com heurística de
   proximidade:
   - *team:* preferir craques da **mesma era** (poderiam ter passado pela org).
   - *title (Major):* preferir quem **jogou muitos Majors mas nunca venceu**.
   - *award (MVP):* craques que nunca foram MVP.
4. **Override de curadoria** opcional (`impostor-overrides.json`) por cima.

Para `team`, as opções podem ser `kind:"team"` em vez de jogador (ex.: "Orgs que já
venceram um Major") — mesma lógica, notoriedade de time = nº de títulos/finais.

## 6. Coleta de fotos de jogador (novo)

`players.json` hoje tem **0 fotos** (todos os 848). O design exige foto no tile de
jogador.

- `scripts/harvest-player-photos.mjs`: para os jogadores que entram em puzzles do Impostor
  (e respostas do Top 10 — reuso), baixa a foto da **página de perfil do HLTV**
  (`/stats/players/<id>/<slug>` ou `/player/<id>/<slug>`) via o bypass de Cloudflare já
  existente (`scripts/hltv-fetch.mjs`), com fallback à imagem do infobox da Liquipedia.
- Salva em `public/players/<id>.png` e grava `photo: "/players/<id>.png"` no `players.json`.
- Fallback a iniciais quando faltar (degrada como já acontece hoje, sem quebrar).

## 7. Visual / UI (conforme handoff)

Referência commitada em `docs/design/impostor-handoff/` (HTML+JSX do handoff do Claude
design). Implementação adapta o handoff à mecânica de §2 (o protótipo usava multi-seleção;
a versão final é seleção única + verificar com morte súbita).

- **Paleta:** `--bg #080b10`, `--gold #e0a93c` / `--gold-bright #f2bd52`, `--green #4fae54`,
  `--red #cf5340`, `--cyan #2fbdee`, `--muted #8593a6`. Alinhar aos tokens Tailwind
  existentes (`cs-*`) onde equivalentes.
- **Fontes:** Oxanium (display) + Barlow (texto).
- **Header:** placar W–L à esquerda, marca CS-FIVE ao centro, ícones à direita (60px,
  sticky).
- **"Formação":** plano `600×580` com tiles em coords x/y, `transform: scale()` pra caber
  na largura (≤600). Layouts de posição por contagem (8/9/10).
- **Tile:** frame `92×92` arredondado (raio 16), borda ciano, avatar (foto jogador OU logo
  time) + pílula de nome (Oxanium) abaixo. Hover (idle): borda dourada + leve subida.
  `selected`/`win-correct`: verde; `lose-impostor`: vermelho; `miss`: esmaecido. Badge
  círculo no canto.
- **Centro:** "A categoria é:" + caixa do critério (borda ciano). No resultado: pílula
  vitória/derrota + resumo.
- **Botão "Verificar":** dourado, sombra inferior. Rodapé de resultado com ações.
- **Responsivo:** breakpoint 480px (já no handoff).

## 8. Pipeline & scripts

- `scripts/harvest-major-champions.mjs` — Liquipedia → time campeão + roster de cada Major
  → `public/data/major-champions.json`.
- `scripts/harvest-player-photos.mjs` — fotos (HLTV/Liquipedia) → `public/players/*` +
  `players.json.photo`.
- `scripts/build-impostor.mjs` (`npm run build:impostor`) — lê `players.json`,
  `teams.json`, `major-champions.json`, `player_mvps`, calcula notoriedade (caches HLTV +
  `top10-schedule.json`), gera puzzles por família com **ledger** (cada critério uma vez),
  aplica `impostor-overrides.json`, escreve `impostor-schedule.json`.
- **App:** `lib/impostor/{schedule,types}.ts`, `app/impostor/page.tsx`,
  `lib/stats/impostor.ts`, componente de share, 3º `GameCard` na home.

## 9. Não-repetição

Ledger na geração garante cada critério (família+parâmetro) **uma única vez** na schedule.
O cliente lê `schedule[N]` (N = dias desde o lançamento). Cresce ao reassar com mais dados.

## 10. Testes

- **Integridade:** todo puzzle com 8–10 opções, 3–6 corretas, ≥2 impostores, sem id
  repetido no puzzle, sem critério duplicado na schedule.
- **Correção factual:** todo `correct:true` satisfaz o critério na fonte; todo
  `correct:false` falha (trava contra dado ruim).
- **Lógica de jogo (função pura):** verificar impostor → derrota; verificar todos os
  corretos → vitória; seleção única; determinismo de `getImpostorForPuzzle`.
- **Portões:** `tsc`, `vitest`, `next build`.

## 11. Escopo v1 e futuro

- **v1:** famílias team + title (Major) + award (MVP); coleta de roster campeão + fotos;
  tela do Impostor conforme handoff; ~65 puzzles.
- **Futuro:** "campeão do {evento tier-1}" (69 eventos cacheados), HLTV Top 20 do ano,
  nacionalidade (descartada no v1), curva de dificuldade por dia, share card dedicado.

## 12. Itens em aberto / riscos

- Roster campeão exato por Major (5 titulares; cuidado com substitutos/stand-ins) — validar
  na fonte.
- Cobertura de fotos: alguns jogadores antigos podem não ter foto boa → fallback iniciais.
- Notoriedade é heurística; pode precisar de ajuste/curadoria nos primeiros temas.
