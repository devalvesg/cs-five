# Plano de implementação — Modal de card de compartilhamento (Top 10)

**Spec:** `docs/superpowers/specs/2026-06-11-top10-share-card-design.md`
**Data:** 2026-06-11

Referência de design (handoff extraído): `/tmp/cardhandoff/cs-five/project/`
(`card/sharecard.jsx`, `card/flags.jsx`, `CS-FIVE Result Card.html`).

Cada fase termina num estado verificável. Marcar caixas conforme conclui.

---

## Fase 0 — Dependência

- [ ] `npm install html-to-image`
- **Verificação:** `html-to-image` aparece em `package.json` e `node -e "require('html-to-image')"` não erra.

---

## Fase 1 — Dados do card (puro, testável)

Arquivo: `lib/share/top10-card.ts`

- [ ] Definir tipos `Top10CardSlot` e `Top10CardData` (conforme spec).
- [ ] Implementar `buildTop10CardData(puzzle: Top10Puzzle, found: string[]): Top10CardData`:
  - `puzzle` = `getPuzzleNumber()`
  - `theme` = `puzzle.title`
  - `correct` = `found.length`; `total` = `puzzle.answers.length`
  - `slots` = `puzzle.answers` (já em ordem de rank) mapeados para
    `{ flag: a.kind === "player" ? (getPlayer(a.id)?.countryCode ?? null) : null, solved: found.includes(a.id) }`
- Imports: `getPuzzleNumber` de `@/lib/daily`, `getPlayer` de `@/lib/data/players`,
  tipo `Top10Puzzle` de `@/lib/top10/schedule`.

Teste: `tests/top10-card.test.ts`

- [ ] Caso jogador: bandeiras mapeadas a partir de `countryCode`.
- [ ] Caso time: todos os `flag` = `null`.
- [ ] `correct` = nº de achados; `solved` correto por slot.
- [ ] Ordem dos slots = ordem de `puzzle.answers`.
- **Verificação:** `npx vitest run tests/top10-card.test.ts` passa.

---

## Fase 2 — CSS do card

Arquivo: `components/share/share-card.css`

- [ ] Portar literalmente o bloco `<style>` do handoff (classes `.sharecard`,
  `.sc-glow`, `.sc-inner`, `.sc-square`, `.sc-story`, `.ch-*`, `.slot*`, `.hdot`),
  preservando os valores em px (escala 1080).
- [ ] **Remover** o `:root{...}` do handoff e as regras do grid card
  (`.sc-gridcard`, `.ggrid*`, `.gcell*`) e `.dc-*` — fora de escopo.
- [ ] Trocar referências de fonte: usar `font-family: var(--font-oxanium)` onde o
  handoff usa `"Oxanium"` e `var(--font-barlow)` onde usa `"Barlow"`.
- [ ] Confirmar que as cores usam as variáveis já existentes no projeto
  (`globals.css` define `--gold`, `--panel-2`, `--green`, `--muted`, `--border`,
  `--txt`). Se faltar alguma var usada pelo card, adicionar em `globals.css`.
- **Verificação:** ler `app/globals.css` e conferir que todas as vars usadas pelo
  CSS do card existem; caso contrário, adicioná-las.

---

## Fase 3 — Componente apresentacional do card

Arquivo: `components/share/ShareCard.tsx`

- [ ] `import "./share-card.css"`.
- [ ] Subcomponentes portados do handoff:
  - `CardBrand` (hexágono + crosshair) — reusar/adaptar de `components/Brand.tsx`
    (`BrandMark`) já existente; ajustar tamanhos conforme handoff.
  - `Wordmark` — reusar `components/Brand.tsx` (`Wordmark`).
  - `Slot({ index, slot, big })` — resolvido (rank dourado + bandeira PNG + check)
    vs não resolvido (rank neutro + 3 `hdot`).
- [ ] `Flag`: usar `<img src={flagSrc(code)} ... />` (PNG, 32 países) em vez do SVG
  do handoff. Dimensão da bandeira conforme `fsize` (44 story / 34 square).
  Slot resolvido com `flag === null` → renderizar sem `<img>`, só o check.
