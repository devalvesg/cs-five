# cs-5

Jogos diários (Daily Games) sobre Counter-Strike (CS:GO + CS2). Inspirado em
[basketball-5.com](https://basketball-5.com/) e [futbol11.com](https://futbol11.com/).

Dois jogos no MVP: **Grid** (bingo 3×3 de jogadores) e **Top 10** (lista temática). Single-player,
reset à meia-noite UTC, stats/streak em `localStorage`.

## Documentação

- [`docs/PLANO-DESENVOLVIMENTO.md`](docs/PLANO-DESENVOLVIMENTO.md) — plano completo, arquitetura, roadmap.
- [`docs/100-dias-preview.md`](docs/100-dias-preview.md) — cronograma de 100 dias para avaliação + mecânica de não-repetição.

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:3000
```

## Dados

Pipeline offline (build-time): **Liquipedia** (histórico de times / premiação) + **HLTV** (ranking
Top 20 do ano, MVPs/EVPs, stats de evento). O app nunca chama essas fontes em runtime — lê apenas o
dataset estático em `public/data/`. Atribuição: dados de Liquipedia sob CC-BY-SA.
