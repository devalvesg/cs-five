# cs-5 — Plano de Desenvolvimento

> Jogos diários (Daily Games) sobre Counter-Strike (CS:GO + CS2), inspirados em
> [basketball-5.com](https://basketball-5.com/) e [futbol11.com](https://futbol11.com/).
> Fonte de dados: [Liquipedia / Counter-Strike](https://liquipedia.net/counterstrike/Main_Page).

---

## 1. Contexto

Você já construiu o **tictachoopers** (`~/Projetos/tictachoopers`): um "tiki-taka-toe" de NBA,
multiplayer em tempo real, em Next.js 15 + React 19 + Tailwind + Supabase, com um pipeline de
dados que faz scraping do Basketball-Reference e enriquecimento via Wikidata/SPARQL.

O **cs-5** é um produto **novo e separado**, com proposta diferente: em vez de multiplayer versus,
é um site de **jogos diários single-player** — todo dia, à meia-noite, surge um novo desafio; o
usuário tenta resolver e mantém uma sequência (streak). É o modelo "Wordle-like" dos sites de
referência. O tema é Counter-Strike (jogadores, times, países, conquistas em Majors etc.).

No MVP teremos **2 jogos**:
1. **Grid** — um bingo 3×3 estilo "Immaculate Grid": cada célula é o cruzamento de dois critérios
   (ex.: jogou pela *FaZe* × é da *Dinamarca*); o objetivo é **preencher todas as 9 células** com
   jogadores válidos. (Variação do seu jogo da velha, mas aqui o foco é completar o tabuleiro, não vencer um oponente.)
2. **Top 10** — uma lista temática ranqueada (ex.: "Top 10 maiores premiações da carreira",
   "Top 10 com mais participações em Major") onde o usuário precisa **adivinhar as 10 entradas**.

### Decisões já tomadas (confirmadas com o usuário)

| Tema | Decisão |
|------|---------|
| **Modo** | Single-player diário; stats e streak em `localStorage`; **sem contas** no MVP. |
| **Geração de puzzles** | **Automática** para os dois jogos (algoritmo a partir do dataset). |
| **Reset diário** | **Meia-noite UTC** (00:00 UTC). |
| **Dados** | **Pipeline offline + cache**: Liquipedia (histórico de times/premiação) + **HLTV** (ranking Top 20 do ano, MVPs/EVPs e stats de evento — kills, rating 2.0, clutches) consumidos em *build-time*, geram dataset estático versionado; o app **nunca** chama essas fontes em runtime. |
| **Não-repetição** | Puzzles vivem num **cronograma pré-assado** (`public/data/schedule.json`) gerado offline com um *ledger* que impede repetição por **2+ anos**. Ver `docs/100-dias-preview.md`. |

> ⚠️ **Nota sobre "Top 10 automático":** gerar listas temáticas 100% por algoritmo só é confiável
> se cada tema for derivado de uma **métrica quantitativa** presente no dataset (premiação, nº de
> Majors, idade, etc.). Listas subjetivas como "Top 10 players de 2015" são, na origem, rankings
> editoriais (ex.: HLTV Top 20). O plano resolve isso com um **motor de temas baseado em métricas**
> (seção 7): cada tema = (métrica + filtro + ordenação). Temas subjetivos podem entrar depois como
> dados importados de um ranking oficial, sem mudar a arquitetura.

---

## 2. Stack e estrutura

Reaproveitamos a stack validada do tictachoopers (familiaridade + código adaptável):

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict).
- **Tailwind CSS 3** com paleta temática de CS (tons escuros, laranja/azul de CS2).
- **Vitest** para testes de lógica pura.
- **Sem Supabase no MVP** (single-player + localStorage). Deixamos a porta aberta para adicioná-lo
  depois (contas/ranking global) reaproveitando os padrões de `lib/supabase/` do tictachoopers.
- **`tsx`** para os scripts de ETL do dataset.

### Estrutura de pastas proposta

```
cs-5/
├── app/
│   ├── layout.tsx                 # layout raiz, metadata, dark theme
│   ├── page.tsx                   # home: cards dos 2 jogos (hub)
│   ├── grid/page.tsx              # jogo Grid (rota própria — bom p/ SEO)
│   ├── top10/page.tsx             # jogo Top 10
│   └── globals.css
├── components/
│   ├── common/                    # Modais (HowToPlay, Stats, Settings), ShareButton, Header
│   ├── grid/                      # GridBoard, GridCell, AxisHeader, PlayerSearchModal
│   └── top10/                     # Top10List, GuessInput, RankRow
├── lib/
│   ├── data/                      # carregamento + busca no dataset (players, teams)
│   ├── daily/                     # seleção determinística do puzzle do dia (seed por data UTC)
│   ├── grid/                      # gerador de grid + validação de critérios
│   ├── top10/                     # motor de temas + ranking
│   ├── stats/                     # localStorage: streak, win%, histórico
│   └── share/                     # geração do texto/emoji de compartilhamento
├── public/data/                   # DATASET ESTÁTICO VERSIONADO (gerado pelo pipeline)
│   ├── players.json
│   ├── teams.json
│   ├── countries.json
│   └── meta.json                  # data de geração, contagens, hash p/ cache-busting
├── scripts/                       # pipeline Liquipedia (ETL)
│   ├── fetch-liquipedia.ts        # baixa páginas brutas (com rate-limit + cache em disco)
│   ├── build-players.ts           # parse de infoboxes → histórico de times, país, role
│   ├── build-earnings.ts          # premiação por jogador / por ano
│   ├── build-achievements.ts      # Majors, MVPs/EVPs, títulos
│   └── build-dataset.ts           # orquestra tudo → public/data/*.json
├── tests/                         # vitest: grid-generator, validation, daily-seed, top10-engine
└── docs/
    ├── PLANO-DESENVOLVIMENTO.md    # este arquivo
    ├── data-pipeline.md           # detalhes do ETL + ToU da Liquipedia
    └── game-rules.md              # regras finais de cada jogo
```

> **Reaproveitamento direto do tictachoopers** (adaptar, não copiar cego):
> - `lib/game/types.ts` → `playerMatches(player, criterion)` e a união `Criterion` (team/award/nation) — vira a base da validação do Grid.
> - `lib/game/grid-generator.ts` → amostragem com peso + penalidade de recência + cascata de fallback p/ garantir solvabilidade.
> - `lib/game/win-detection.ts` → `isBoardFull()` (no daily não há "3 em linha"; a vitória é tabuleiro cheio).
> - `lib/data/players.ts` → `searchPlayers()` com normalização NFD/diacríticos (busca client-side).
> - `components/PlayerSearchModal.tsx`, `Cell.tsx`, `Board.tsx` → UI do Grid.
> - Padrão de scripts ETL em `scripts/` + `tsx`.

---

## 3. Pipeline de dados (Liquipedia)

Detalhes completos em `docs/data-pipeline.md`. Resumo:

### Regras de uso da Liquipedia (obrigatório respeitar)
A Liquipedia roda em MediaWiki e tem [Termos de uso de API](https://liquipedia.net/api-terms-of-use) estritos:
- **User-Agent descritivo** com contato (ex.: `cs-5-dataset-builder/1.0 (email)`).
- **Rate limit:** ~1 req / 2s para `action=parse`; 1 req / 30s para outras ações. O script
  serializa as chamadas com `sleep` entre elas.
- **Cache obrigatório** (mín. 24h): salvamos as respostas brutas em `scripts/.cache/` para não
  re-baixar a cada execução.
- **Atribuição CC-BY-SA**: exibir crédito "Data from Liquipedia" + link no rodapé do site.

> Se viável, **solicitar acesso à LPDB** (`api.liquipedia.net`, banco estruturado oficial) — elimina
> o parse de wikitext. Enquanto não houver, fazemos parse das páginas via `action=parse`.

### Etapas do ETL
1. **`fetch-liquipedia.ts`** — coleta páginas-fonte e guarda em cache:
   - `Category:Players` (lista de jogadores notáveis) → conjunto de páginas de jogador.
   - Páginas de jogador (infobox: nick, nome real, país, role, **histórico de times** com datas).
   - Páginas de prêmios/premiação (earnings totais e por ano).
   - Páginas de Majors e de awards (MVP/EVP, vencedores).
2. **`build-players.ts`** — parse dos infoboxes → registro por jogador (histórico de times, país, role).
3. **`build-earnings.ts`** — premiação total e por ano.
4. **`build-achievements.ts`** — Majors vencidos, participações, MVPs/EVPs, títulos.
5. **`build-dataset.ts`** — junta tudo, normaliza nomes de orgs (ex.: SK→MIBR, variações de FaZe),
   filtra ruído, e grava `public/data/*.json` + `meta.json` (com timestamp e hash).

O dataset é **versionado no git** e regenerado periodicamente (rodar o script manualmente ou via
GitHub Action mensal). O app só lê os JSONs — nunca a rede.

### Formato do dataset (shape)
```ts
// players.json
type CsPlayer = {
  id: string;            // slug estável (ex.: "s1mple")
  nick: string;          // "s1mple"
  realName?: string;     // "Oleksandr Kostyliev"
  country: string;       // ISO-2 "UA"
  role?: 'awper' | 'rifler' | 'igl' | 'support' | 'entry';
  teams: Array<{ org: string; from?: string; to?: string }>; // histórico
  teamOrgs: string[];    // orgs distintas (índice rápido p/ validação do Grid)
  earningsTotal?: number;
  earningsByYear?: Record<string, number>;
  majorsWon?: string[];  // ids de torneios Major vencidos
  majorAppearances?: number;
  awards?: { majorMvp?: number; evp?: number; hltvTop20?: Array<{ year: number; rank: number }> };
  active?: boolean;
  birthYear?: number;
  photoUrl?: string;
};

// teams.json — { org, abbr, name, country, logoUrl }
// countries.json — { code, label, flag, count }
```

---

## 4. Determinismo diário (o "Daily")

Núcleo do conceito: **todo mundo, no mesmo dia, joga exatamente o mesmo puzzle**, e ele troca à
meia-noite UTC.

- `lib/daily/index.ts`:
  - `getDailyKey(date = new Date())` → string `YYYY-MM-DD` em **UTC** (00:00 UTC vira o novo dia).
  - `getDailySeed(gameId, dateKey)` → número determinístico (hash da string `gameId:dateKey`),
    usado como semente de um PRNG (ex.: mulberry32) que substitui `Math.random()` na geração.
- **Cronograma pré-assado (garante não-repetição):** a geração roda **offline no build** e grava
  `public/data/schedule.json` com uma janela longa (ex.: 800 dias ≈ 2,2 anos). Um *ledger* durante a
  geração impede que qualquer Top 10 ou Grid se repita. O cliente só lê `schedule[N]`. Detalhes em
  `docs/100-dias-preview.md`. (A semente determinística por data continua existindo internamente,
  mas o ledger é o que garante unicidade — RNG puro não garantiria.)
- **Número do puzzle**: `#N` = dias desde uma data de lançamento fixa (ex.: dias desde 2026-07-01).
- **Arquivo (archive):** como o cronograma é fixo, qualquer dia passado é recriado lendo
  `schedule[k]` — páginas `/grid/[date]` e `/top10/[date]` permitem rejogar dias anteriores.
- **Curadoria opcional:** por ser um arquivo, qualquer dia do `schedule.json` pode ser revisado/
  editado à mão antes de publicar.

---

## 5. Jogo 1 — Grid (Immaculate Grid de CS)

### Mecânica
- Tabuleiro **3×3**. 3 critérios nas linhas + 3 nas colunas (6 ao todo).
- Cada **critério** é um `Criterion` (reaproveitado do tictachoopers, estendido p/ CS):
  - `{ kind: 'team', org }` — passou pela organização.
  - `{ kind: 'country', code }` — nacionalidade.
  - `{ kind: 'role', role }` — função (AWPer, IGL...).
  - `{ kind: 'award', key }` — venceu Major / foi MVP de Major / esteve no HLTV Top 20.
  - `{ kind: 'era', year }` — esteve ativo no ano X.
- O usuário **clica numa célula**, busca um jogador (autocomplete client-side) e confirma.
- **Validação:** `playerMatches(player, rowCriterion) && playerMatches(player, colCriterion)`.
- **9 tentativas** (uma por célula); acerto pinta verde, erro consome a tentativa e deixa vazio.
- Um jogador **não pode ser reusado** em outra célula (força conhecimento amplo).
- **Vitória:** todas as 9 células preenchidas (não há oponente, não há "3 em linha").

### Geração automática (determinística por dia)
Adaptar `grid-generator.ts`:
- Seleção dos 6 critérios via amostragem com peso + penalidade de recência (evita repetir orgs).
- **Garantia de solvabilidade:** toda interseção (linha×coluna) precisa ter ≥ N jogadores válidos
  no dataset (ex.: N=2), senão re-sorteia. Cascata de fallback como no tictachoopers (relaxar para
  só-times, depois N=1).
- A semente vem de `getDailySeed('grid', dateKey)` → mesmo grid para todos no dia.

### Scoring por raridade (golf: menor = melhor)
Como replicar o "Rarity Score" sem backend de estatística global no MVP:
- **MVP:** raridade **estimada localmente** = quão "óbvio" foi o jogador, com base na contagem de
  jogadores elegíveis daquela célula no dataset (resposta com poucos elegíveis → mais "rara" →
  pontuação menor). Célula vazia = +100.
- **Pós-MVP (com Supabase):** raridade real = % de usuários que escolheram o mesmo jogador (igual
  aos sites de referência).

### Compartilhamento
```
cs-5 Grid #123
🟩🟩🟩
🟩⬛🟩
🟩🟩🟩
8/9 · raridade 312
csfive.gg
```

---

## 6. Jogo 2 — Top 10

### Mecânica
- Um **tema** + uma **lista ranqueada de 10 jogadores** (posições 1–10, escondidas).
- O usuário digita nomes (autocomplete). Se o palpite está na lista, **revela a posição** (#1..#10).
- **Vidas/erros:** MVP usa um limite generoso de palpites errados (ex.: **5 vidas**) — configurável.
  Variante "modo livre" sem penalidade pode vir como toggle.
- **Vitória:** revelar as 10 entradas antes de acabar as vidas.
- Pontuação simples: nº de acertos (e/ou palpites usados). Streak conta dia resolvido.

### Motor de temas automático (determinístico por dia)
`lib/top10/engine.ts`: um tema = **(métrica + filtro + ordenação + label)**. O motor pega o
`getDailySeed('top10', dateKey)`, escolhe um template e materializa a lista a partir do dataset.

Templates viáveis **direto do dataset Liquipedia** (todos quantitativos → seguros p/ automação):
- "Top 10 maiores premiações da carreira" (`earningsTotal`).
- "Top 10 maiores premiações em {ano}" (`earningsByYear[ano]`).
- "Top 10 com mais participações em Major" (`majorAppearances`).
- "Top 10 com mais Majors vencidos" (`majorsWon.length`).
- "Top 10 maiores premiações da {país}" (`earningsTotal` filtrado por `country`).
- "Top 10 jogadores mais velhos/novos ativos" (`birthYear`).
- (Pós-import HLTV) "Top 10 do ranking HLTV de {ano}" — entra como dado, sem mudar o motor.

> Cada template declara um **mínimo de candidatos** (≥10 com a métrica preenchida) e o motor pula
> templates inviáveis para a data — garante que todo dia tem um Top 10 resolvível.

### Compartilhamento
```
cs-5 Top 10 #123 — Maiores premiações da carreira
🟩🟩🟩🟥🟩🟩🟥🟩🟩🟩
8/10 · 3 vidas restantes
csfive.gg
```

---

## 7. UI/UX comum

- **Home (`/`)**: hub com cards dos 2 jogos (estilo basketball-5), número do puzzle do dia, status
  (jogado/não jogado), e link p/ arquivo.
- **Modais reutilizáveis** (`components/common/`): "Como jogar", "Estatísticas" (win%, streak atual,
  melhor streak, distribuição), "Configurações" (tema claro/escuro, idioma futuro, reset de stats).
- **Busca/autocomplete**: input com dropdown, navegação por teclado, normalização de nick (NFD,
  remoção de diacríticos), match prefixo > substring. Reaproveita `searchPlayers()`.
- **Share-to-clipboard** com grade de emojis (seção 5/6).
- **Tema escuro** por padrão (combina com CS); toggle salvo em `localStorage`.
- **Responsivo**: grid 3×3 e lista Top 10 adaptados a mobile.
- **Atribuição Liquipedia** no rodapé (CC-BY-SA).

### Persistência (localStorage)
```ts
// chave por jogo + data
`cs5:grid:2026-07-01` = { cells, guessesUsed, status, score }
`cs5:grid:stats`      = { played, wins, currentStreak, maxStreak, lastPlayedKey, scoreHistory }
// idem para top10
```
Lógica de streak: ao concluir, se `lastPlayedKey` == ontem → `currentStreak++`, senão reseta. Tudo
em datas UTC para casar com o reset.

---

## 8. Roadmap / Milestones

- **M0 — Setup (0,5 dia):** `git init`, scaffold Next.js 15 + Tailwind + Vitest, paleta CS, layout/header, modal "Como jogar".
- **M1 — Pipeline de dados (2–3 dias):** scripts ETL Liquipedia (fetch+cache+rate-limit, parse de
  infobox, earnings, achievements) → `public/data/*.json`. **Maior risco; começar cedo.**
- **M2 — Núcleo daily (0,5 dia):** `lib/daily` (key UTC + seed PRNG), `lib/data` (load + search).
- **M3 — Jogo Grid (2 dias):** gerador determinístico + validação + UI (board/cell/search) + scoring + share + stats.
- **M4 — Jogo Top 10 (2 dias):** motor de temas + UI lista/guess + vidas + share + stats.
- **M5 — Polish (1–2 dias):** arquivo (rejogar dias passados), modais de stats/settings, SEO/OG, responsivo, atribuição.
- **M6 (pós-MVP, opcional):** Supabase para contas + ranking global + raridade real; i18n (pt/en); novos jogos (Wordle de nicks, Connections).

---

## 9. Testes (Vitest)

- `daily-seed.test.ts` — mesma data UTC ⇒ mesmo seed/puzzle; datas diferentes ⇒ puzzles diferentes; troca exatamente à 00:00 UTC.
- `grid-generator.test.ts` — todo grid gerado é solvável (toda interseção tem ≥N elegíveis); sem critérios repetidos.
- `grid-validation.test.ts` — `playerMatches` para cada tipo de `Criterion`; bloqueio de reuso.
- `top10-engine.test.ts` — cada template gera exatamente 10 entradas ordenadas; pula templates inviáveis.
- `stats.test.ts` — lógica de streak (continuar/resetar) em torno da meia-noite UTC.
- `search.test.ts` — normalização de nicks e ranking de resultados.

## 10. Verificação E2E

1. `npm run build:dataset` (ou `tsx scripts/build-dataset.ts`) → confere `public/data/*.json` populado e `meta.json` com contagens sãs.
2. `npm run dev` → abrir `/`, ver os 2 cards e o número do puzzle.
3. **Grid:** resolver o grid do dia, validar acerto/erro/reuso, completar e ver o share correto; recarregar a página e confirmar que o estado persiste.
4. **Top 10:** revelar posições, gastar vidas, completar/perder, conferir share e streak.
5. Avançar o relógio para depois de 00:00 UTC (ou mockar a data) → puzzle novo e streak coerente.
6. `npm test` verde.

## 11. Riscos & mitigações

| Risco | Mitigação |
|------|-----------|
| Parse de wikitext da Liquipedia é frágil/instável | Cachear respostas; testes de sanidade no `meta.json`; pedir acesso à LPDB; tolerar campos ausentes. |
| Rate-limit / bloqueio da Liquipedia | Serializar requests com `sleep`, User-Agent com contato, cache em disco, rodar ETL offline (não em runtime). |
| "Top 10 automático" gerar tema ruim/insolúvel | Motor exige ≥10 candidatos com a métrica; só métricas quantitativas no MVP; rankings subjetivos entram como dados importados. |
| Raridade real exige estatística global | MVP usa raridade estimada local; raridade real fica para M6 com Supabase. |
| Reset/streak com fuso confuso | Tudo em UTC, função única `getDailyKey`, testes em torno da meia-noite. |
| Dataset desatualizado (transfers de CS são frequentes) | Regenerar dataset via GitHub Action mensal; `meta.json` mostra data da última geração. |

## 12. Próximos passos imediatos

1. Validar este plano.
2. `git init` no `cs-5` e M0 (scaffold).
3. Prototipar `scripts/fetch-liquipedia.ts` numa página de jogador real (ex.: s1mple) para confirmar
   que o parse de infobox extrai histórico de times + país + role — **isso destrava todo o resto**.