- [ ] `ShareCard({ data, variant })`: header (brand + wordmark + "TOP 10" +
  `#{data.puzzle}`), tema (`data.theme`), placar (`data.correct`/`data.total` +
  "acertos"), grade (square = 2 col de 5; story = 1 col de 10 com `big`), footer.
- [ ] O nó raiz tem dimensões fixas conforme `variant`
  (`width/height` 1080×1080 ou 1080×1920) via style inline, para a captura.
- **Verificação:** typecheck (`npx tsc --noEmit`) limpo.

---

## Fase 4 — Modal com preview + download

Arquivo: `components/share/ShareCardModal.tsx`

- [ ] `"use client"`. Props `{ data: Top10CardData; onClose: () => void }`.
- [ ] Estado `variant` (default `"square"`), `busy` (loading do download).
- [ ] `useRef` no nó real do `ShareCard` (renderizado em tamanho 1080, posicionado
  fora da viewport — ex.: container com `position: fixed; left: -99999px`).
- [ ] Preview visível: um segundo `ShareCard` (ou o mesmo via wrapper) reduzido
  com `transform: scale(...)` calculado pra caber (ex.: largura alvo ~360px →
  `scale(360/1080)`), com `transform-origin` e altura do wrapper ajustada.
- [ ] Toggle **Quadrado / Story** (dois botões estilo pílula, igual ao app).
- [ ] Botão **Baixar imagem**:
  - `setBusy(true)`; `await document.fonts.ready`;
  - `const url = await toPng(ref.current, { width, height, pixelRatio: 1, cacheBust: true })`;
  - criar `<a>` com `href=url`, `download="cs-five-top10-${data.puzzle}.png"`, click, remove;
  - `try/catch` → em erro, manter modal e mostrar aviso curto; `finally setBusy(false)`.
- [ ] Botão fechar + clique no backdrop fecham (reusar padrão do `Overlay` já
  existente em `app/top10/page.tsx`, mas o modal é maior — usar layout próprio).
- **Verificação:** typecheck limpo.

---

## Fase 5 — Integração na página

Arquivo: `app/top10/page.tsx`

- [ ] Importar `ShareCardModal` e `buildTop10CardData`.
- [ ] Adicionar estado `const [shareOpen, setShareOpen] = useState(false)`.
- [ ] Remover a função `share()` e o estado `copied` (cópia de texto do card).
- [ ] Botão "Compartilhar" → `onClick={() => setShareOpen(true)}`, texto fixo
  "Compartilhar".
- [ ] Renderizar `{shareOpen && <ShareCardModal data={buildTop10CardData(puzzle, found)} onClose={() => setShareOpen(false)} />}`.
- [ ] Confirmar que nada em `lib/share/grid.ts` (Grid) foi tocado.
- **Verificação:** typecheck limpo; `npx vitest run` passa (testes existentes +
  novo).

---

## Fase 6 — Verificação manual

- [ ] `npm run dev`, abrir `/top10`.
- [ ] Terminar uma partida (vencer e, em outra, desistir).
- [ ] Abrir o modal pelo botão Compartilhar.
- [ ] Alternar Quadrado ↔ Story — preview muda.
- [ ] Baixar nos dois formatos; abrir os PNGs e conferir:
  - placar correto, tema, `#puzzle`;
  - bandeiras nos slots resolvidos (tema de jogador);
  - tema de time → check sem bandeira;
  - tipografia Oxanium/Barlow correta (não fallback).
- [ ] Conferir nitidez (1080px) e fidelidade ao handoff.

---

## Notas

- **Fontes na captura:** o `await document.fonts.ready` é essencial; sem ele o
  primeiro download pode sair com fonte fallback.
- **Bandeiras same-origin** (`/flags/*.png`) → sem CORS na rasterização.
- O handoff completo (incl. card de Grid, fora de escopo) está em
  `/tmp/cardhandoff/` — referência para uma fase futura.
</content>
