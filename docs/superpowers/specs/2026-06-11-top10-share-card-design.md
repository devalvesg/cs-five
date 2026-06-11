# Top 10 — Modal de card de compartilhamento

**Data:** 2026-06-11
**Status:** Design aprovado, aguardando plano de implementação

## Objetivo

Trocar o comportamento atual do botão "Compartilhar" do jogo Top 10 — hoje
copia um texto de emojis pra clipboard — por um **modal que exibe um card de
resultado visual** (estilo Wordle/LoLdle) e permite **baixar a imagem** em PNG.

O design do card já foi produzido num handoff (HTML/CSS + React) e usa os mesmos
tokens da identidade CS-FIVE. Esta spec descreve como portá-lo pro app Next.js.

## Decisões do produto

- **Formatos oferecidos:** quadrado (1080×1080) **e** story (1080×1920), com um
  toggle no modal pra alternar.
- **Ação no modal:** apenas **baixar imagem** (PNG). Não há compartilhamento
  nativo nem cópia de texto nesta versão.
- O texto-emoji antigo (`share()` em `app/top10/page.tsx`) sai do fluxo.

## Escopo

**Dentro:**
- Modal de compartilhamento do Top 10 com preview do card + toggle de formato +
  download PNG.
- Card apresentacional fiel ao handoff, reusando as bandeiras PNG do projeto.

**Fora (futuro, mesma infra):**
- Card de compartilhamento do Grid (veio junto no handoff).
- Compartilhamento nativo (Web Share API) e cópia de texto.

## Arquitetura

Quatro unidades, cada uma com um papel único:

### 1. `lib/share/top10-card.ts` — dados do card (puro)

```ts
export type Top10CardSlot = { flag: string | null; solved: boolean };
export type Top10CardData = {
  puzzle: number;      // número do puzzle (#23)
  theme: string;       // título do tema
  correct: number;     // acertos
  total: number;       // total (10)
  slots: Top10CardSlot[]; // ordem por rank 1..N
};

export function buildTop10CardData(
  puzzle: Top10Puzzle,
  found: string[],
): Top10CardData;
```

- `slots` segue a ordem de `puzzle.answers` (rank crescente).
- `flag` = `getPlayer(answer.id)?.countryCode ?? null` para `kind === "player"`;
  `null` para times.
- `solved` = `found.includes(answer.id)`.
- `correct` = `found.length`; `total` = `puzzle.answers.length`.
- `puzzle` = `getPuzzleNumber()`.

### 2. `components/share/ShareCard.tsx` — card apresentacional

- Prop: `{ data: Top10CardData; variant: "square" | "story" }`.
- Porta o JSX do handoff (`sharecard.jsx`): header (brandmark + wordmark + "TOP
  10" + #puzzle), título do tema, placar grande (`correct/total` + "acertos"),
  grade de slots, footer (`csfive.gg` · "Novo desafio todo dia").
- **Layout dos slots:** quadrado = 2 colunas de 5; story = 1 coluna de 10
  (slots maiores, classe `slot-big`).
- **Slot resolvido:** rank em dourado + bandeira (PNG) + check verde.
- **Slot não resolvido:** rank neutro + três pontos (`hdot`).
- **Bandeiras:** reusar `flagSrc(code)` → `/flags/XX.png` (32 países). Substitui
  os SVGs hardcoded do handoff. Slot resolvido sem `flag` (temas de time) mostra
  só o check, sem imagem de bandeira.
- O nó é renderizado **em tamanho real** (1080×1080 ou 1080×1920) para a captura;
  no preview do modal é reduzido via `transform: scale(...)`.

### 3. `components/share/share-card.css`

- CSS do handoff portada **literalmente** (classes `.sharecard`, `.sc-square`,
  `.sc-story`, `.slot`, etc.), preservando os valores em px da escala 1080 para
  rasterizar nítido.
- As variáveis de cor (`--gold`, `--panel-2`, ...) já existem no projeto; usar as
  do projeto. Tipografia: `var(--font-oxanium)` e `var(--font-barlow)` (já
  carregadas no layout do app), não as URLs do Google Fonts do handoff.

### 4. `components/share/ShareCardModal.tsx` — modal

- Props: `{ data: Top10CardData; onClose: () => void }`.
- Estado interno: `variant: "square" | "story"` (default `square`).
- Conteúdo:
  - Preview do `ShareCard` (escalado pra caber na viewport).
  - Toggle **Quadrado / Story**.
  - Botão **Baixar imagem**.
  - Botão fechar.
- **Download:** ao clicar, renderizar o `ShareCard` no tamanho real (nó
  off-screen ou o próprio preview em escala 1:1 fora da viewport), chamar
  `toPng(node, { width, height, pixelRatio: 1, cacheBust: true })` de
  `html-to-image`, e disparar download via `<a download>` com nome
  `cs-five-top10-<puzzle>.png`.
- **Fontes:** aguardar `await document.fonts.ready` antes de `toPng` pra não
  capturar com fonte fallback.
- Estado de loading no botão enquanto rasteriza; tratamento de erro com try/catch
  (mostrar mensagem curta, não quebrar).

## Fluxo de dados

```
app/top10/page.tsx
  botão "Compartilhar" (status === "won" | "gaveup")
    → abre ShareCardModal com buildTop10CardData(puzzle, found)
      → ShareCard (variant) renderizado em 1080
        → html-to-image toPng
          → download cs-five-top10-#N.png
```

## Integração em `app/top10/page.tsx`

- Substituir a função `share()` (cópia de texto) por estado de modal:
  `const [shareOpen, setShareOpen] = useState(false)`.
- O botão "Compartilhar" passa a `onClick={() => setShareOpen(true)}`.
- Renderizar `{shareOpen && <ShareCardModal data={...} onClose={...} />}`.
- Remover o estado `copied` e a lógica de clipboard ligada ao card (o
  `buildGridShare`/`lib/share/grid.ts` do Grid não é afetado).

## Dependências

- Adicionar `html-to-image` ao `package.json`.

## Tratamento de erros

- `toPng` pode falhar (fontes/imagens não carregadas, browser antigo): envolver
  em try/catch, manter o modal aberto e exibir aviso curto.
- Imagens de bandeira são same-origin (`/flags`), então não há problema de CORS
  na rasterização.

## Testes

- **Unitário** (`tests/top10-card.test.ts`): `buildTop10CardData` — contagem de
  acertos, mapeamento de bandeiras (jogador com país, time sem país → `null`),
  ordem dos slots por rank, `puzzle`/`total` corretos.
- **Manual:** subir o dev server, terminar uma partida (vitória e desistência),
  abrir o modal, alternar quadrado/story, baixar e conferir o PNG fiel ao
  handoff.

## Critérios de aceite

- O botão "Compartilhar" abre o modal com o card renderizado fiel ao design.
- Toggle alterna entre 1080×1080 e 1080×1920.
- "Baixar imagem" salva um PNG nítido com o resultado correto (acertos, tema,
  número do puzzle, bandeiras nos slots resolvidos).
- Funciona tanto após vitória quanto após desistência.
- Temas de jogador mostram bandeiras; temas de time mostram check sem bandeira.
</content>
</invoke>
