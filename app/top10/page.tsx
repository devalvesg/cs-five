"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getTop10ForPuzzle, type Top10Answer, type Top10Puzzle } from "@/lib/top10/schedule";
import { matchGuess } from "@/lib/top10/match";
import { getPuzzleNumber } from "@/lib/daily";
import { loadGame, saveGame, recordResult, loadStats, type Top10Stats } from "@/lib/stats/top10";
import { teamLogo, teamName, getPlayer, flagSrc, countryLabel, type Player } from "@/lib/data/players";
import SiteHeader, { IconButton } from "@/components/SiteHeader";
import { Wordmark } from "@/components/Brand";

type Flash = "hit" | "miss" | "dupe" | null;

export default function Top10Page() {
  const puzzle = useMemo<Top10Puzzle | null>(() => getTop10ForPuzzle(getPuzzleNumber()), []);
  const [found, setFound] = useState<string[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "gaveup">("playing");
  const [val, setVal] = useState("");
  const [flash, setFlash] = useState<Flash>(null);
  const [stats, setStats] = useState<Top10Stats | null>(null);
  const [panel, setPanel] = useState<"none" | "help" | "stats">("none");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = loadGame();
    if (saved) { setFound(saved.found); setStatus(saved.status); }
    setStats(loadStats());
  }, []);
  useEffect(() => {
    if (status === "playing" && found.length === 0) return;
    saveGame({ found, status });
  }, [found, status]);

  if (!puzzle) {
    return (
      <Shell>
        <p className="text-center text-cs-muted">Sem temas. Rode <code>npm run build:top10</code>.</p>
      </Shell>
    );
  }

  function doFlash(k: Flash) { setFlash(k); setTimeout(() => setFlash(null), 600); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "playing") return;
    const ans = matchGuess(puzzle!, val);
    if (!ans) { doFlash("miss"); return; }
    if (found.includes(ans.id)) { doFlash("dupe"); setVal(""); return; }
    const next = [...found, ans.id];
    setFound(next); setVal(""); doFlash("hit");
    if (next.length === puzzle!.answers.length) { setStatus("won"); setStats(recordResult(true)); }
  }
  function giveUp() {
    if (status !== "playing") return;
    setStatus("gaveup"); setStats(recordResult(false));
  }
  async function share() {
    const lines = puzzle!.answers.map((a) => (found.includes(a.id) ? "🟩" : "⬛")).join("");
    const txt = `CS-FIVE Top 10 #${getPuzzleNumber()}\n${puzzle!.title}\n${lines} ${found.length}/10`;
    try { await navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  }

  const done = status === "won";

  return (
    <Shell
      onHelp={() => setPanel("help")}
      onStats={() => setPanel("stats")}
    >
      <h1 className="mb-1 mt-1.5 text-center font-display text-[32px] font-extrabold tracking-[0.02em]">
        <Wordmark size={32} /> <span className="text-cs-txt">TOP </span><span className="text-cs-gold">10</span>{" "}
        <span className="align-middle text-base font-bold text-cs-muted">#{getPuzzleNumber()}</span>
      </h1>
      <p className="mx-auto mb-7 max-w-[560px] text-center text-[15px] font-semibold text-cs-txt">{puzzle.title}</p>

      <div className="mx-auto flex max-w-[440px] flex-col gap-2">
        {puzzle.answers.map((a) => {
          const revealed = found.includes(a.id) || status !== "playing";
          const got = found.includes(a.id);
          return (
            <div
              key={a.id}
              className={[
                "flex h-[52px] items-center gap-3 rounded-3xl border px-4 transition",
                got ? "border-cs-gold bg-cs-gold/[0.08]"
                  : revealed ? "border-cs-line bg-white/[0.02] opacity-70"
                  : "border-cs-blue/70 bg-cs-blue/[0.04]",
              ].join(" ")}
            >
              <span className={`w-7 font-display text-base font-bold ${got ? "text-cs-gold" : "text-cs-muted"}`}>{a.rank}.</span>
              <span className="flex flex-1 items-center">
                {revealed ? <Entity answer={a} muted={!got} /> : <span className="block h-[18px]" />}
              </span>
            </div>
          );
        })}
      </div>

      {status === "playing" ? (
        <form onSubmit={submit} className="mx-auto mt-8 flex max-w-[440px] flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <input
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
            placeholder={puzzle.entityKind === "team" ? "Digite o time aqui" : "Digite o jogador aqui"}
            className={[
              "h-[46px] w-full rounded-full border-2 bg-[#c9d2dc] px-[18px] text-[16px] font-semibold text-[#1a2230] outline-none transition placeholder:text-[#5b6573] sm:w-[300px]",
              flash === "miss" ? "border-cs-red shadow-[0_0_0_3px_rgba(207,83,64,.4)] animate-cs-shake"
                : flash === "hit" ? "border-cs-green shadow-[0_0_0_3px_rgba(79,174,84,.4)]"
                : flash === "dupe" ? "border-cs-blue shadow-[0_0_0_3px_rgba(74,159,224,.4)]"
                : "border-[#8b97a6] focus:border-cs-gold focus:shadow-[0_0_0_3px_rgba(224,169,60,0.25)]",
            ].join(" ")}
          />
          <button type="button" onClick={giveUp} className="h-[46px] shrink-0 rounded-full border-2 border-cs-red px-5 font-display text-[15px] font-bold italic text-cs-red transition hover:bg-cs-red hover:text-white">
            Desistir
          </button>
        </form>
      ) : (
        <div className="mx-auto mt-8 flex max-w-[440px] flex-col items-center gap-1.5">
          <span className={`font-display text-xl font-bold ${done ? "text-cs-green" : "text-cs-red"}`}>
            {done ? "Você acertou todos os 10! 🏆" : "Você desistiu."}
          </span>
          <span className="text-[15px] font-bold text-cs-muted">{found.length}/10</span>
          <button onClick={share} className="mt-3 rounded-full bg-cs-gold px-5 py-2 font-display font-bold text-cs-ink transition hover:bg-cs-goldBright">
            {copied ? "Copiado!" : "Compartilhar"}
          </button>
        </div>
      )}

      {panel !== "none" && (
        <Overlay onClose={() => setPanel("none")}>
          {panel === "help" ? (
            <>
              <h2 className="font-display text-lg font-bold">Como jogar</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cs-txt/90">
                <li>Adivinhe as <b>10 entradas</b> da lista do tema, em qualquer ordem.</li>
                <li>Digite um nome; se estiver na lista, ele acende no rank correto.</li>
                <li>Sem limite de tentativas. <b>Desistir</b> revela as respostas.</li>
                <li>Novo tema todo dia à meia-noite (UTC).</li>
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

/** Render de uma entrada revelada: time (logo+nome) ou jogador (foto+nome+bandeira). */
function Entity({ answer, muted }: { answer: Top10Answer; muted: boolean }) {
  const nameCls = `font-display text-[16px] font-bold tracking-[0.02em] ${muted ? "text-cs-muted" : "text-cs-txt"}`;
  if (answer.kind === "team") {
    const logo = teamLogo(answer.id);
    return (
      <span className="flex items-center gap-3">
        {logo /* eslint-disable-next-line @next/next/no-img-element */ && <img src={logo} alt={answer.id} className="h-7 w-7 object-contain" />}
        <span className={nameCls}>{teamName(answer.id)}</span>
      </span>
    );
  }
  const p = getPlayer(answer.id);
  return (
    <span className="flex items-center gap-3">
      <PlayerAvatar player={p} />
      <span className={nameCls}>{answer.id}</span>
      {p?.countryCode /* eslint-disable-next-line @next/next/no-img-element */ && (
        <img src={flagSrc(p.countryCode)} alt={countryLabel(p.countryCode)} className="h-4 w-6 rounded-sm object-cover" />
      )}
    </span>
  );
}

function PlayerAvatar({ player }: { player?: Player }) {
  if (player?.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.photo} alt={player.id} className="h-7 w-7 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cs-surface text-[10px] font-bold text-cs-muted">
      {(player?.id ?? "?").slice(0, 2).toUpperCase()}
    </span>
  );
}

function Shell({ children, onHelp, onStats }: { children: React.ReactNode; onHelp?: () => void; onStats?: () => void }) {
  return (
    <div className="relative z-[1] min-h-screen">
      <SiteHeader
        left={
          <Link href="/" aria-label="Voltar" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-cs-txt transition hover:bg-white/5 hover:text-cs-gold">
            <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
        }
        right={onHelp && (
          <>
            <IconButton aria-label="Como jogar" onClick={onHelp}>?</IconButton>
            <IconButton aria-label="Estatísticas" onClick={onStats}>▦</IconButton>
          </>
        )}
      />
      <main className="mx-auto max-w-[920px] px-4 pb-24 pt-7">{children}</main>
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
