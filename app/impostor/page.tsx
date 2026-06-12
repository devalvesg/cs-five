"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getImpostorForPuzzle, type ImpostorOption, type ImpostorPuzzle } from "@/lib/impostor/schedule";
import { applyVerify, correctIds, initialState, type ImpostorState } from "@/lib/impostor/engine";
import { positionsFor, PITCH_W, PITCH_H } from "@/lib/impostor/layout";
import { usePuzzleNumber } from "@/lib/daily/usePuzzleNumber";
import { loadGame, saveGame, recordResult, loadStats, type ImpostorStats } from "@/lib/stats/impostor";
import { getPlayer, teamLogo, teamName, type Player } from "@/lib/data/players";
import SiteHeader, { IconButton } from "@/components/SiteHeader";
import { Wordmark } from "@/components/Brand";

export default function ImpostorPage() {
  const puzzleNumber = usePuzzleNumber();
  const puzzle = useMemo<ImpostorPuzzle | null>(
    () => (puzzleNumber == null ? null : getImpostorForPuzzle(puzzleNumber)),
    [puzzleNumber],
  );

  const [state, setState] = useState<ImpostorState>(initialState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState<ImpostorStats | null>(null);
  const [panel, setPanel] = useState<"none" | "help" | "stats">("none");

  // Restaura o jogo do dia.
  useEffect(() => {
    const saved = loadGame();
    if (saved) { setState({ found: saved.found, lostId: saved.lostId, phase: saved.phase }); }
    setStats(loadStats());
  }, []);

  // Persiste a cada mudança (depois de iniciar).
  useEffect(() => {
    if (state.phase === "playing" && state.found.length === 0) return;
    saveGame({ found: state.found, lostId: state.lostId, phase: state.phase });
  }, [state]);

  if (puzzleNumber == null || !puzzle) {
    return (
      <Shell>
        <p className="text-center text-cs-muted">
          {puzzleNumber == null ? "Carregando…" : "Sem temas. Rode "}
          {puzzleNumber != null && <code>npm run build:impostor</code>}.
        </p>
      </Shell>
    );
  }

  const result = state.phase !== "playing";
  const won = state.phase === "won";
  const corrects = correctIds(puzzle);
  const total = corrects.length;
  const positions = positionsFor(puzzle.options.length);

  function verify() {
    if (result || !selectedId) return;
    const next = applyVerify(puzzle!, state, selectedId);
    setSelectedId(null);
    setState(next);
    if (next.phase !== "playing") {
      if (next.phase === "won") setRevealed(true);
      const s = recordResult(next.phase === "won");
      setStats(s);
    }
  }

  function tileState(o: ImpostorOption): TileState {
    if (!result) return selectedId === o.id ? "selected" : "idle";
    if (state.found.includes(o.id)) return "win-correct";
    if (o.id === state.lostId) return "lose-impostor";
    if (o.correct && revealed) return "miss";
    return "idle";
  }

  return (
    <Shell
      score={stats ? { w: stats.wins, l: stats.played - stats.wins } : null}
      onHelp={() => setPanel("help")}
      onStats={() => setPanel("stats")}
    >
      <h1 className="mb-4 mt-1.5 text-center font-display text-[26px] font-extrabold tracking-[0.02em]">
        <Wordmark size={26} /> <span className="italic text-cs-txt">IMPOSTOR</span>{" "}
        <span className="align-middle text-base font-bold not-italic text-cs-muted">#{puzzleNumber}</span>
      </h1>

      <Pitch>
        {/* centro: categoria ou resultado */}
        <div
          className="pointer-events-none absolute z-[5] w-[226px] -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ left: PITCH_W / 2, top: PITCH_H / 2 }}
        >
          {!result ? (
            <>
              <div className="mb-2 text-[15px] font-medium text-[#9fb0c4]">A categoria é:</div>
              <div className="rounded-2xl border-2 border-[#2fbdee]/55 bg-[#0b1017] px-4 py-3.5 font-display text-[19px] font-semibold leading-[1.18] text-[#eaf2fb] shadow-[0_6px_22px_rgba(0,0,0,0.55),inset_0_0_18px_rgba(47,189,238,0.05)]">
                {puzzle.title}
              </div>
              <div className="mt-2.5 text-[14px] font-semibold text-[#cdd7e3]">
                Evite os <span className="font-extrabold tracking-[0.02em] text-[#ef5b6b]">IMPOSTORES</span>
              </div>
            </>
          ) : (
            <>
              <div className={`inline-block rounded-[10px] px-[18px] py-1.5 font-display text-[18px] font-bold text-white shadow-[0_4px_16px_rgba(0,0,0,.45)] ${won ? "bg-[#2f9d4f]" : "bg-[#e23b4e]"}`}>
                {won ? "Você venceu!" : "Você perdeu"}
              </div>
              <div className="mt-3 text-[14.5px] leading-[1.4] text-[#cdd7e3]">
                {won
                  ? "Você desmascarou todos os impostores."
                  : <>Você verificou <b className="text-[#ef5b6b]">{state.found.length}/{total}</b> corretos antes de cair num impostor.</>}
              </div>
            </>
          )}
        </div>

        {puzzle.options.map((o, i) => (
          <Tile
            key={o.id}
            option={o}
            pos={positions[i]}
            state={tileState(o)}
            locked={result}
            onClick={() => { if (!result) setSelectedId((cur) => (cur === o.id ? null : o.id)); }}
          />
        ))}
      </Pitch>

      {!result ? (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            onClick={verify}
            disabled={!selectedId}
            className="rounded-xl bg-cs-gold px-9 py-2.5 font-display text-[18px] font-bold text-[#3a2402] shadow-[0_4px_0_#b6831f] transition enabled:hover:-translate-y-px enabled:hover:bg-cs-goldBright active:translate-y-0.5 active:shadow-[0_2px_0_#b6831f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Verificar
          </button>
          <span className="text-[13px] font-semibold text-cs-muted">{state.found.length}/{total} corretos</span>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 text-center">
          <div className="text-[16px] text-[#cdd7e3]">
            A categoria de hoje era: <span className="font-bold text-cs-blue">{puzzle.title}</span>
          </div>
          <div className="text-[15px] text-cs-muted">Volte amanhã para um novo desafio!</div>
          {!won && !revealed && (
            <button
              onClick={() => setRevealed(true)}
              className="rounded-xl border-2 border-cs-blue bg-cs-blue/10 px-5 py-2 font-display text-[15px] font-bold text-[#9fcdf0] transition hover:bg-cs-blue/20"
            >
              Revelar jogadores corretos
            </button>
          )}
        </div>
      )}

      {panel !== "none" && (
        <Overlay onClose={() => setPanel("none")}>
          {panel === "help" ? (
            <>
              <h2 className="font-display text-lg font-bold">Como jogar</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cs-txt/90">
                <li>Selecione um item e clique em <b>Verificar</b>.</li>
                <li>Acertou um <b>correto</b> → ele trava em verde; continue.</li>
                <li>Verificou um <b>impostor</b> → fim de jogo. Sem segunda chance.</li>
                <li>Vença desmascarando todos os corretos.</li>
                <li>Novo desafio todo dia à meia-noite (UTC).</li>
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
    </Shell>
  );
}

type TileState = "idle" | "selected" | "win-correct" | "lose-impostor" | "miss";

function Tile({ option, pos, state, locked, onClick }: {
  option: ImpostorOption; pos: { x: number; y: number }; state: TileState; locked: boolean; onClick: () => void;
}) {
  const frameTone =
    state === "selected" || state === "win-correct" ? "border-cs-green shadow-[0_0_18px_rgba(79,174,84,0.55)]"
      : state === "lose-impostor" ? "border-cs-red shadow-[0_0_16px_rgba(207,83,64,0.45)]"
      : state === "miss" ? "border-[#3a4658]"
      : "border-[#2fbdee]/50";
  const overlay =
    state === "selected" || state === "win-correct" ? "bg-cs-green/[0.33]"
      : state === "lose-impostor" ? "bg-cs-red/[0.42]"
      : "bg-transparent";
  const hover = state === "idle" && !locked
    ? "group-hover:border-cs-gold group-hover:shadow-[0_0_18px_rgba(224,169,60,0.4)] group-hover:-translate-y-0.5"
    : "";

  return (
    <button
      onClick={onClick}
      disabled={locked}
      className="group absolute z-[8] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center disabled:cursor-default"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className={`relative h-[92px] w-[92px] overflow-hidden rounded-2xl border-2 bg-cs-surface2 transition ${frameTone} ${hover} ${state === "miss" ? "opacity-80" : ""}`}>
        <EntityImage option={option} />
        <div className={`pointer-events-none absolute inset-0 transition ${overlay}`} />
      </div>
      <Badge state={state} />
      <span className={`relative z-[4] -mt-[9px] whitespace-nowrap rounded-lg px-2.5 py-[3px] font-display text-[12.5px] font-bold tracking-[0.04em] shadow-[0_2px_7px_rgba(0,0,0,0.45)] transition ${state === "idle" && !locked ? "bg-[#2fbdee] text-[#08222e] group-hover:bg-cs-goldBright group-hover:text-[#23170a]" : "bg-[#2fbdee] text-[#08222e]"}`}>
        {labelFor(option)}
      </span>
    </button>
  );
}

function labelFor(o: ImpostorOption): string {
  return o.kind === "team" ? teamName(o.id) : o.id;
}

function EntityImage({ option }: { option: ImpostorOption }) {
  if (option.kind === "team") {
    const logo = teamLogo(option.id);
    return (
      <span className="flex h-full w-full items-center justify-center p-2.5">
        {logo /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={logo} alt={option.id} className="max-h-full max-w-full object-contain" />
          : <Initials text={option.id} />}
      </span>
    );
  }
  const p = getPlayer(option.id);
  if (p?.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.photo} alt={option.id} className="h-full w-full object-cover" />;
  }
  return <Initials text={p?.id ?? option.id} />;
}

function Initials({ text }: { text: string }) {
  return (
    <span className="flex h-full w-full items-center justify-center bg-[#0c1118] font-display text-2xl font-bold text-cs-muted">
      {text.slice(0, 2).toUpperCase()}
    </span>
  );
}

function Badge({ state }: { state: TileState }) {
  if (state === "selected" || state === "win-correct") {
    return (
      <span className="absolute -right-2 -top-2 z-[6] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#0b0f15] bg-[#2f9d4f] shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </span>
    );
  }
  if (state === "lose-impostor" || state === "miss") {
    return (
      <span className="absolute -right-2 -top-2 z-[6] flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-[#0b0f15] bg-[#f3ead4] font-display text-[15px] font-extrabold text-[#23170a] shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
        ✕
      </span>
    );
  }
  return null;
}

/** "Formação" 600×580 que escala pra caber na largura disponível. */
function Pitch({ children }: { children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / PITCH_W));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={frameRef} className="relative mx-auto w-full max-w-[600px]" style={{ height: PITCH_H * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: PITCH_W, height: PITCH_H, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function Shell({ children, score, onHelp, onStats }: {
  children: React.ReactNode;
  score?: { w: number; l: number } | null;
  onHelp?: () => void; onStats?: () => void;
}) {
  return (
    <div className="relative z-[1] min-h-screen">
      <SiteHeader
        left={
          <>
            <Link href="/" aria-label="Voltar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cs-txt transition hover:bg-white/5 hover:text-cs-gold">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </Link>
            {score && (
              <span className="flex items-center gap-1.5 rounded-full border-2 border-[#2a3646] px-3 py-0.5 font-display text-[17px] font-extrabold">
                <span className="text-cs-green">{score.w}</span>
                <span className="text-cs-muted">–</span>
                <span className="text-cs-red">{score.l}</span>
              </span>
            )}
          </>
        }
        right={onHelp && (
          <>
            <IconButton aria-label="Como jogar" onClick={onHelp}>?</IconButton>
            <IconButton aria-label="Estatísticas" onClick={onStats}>▦</IconButton>
          </>
        )}
      />
      <main className="mx-auto max-w-[640px] px-4 pb-24 pt-7">{children}</main>
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
