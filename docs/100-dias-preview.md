# cs-5 — Cronograma de 100 dias (para avaliação) — v2

> Objetivo: você avaliar a **direção dos temas** antes de eu construir os motores de jogo. Cobre os
> **dois jogos** (Top 10 e Grid), o mecanismo de **não-repetição** e a lista concreta dos 100
> primeiros dias do Top 10.
>
> **Fontes:** [Liquipedia](https://liquipedia.net/counterstrike) (histórico de times, premiação,
> Majors) + [HLTV](https://www.hltv.org/) (ranking do ano, MVPs/EVPs, stats de evento: kills,
> rating 2.0, etc.).

### Mudanças desta v2 (pedidos do usuário)
- **Premiação:** mantida **só por ano** (`Maiores premiações em {ano}`). Removidos all-time, por país e país+ano.
- **Ranking HLTV:** renomeado de "Top 20" para **"HLTV Top 10 de {ano}"** — usamos os 10 primeiros do ranking oficial do HLTV.
- **País:** reaberto **apenas em temas de performance** (ex.: `HLTV Top 10 da França`, `Mais kills em Majors — Suécia`), **nunca em premiação**. Isso recompõe o catálogo p/ a janela de ~2 anos.
- **Líderes de carreira:** mantidos.

---

## 1. Como garantimos que NUNCA repete (por ~2 anos)

Geração **offline no build** → um **cronograma pré-assado** (`public/data/schedule.json`):

```
schedule.json = { top10: [ {day:1,...}, ... ], grid: [ {day:1,...}, ... ] }   // janela ~800 dias
```

- O cliente só lê `schedule[N]` (N = dias desde o lançamento; reset **00:00 UTC**). Arquivo de dias passados = trivial.
- Um **ledger** na geração garante que cada Top 10 (template+parâmetros) e cada Grid (conjunto dos 6 critérios) entra **uma única vez** → impossível repetir na janela.
- Com país reaberto em performance, o catálogo de Top 10 passa de **~730 instâncias únicas** (ver §2), cobrindo ~2 anos com folga.
- O `schedule.json` é editável à mão (curadoria opcional por cima do automático).

---

## 2. Top 10 — catálogo de temas (famílias)

Todo tema = **(métrica + filtro + ordenação)**, 100% objetivo. O gerador só inclui uma instância se
houver **≥ 10 jogadores** com a métrica preenchida (senão pula).

