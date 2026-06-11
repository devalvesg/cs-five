"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  searchPlayers, teamLogo, flagSrc, getPlayer, type Player,
} from "@/lib/data/players";
import {
  playerMatches, solveRemaining, type Criterion, type GridPuzzle,
} from "@/lib/grid/generator";
import { getGridForPuzzle } from "@/lib/grid/schedule";
import { getPuzzleNumber } from "@/lib/daily";
import {
  loadGame, saveGame, recordResult, loadStats, type SavedGame, type GridStats,
} from "@/lib/stats/grid";
import { players as allPlayers } from "@/lib/data/players";
import { buildGridShare } from "@/lib/share/grid";
import SiteHeader, { IconButton } from "@/components/SiteHeader";
import { BrandMark, Wordmark } from "@/components/Brand";

export default function GridPage() {
  const puzzle = useMemo<GridPuzzle | null>(
    () => getGridForPuzzle(getPuzzleNumber()),
    []
  );

  const [cells, setCells] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, string>>({}); // respostas do "Desistir"
  const [status, setStatus] = useState<SavedGame["status"]>("playing");
  // Jogador escolhido que encaixa em >1 célula: destaca as opções p/ o usuário clicar.
  const [pending, setPending] = useState<{ player: Player; cells: string[] } | null>(null);
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [stats, setStats] = useState<GridStats | null>(null);
  const [panel, setPanel] = useState<"none" | "help" | "stats">("none");
  const [copied, setCopied] = useState(false);

  // Restaura o jogo do dia.
  useEffect(() => {
    const saved = loadGame();
    if (saved) { setCells(saved.cells); setStatus(saved.status); }
    setStats(loadStats());
  }, []);

  // Persiste a cada mudança.
  useEffect(() => {
    if (status === "playing" && Object.keys(cells).length === 0) return;
    saveGame({ cells, status });
  }, [cells, status]);

  if (!puzzle) {
    return (
      <div className="relative z-[1] min-h-screen">
        <SiteHeader left={<BackButton />} />
        <main className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Grid</h1>
          <p className="text-cs-muted">
            Schedule de grids vazia. Rode <code>npm run build:schedule</code> e recarregue.
          </p>
          <Link href="/" className="text-cs-blue hover:underline">← Voltar</Link>
        </main>
      </div>
    );
  }

  const used = new Set(Object.values(cells));
  const results = query.trim() ? searchPlayers(query, 8) : [];

  // Células livres em que o jogador satisfaz os dois critérios.
  function eligibleCells(p: Player): string[] {
    const out: string[] = [];
    for (let r = 0; r < puzzle!.rows.length; r++) {
      for (let c = 0; c < puzzle!.cols.length; c++) {
        const key = `${r}-${c}`;
        if (cells[key]) continue;
        if (playerMatches(p, puzzle!.rows[r]) && playerMatches(p, puzzle!.cols[c])) out.push(key);
      }
    }
    return out;
  }

  function place(p: Player, key: string) {
    const next = { ...cells, [key]: p.id };
    setCells(next); setPending(null); setQuery(""); setNote(null);
    if (Object.keys(next).length === 9) { setStatus("won"); setStats(recordResult(true)); }
  }

  // Escolha pela busca: 0 células → inválido; 1 → preenche; >1 → destaca p/ clicar.
  function pick(p: Player) {
    if (status !== "playing") return;
    if (used.has(p.id)) { setNote(`${p.id} já está no grid`); return; }
    const elig = eligibleCells(p);
    if (elig.length === 0) { setNote(`${p.id} não encaixa em nenhuma célula livre`); doFlashInput(); return; }
    if (elig.length === 1) { place(p, elig[0]); return; }
    setPending({ player: p, cells: elig }); setQuery(""); setNote(null);
  }

  function cellClick(key: string) {
    if (status !== "playing" || !pending) return;
    if (pending.cells.includes(key)) place(pending.player, key);
  }

  function doFlashInput() { setFlash("input"); setTimeout(() => setFlash(null), 500); }

  function giveUp() {
    if (status !== "playing") return;
    const answers = solveRemaining(allPlayers, puzzle!, cells);
    setRevealed(answers);
    setStatus("gaveup");
    setPending(null);
    setStats(recordResult(false));
  }

  async function share() {
    const txt = buildGridShare(cells);
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  return (
    <div className="relative z-[1] min-h-screen">
      <SiteHeader
        left={<BackButton />}
        right={
          <>
            <IconButton aria-label="Como jogar" onClick={() => setPanel("help")}>?</IconButton>
            <IconButton aria-label="Estatísticas" onClick={() => setPanel("stats")}>▦</IconButton>
          </>
        }
      />

      <main className="mx-auto max-w-[920px] px-4 pb-24 pt-7">
        <h1 className="mb-1 mt-1.5 text-center font-display text-[32px] font-extrabold tracking-[0.02em]">
          <Wordmark size={32} /> <span className="text-cs-txt">GRID</span>{" "}
          <span className="align-middle text-base font-bold text-cs-muted">#{getPuzzleNumber()}</span>
        </h1>
        <p className="mx-auto mb-6 max-w-[560px] text-center text-[15px] font-semibold text-cs-txt">
          Nomeie um jogador que satisfaça os dois critérios de cada cruzamento
          (time = jogou pela org · país = nacionalidade).
        </p>

        {/* Tabuleiro 4×4: canto + headers + células */}
        <div className="flex justify-center">
          <div className="grid grid-cols-[76px_repeat(3,1fr)] gap-1.5 sm:grid-cols-[96px_repeat(3,minmax(0,108px))] sm:gap-2">
            {/* canto */}
            <div className="flex h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-cs-lineSoft bg-cs-surface sm:h-[108px]">
              <BrandMark size={26} />
              <span className="font-display text-[11px] font-extrabold tracking-[0.08em] text-cs-gold">GRID</span>
            </div>
            {puzzle.cols.map((c) => <Header key={`c-${c.value}`} crit={c} />)}

            {puzzle.rows.map((row, r) => (
              <RowFragment key={`r-${row.value}`}>
                <Header crit={row} />
                {puzzle.cols.map((_, c) => {
                  const key = `${r}-${c}`;
                  const pid = cells[key];
                  const rev = revealed[key];
                  const selectable = pending?.cells.includes(key) ?? false;
                  return (
                    <button
                      key={key}
                      onClick={() => cellClick(key)}
                      className={[
                        "flex h-20 items-center justify-center overflow-hidden rounded-lg border transition sm:h-[108px]",
                        pid ? "border-cs-green/50 bg-cs-green/[0.08]"
                          : selectable ? "cursor-pointer border-cs-gold bg-cs-gold/[0.14] ring-2 ring-cs-gold/40"
                          : rev ? "border-cs-red/35 bg-cs-red/[0.06]"
                          : "border-cs-lineSoft bg-cs-surface2",
                      ].join(" ")}
                    >
                      {pid ? <PlayerChip id={pid} tone="green" />
                        : rev ? <PlayerChip id={rev} tone="red" />
                        : <span className="text-2xl font-light text-white/15">＋</span>}
                    </button>
                  );
                })}
              </RowFragment>
            ))}
          </div>
        </div>

        {/* Barra de busca */}
        {status === "playing" && (
          <div className="mx-auto mt-8 max-w-[520px] space-y-2">
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setNote(null); }}
                placeholder="Digite o jogador aqui"
                className={[
                  "h-[46px] w-full rounded-full border-2 bg-[#c9d2dc] px-[18px] text-[16px] font-semibold text-[#1a2230] outline-none transition placeholder:text-[#5b6573] sm:w-[300px]",
                  flash ? "border-cs-red shadow-[0_0_0_3px_rgba(207,83,64,.4)] animate-cs-shake" : "border-[#8b97a6] focus:border-cs-gold focus:shadow-[0_0_0_3px_rgba(224,169,60,0.25)]",
                ].join(" ")}
              />
              <button
                onClick={giveUp}
                className="h-[46px] shrink-0 rounded-full border-2 border-cs-red px-5 font-display text-[15px] font-bold italic text-cs-red transition hover:bg-cs-red hover:text-white"
              >
                Desistir
              </button>
            </div>

            {pending && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-cs-gold/50 bg-cs-gold/10 px-3 py-2 text-sm">
                <span>
                  Você tem múltiplas opções onde pode adicionar <b className="text-cs-gold">{pending.player.id}</b> — clique numa célula destacada.
                </span>
                <button onClick={() => setPending(null)} className="shrink-0 text-cs-muted hover:text-cs-red">cancelar</button>
              </div>
            )}
            {note && <p className="text-center text-xs text-cs-red">{note}</p>}

            {/* Dropdown de resultados, abre PARA BAIXO do input */}
            {!pending && results.length > 0 && (
              <ul className="mx-auto max-h-64 max-w-[400px] overflow-auto rounded-lg border border-cs-line bg-cs-surface">
                {results.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => pick(p)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-cs-surface2">
                      <Avatar player={p} size={32} />
                      <span className="flex flex-col leading-tight">
                        <span className="font-semibold">{p.id}</span>
                        {p.realName && <span className="text-xs text-cs-muted">{p.realName}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {!pending && query.trim() && results.length === 0 && (
              <p className="text-center text-xs text-cs-muted">Nenhum jogador encontrado.</p>
            )}
          </div>
        )}

        {status !== "playing" && (
          <div className="mx-auto mt-8 flex max-w-[520px] flex-col items-center gap-1.5">
            <span className={`font-display text-xl font-bold ${status === "won" ? "text-cs-green" : "text-cs-red"}`}>
              {status === "won" ? "Grid completo! 🏆" : "Você desistiu."}
            </span>
            <span className="text-[15px] font-bold text-cs-muted">{Object.keys(cells).length}/9 células</span>
            <button onClick={share} className="mt-3 rounded-full bg-cs-gold px-5 py-2 font-display font-bold text-cs-ink transition hover:bg-cs-goldBright">
              {copied ? "Copiado!" : "Compartilhar"}
            </button>
          </div>
        )}
      </main>

      {panel !== "none" && (
        <Overlay onClose={() => setPanel("none")}>
          {panel === "help" ? (
            <>
              <h2 className="font-display text-lg font-bold">Como jogar</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cs-txt/90">
                <li>Cada célula cruza dois critérios: um <b>time</b> e/ou um <b>país</b>.</li>
                <li>Digite o nome do jogador no campo de busca.</li>
                <li>Se ele couber em só uma célula, é preenchida na hora; se couber em <b>mais de uma</b>, as opções ficam destacadas para você <b>clicar</b>.</li>
                <li>Um jogador não pode ser usado em duas células.</li>
                <li>Preencha as 9 células para vencer — sem limite de tentativas.</li>
                <li>Pode <b>desistir</b> a qualquer momento para revelar as respostas.</li>
                <li>Novo grid todo dia à meia-noite (UTC).</li>
              </ul>
            </>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold">Estatísticas</h2>
              {stats && (
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <Stat n={stats.played} l="Jogos" />
                  <Stat n={stats.played ? Math.round((stats.wins / stats.played) * 100) : 0} l="% vitória" />
                  <Stat n={stats.currentStreak} l="Streak" />
                  <Stat n={stats.maxStreak} l="Melhor" />
                </div>
              )}
            </>
          )}
        </Overlay>
      )}
    </div>
  );
}

function BackButton() {
  return (
    <Link href="/" aria-label="Voltar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cs-txt transition hover:bg-white/5 hover:text-cs-gold">
      <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
    </Link>
  );
}

function RowFragment({ children }: { children: React.ReactNode }) { return <>{children}</>; }

/** Foto do jogador (se houver) com fallback para iniciais do nick. */
function Avatar({ player, size }: { player: Player; size: number }) {
  if (player.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.photo} alt={player.id} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-cs-surface text-[10px] font-bold text-cs-muted"
      style={{ width: size, height: size }}
    >
      {player.id.slice(0, 2).toUpperCase()}
    </span>
  );
}

/** Conteúdo de uma célula preenchida: nick (verde) ou resposta revelada (vermelho itálico). */
function PlayerChip({ id, tone }: { id: string; tone: "green" | "red" }) {
  const player = getPlayer(id);
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1">
      {player && <Avatar player={player} size={28} />}
      <span className={`font-display text-[13px] font-bold leading-none ${tone === "green" ? "text-cs-green" : "italic text-cs-red"}`}>{id}</span>
    </span>
  );
}

/** Cabeçalho de linha/coluna: logo (time) ou bandeira (país) + nome pequeno de referência. */
function Header({ crit }: { crit: Criterion }) {
  const isTeam = crit.kind === "team";
  const src = isTeam ? teamLogo(crit.value) : flagSrc(crit.value);
  return (
    <div className="flex h-20 flex-col items-center justify-center gap-1 px-1 text-center sm:h-[108px]">
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={crit.label}
          className={isTeam ? "h-11 w-11 object-contain" : "h-7 w-10 rounded-sm object-cover"}
        />
      )}
      <span className="text-[10px] font-bold uppercase leading-tight tracking-[0.04em] text-cs-muted">{crit.label}</span>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return <div><div className="font-display text-2xl font-bold">{n}</div><div className="text-[10px] text-cs-muted">{l}</div></div>;
}
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-cs-line bg-cs-surface p-5" onClick={(e) => e.stopPropagation()}>
        {children}
        <button onClick={onClose} className="mt-4 w-full rounded-lg bg-cs-surface2 py-2 text-sm hover:bg-cs-line">Fechar</button>
      </div>
    </div>
  );
}