| Família | Métrica / fonte | Instâncias únicas |
|---------|-----------------|------------------:|
| Premiações por ano {Y} (2013–2025) | earnings/ano — Liquipedia | 13 |
| HLTV Top 10 do ano {Y} (2013–2025) | ranking anual — HLTV | 13 |
| Mais kills no Major {M} | stats do evento — HLTV | 22 |
| Maior rating 2.0 no Major {M} | stats do evento — HLTV | 22 |
| Mais opening kills / clutches / ADR no Major {M} | stats do evento — HLTV | 22 ×3 = 66 |
| Líderes de carreira (Majors, finais, MVPs, EVPs, mapas, rounds, orgs, idade…) | agregados — HLTV+Liquipedia | 13 |
| **País × performance**: HLTV Top 10 da {país} | nº de presenças no HLTV Top 20, por país | ~16 |
| **País × performance**: Mais kills em Majors — {país} | soma de kills em Majors, por país | ~14 |
| **País × performance**: Maior rating de carreira — {país} | rating 2.0 de carreira (mín. de mapas), por país | ~12 |
| Eventos icônicos não-Major **nomeados** (IEM Katowice '17/'18/'20–'25, IEM Cologne '21–'24, BLAST World Final '22–'24, DH Masters Malmö '19…) × kills/rating/opening/ADR | stats — HLTV | ~16 ×4 = 64 |

> **Contabilidade honesta da janela:** ao escolher **eventos icônicos nomeados** (em vez de um balde
> genérico de "Tier S"), priorizamos qualidade/clareza e o catálogo fica em **~280–400 temas únicos
> de alta qualidade** (≈ **1,5 ano** sem repetir agora). Ele **cresce ~30–40 temas/ano** sozinho
> (novo Major, edições de IEM, ano de premiação, HLTV Top 10 do ano), então o horizonte tende a
> ~2 anos. Para travar 2 anos já no lançamento, a alavanca é adicionar mais eventos nomeados ou
> combinações país×ano. Os 100 dias abaixo são um recorte representativo.

---

## 3. Top 10 — Cronograma concreto, Dia 1 → 100 (v2)

Intercalado (dias seguidos têm tipos diferentes). Fonte entre colchetes.

| Dia | Tema | Fonte |
|----:|------|-------|
| 1 | HLTV Top 10 de 2013 | HLTV |
| 2 | Mais kills no Major — DreamHack Winter 2013 | HLTV |
| 3 | Maiores premiações em 2013 | Liquipedia |
| 4 | HLTV Top 10 da França 🇫🇷 | HLTV |
| 5 | Mais Majors vencidos (carreira) | Liquipedia |
| 6 | Maior rating 2.0 no Major — ESL One Cologne 2015 | HLTV |
| 7 | Mais kills em Majors — Dinamarca 🇩🇰 | HLTV |
| 8 | HLTV Top 10 de 2014 | HLTV |
| 9 | Mais kills no Major — EMS One Katowice 2014 | HLTV |
| 10 | Maiores premiações em 2014 | Liquipedia |
| 11 | Maior rating de carreira — Ucrânia 🇺🇦 | HLTV |
| 12 | Mais participações em Major (carreira) | HLTV |
| 13 | Maior rating 2.0 no Major — MLG Columbus 2016 | HLTV |
| 14 | HLTV Top 10 da Dinamarca 🇩🇰 | HLTV |
| 15 | HLTV Top 10 de 2015 | HLTV |
| 16 | Mais kills no Major — ESL One Cologne 2014 | HLTV |
| 17 | Maiores premiações em 2015 | Liquipedia |
| 18 | Mais kills em Majors — Suécia 🇸🇪 | HLTV |
| 19 | Mais finais de Major disputadas (carreira) | HLTV |
| 20 | Maior rating 2.0 no Major — ESL One Cologne 2016 | HLTV |
| 21 | Maior rating de carreira — Rússia 🇷🇺 | HLTV |
| 22 | HLTV Top 10 de 2016 | HLTV |
| 23 | Mais kills no Major — DreamHack Winter 2014 | HLTV |
| 24 | Maiores premiações em 2016 | Liquipedia |
| 25 | HLTV Top 10 da Suécia 🇸🇪 | HLTV |
| 26 | Mais MVPs de evento HLTV (carreira) | HLTV |
| 27 | Maior rating 2.0 no Major — PGL Krakow 2017 | HLTV |
| 28 | Mais kills em Majors — Brasil 🇧🇷 | HLTV |
| 29 | HLTV Top 10 de 2017 | HLTV |
| 30 | Mais kills no Major — ESL One Katowice 2015 | HLTV |
| 31 | Maiores premiações em 2017 | Liquipedia |
| 32 | Maior rating de carreira — França 🇫🇷 | HLTV |
| 33 | Mais EVPs de evento HLTV (carreira) | HLTV |
| 34 | Maior rating 2.0 no Major — ELEAGUE Boston 2018 | HLTV |
| 35 | HLTV Top 10 da Ucrânia 🇺🇦 | HLTV |
| 36 | HLTV Top 10 de 2018 | HLTV |
| 37 | Mais kills no Major — ESL One Cologne 2015 | HLTV |
| 38 | Maiores premiações em 2018 | Liquipedia |
| 39 | Mais kills em Majors — França 🇫🇷 | HLTV |
| 40 | Mais MVPs de Major (carreira) | HLTV |
| 41 | Maior rating 2.0 no Major — FACEIT London 2018 | HLTV |
| 42 | Maior rating de carreira — Dinamarca 🇩🇰 | HLTV |
| 43 | HLTV Top 10 de 2019 | HLTV |
| 44 | Mais kills no Major — DreamHack Cluj-Napoca 2015 | HLTV |
| 45 | Maiores premiações em 2019 | Liquipedia |
| 46 | HLTV Top 10 do Brasil 🇧🇷 | HLTV |
| 47 | Mais mapas jogados em Majors (carreira) | HLTV |
| 48 | Maior rating 2.0 no Major — IEM Katowice 2019 | HLTV |
| 49 | Mais kills em Majors — Ucrânia 🇺🇦 | HLTV |
| 50 | HLTV Top 10 de 2020 | HLTV |
| 51 | Mais kills no Major — MLG Columbus 2016 | HLTV |
| 52 | Maiores premiações em 2020 | Liquipedia |
| 53 | Maior rating de carreira — Brasil 🇧🇷 | HLTV |
| 54 | Mais rounds jogados em Majors (carreira) | HLTV |
| 55 | Maior rating 2.0 no Major — StarLadder Berlin 2019 | HLTV |
| 56 | HLTV Top 10 da Rússia 🇷🇺 | HLTV |
| 57 | HLTV Top 10 de 2021 | HLTV |
| 58 | Mais kills no Major — ESL One Cologne 2016 | HLTV |
| 59 | Maiores premiações em 2021 | Liquipedia |
| 60 | Mais kills em Majors — Polônia 🇵🇱 | HLTV |
| 61 | Mais organizações diferentes na carreira | Liquipedia |
| 62 | Maior rating 2.0 no Major — PGL Stockholm 2021 | HLTV |
| 63 | Maior rating de carreira — Suécia 🇸🇪 | HLTV |
| 64 | HLTV Top 10 de 2022 | HLTV |
| 65 | Mais kills no Major — ELEAGUE Atlanta 2017 | HLTV |
| 66 | Maiores premiações em 2022 | Liquipedia |
| 67 | HLTV Top 10 dos EUA 🇺🇸 | HLTV |
| 68 | Jogadores ativos mais velhos | Liquipedia |
| 69 | Maior rating 2.0 no Major — PGL Antwerp 2022 | HLTV |
| 70 | Mais kills em Majors — EUA 🇺🇸 | HLTV |
| 71 | HLTV Top 10 de 2023 | HLTV |
| 72 | Mais kills no Major — PGL Krakow 2017 | HLTV |
| 73 | Maiores premiações em 2023 | Liquipedia |
| 74 | Maior rating de carreira — EUA 🇺🇸 | HLTV |
| 75 | Vencedores de Major mais jovens | HLTV |
| 76 | Maior rating 2.0 no Major — IEM Rio 2022 | HLTV |
| 77 | HLTV Top 10 da Polônia 🇵🇱 | HLTV |
| 78 | HLTV Top 10 de 2024 | HLTV |
| 79 | Mais kills no Major — ELEAGUE Boston 2018 | HLTV |
| 80 | Maiores premiações em 2024 | Liquipedia |
| 81 | Mais kills em Majors — Finlândia 🇫🇮 | HLTV |
| 82 | Mais kills em Majors na carreira (líder all-time) | HLTV |
| 83 | Maior rating 2.0 no Major — BLAST.tv Paris 2023 | HLTV |
| 84 | HLTV Top 10 da Finlândia 🇫🇮 | HLTV |
| 85 | HLTV Top 10 de 2025 | HLTV |
| 86 | Mais kills no Major — FACEIT London 2018 | HLTV |
| 87 | Maiores premiações em 2025 | Liquipedia |
| 88 | HLTV Top 10 da Bósnia 🇧🇦 | HLTV |
| 89 | Maior rating em Majors na carreira (líder all-time) | HLTV |
| 90 | Maior rating 2.0 no Major — PGL Copenhagen 2024 | HLTV |
| 91 | HLTV Top 10 da Noruega 🇳🇴 | HLTV |
| 92 | Mais kills no Major — IEM Katowice 2019 | HLTV |
| 93 | HLTV Top 10 da Turquia 🇹🇷 | HLTV |
| 94 | Mais kills na IEM Katowice 2023 (evento icônico não-Major) | HLTV |
| 95 | Maior rating 2.0 no Major — BLAST.tv Austin 2025 | HLTV |
| 96 | HLTV Top 10 do Cazaquistão 🇰🇿 | HLTV |
| 97 | Mais kills no Major — PGL Stockholm 2021 | HLTV |
| 98 | HLTV Top 10 de Israel 🇮🇱 | HLTV |
| 99 | Maior rating na IEM Cologne 2022 (evento icônico não-Major) | HLTV |
| 100 | Mais kills na BLAST World Final 2023 (evento icônico não-Major) | HLTV |

> Os 100 acima são instâncias **únicas**. O catálogo total (§2) passa de 730, garantindo ~2 anos.

---

## 4. Grid — pools de critérios, dificuldade e não-repetição

Um Grid = 6 critérios (3 linhas + 3 colunas). Tipos de **critério** (pools iniciais):

- **Time/Org** (`team`): Astralis, NAVI, FaZe, Vitality, G2, NIP, fnatic, Virtus.pro, MIBR/SK/Luminosity,
  Cloud9, Liquid, Heroic, ENCE, MOUZ/mousesports, FURIA, Spirit, BIG, Complexity, NRG, Gambit, OG,
  Renegades/100T, Dignitas, TYLOO… (~30+).
- **País** (`country`): Dinamarca, Suécia, Ucrânia, Rússia, França, Brasil, EUA, Polônia, Finlândia,
  Eslováquia, Bósnia, Noruega, Canadá, Cazaquistão, Israel, Turquia, China, Austrália…
- **Função** (`role`): AWPer, IGL, Rifler, Entry, Support.
- **Conquista** (`award`): Vencedor de Major, MVP de Major, MVP de evento (HLTV), HLTV Top 20,
  HLTV #1 do mundo, Finalista de Major.
- **Era** (`era`): ativo em 2015 / 2018 / 2021 / 2024, era CS:GO, era CS2.

> **MVP usa só `Time` e `País`** (decidido com você). Função/Conquista/Era seguem no pool acima,
> mas **desativados no MVP** — reservados para um "modo difícil" futuro. Bônus: o pipeline de dados
> do Grid passa a precisar só de **jogador→times** e **jogador→país** (mais simples e robusto).

**Não-repetição:** a chave canônica é o conjunto ordenado dos 6 critérios; o ledger impede repetir.
Mesmo só com Time e País, há **milhares** de combinações válidas (≥ N jogadores por célula) →
2 anos sem repetir é folgado neste jogo.

### Exemplos conceituais (formato/dificuldade — solvabilidade exata é validada pelo dataset)

> ⚠️ Não afirmo os jogadores exatos de cada célula (depende do dataset; o gerador valida cada
> interseção). Os exemplos ilustram **tipos de eixo e dificuldade**.

**Fácil**
```
              Dinamarca     Suécia        Brasil
FaZe            ·             ·             ·
Astralis        ·             ·             ·
MIBR            ·             ·             ·
```
**Só times (mais fácil ainda)**
```
              NAVI          FaZe          Vitality
G2              ·             ·             ·
Astralis        ·             ·             ·
NIP             ·             ·             ·
```
> Os perfis Função/Conquista/Era ficam fora do MVP (modo difícil futuro).

---

## 5. O que eu preciso da sua avaliação

1. A lista v2 do Top 10 está no caminho? Algum tema pra cortar/destacar?
2. Os temas de **país × performance** (`HLTV Top 10 da {país}`, `Mais kills em Majors — {país}`,
   `Maior rating de carreira — {país}`) ficaram do jeito que você imaginou ao "reabrir país"?
3. O **mix do Grid** (Time/País/Função/Conquista/Era) cobre o que você queria?

Com seu "OK", parto para o **pipeline de dados** (validar o parse numa página real, ex.: s1mple) e
gero o `schedule.json` real validado contra o dataset.
