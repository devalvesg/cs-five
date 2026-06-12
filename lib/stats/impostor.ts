// Persistência de estado e estatísticas do Impostor em localStorage (single-player).
import { getDailyKey } from "@/lib/daily";
import type { ImpostorState } from "@/lib/impostor/engine";

export type ImpostorStats = {
  played: number;
  wins: number;        // derrotas = played - wins
  currentStreak: number;
  maxStreak: number;
  lastResultKey: string | null; // dia já contabilizado (evita dupla contagem)
  lastWinKey: string | null;    // último dia vencido (p/ streak)
};

export type ImpostorSaved = Pick<ImpostorState, "found" | "lostId" | "phase">;

const STATS_KEY = "cs5:impostor:stats";
const gameKey = (dayKey: string) => `cs5:impostor:${dayKey}`;

const defaultStats = (): ImpostorStats => ({
  played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastResultKey: null, lastWinKey: null,
});

function isYesterday(prev: string, today: string): boolean {
  const p = new Date(prev + "T00:00:00Z").getTime();
  const t = new Date(today + "T00:00:00Z").getTime();
  return t - p === 86_400_000;
}

export function loadStats(): ImpostorStats {
  if (typeof localStorage === "undefined") return defaultStats();
  try { return { ...defaultStats(), ...JSON.parse(localStorage.getItem(STATS_KEY) || "{}") }; }
  catch { return defaultStats(); }
}

export function loadGame(dayKey: string = getDailyKey()): ImpostorSaved | null {
  if (typeof localStorage === "undefined") return null;
  try { const raw = localStorage.getItem(gameKey(dayKey)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function saveGame(game: ImpostorSaved, dayKey: string = getDailyKey()): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(gameKey(dayKey), JSON.stringify(game));
}

/** Registra o resultado do dia (vitória ou derrota), uma vez por dia. */
export function recordResult(won: boolean, dayKey: string = getDailyKey()): ImpostorStats {
  const s = loadStats();
  if (s.lastResultKey === dayKey) return s;
  const prevWin = s.lastWinKey;
  s.played += 1;
  s.lastResultKey = dayKey;
  if (won) {
    s.currentStreak = prevWin && isYesterday(prevWin, dayKey) ? s.currentStreak + 1 : 1;
    s.wins += 1;
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
    s.lastWinKey = dayKey;
  } else {
    s.currentStreak = 0;
  }
  if (typeof localStorage !== "undefined") localStorage.setItem(STATS_KEY, JSON.stringify(s));
  return s;
}
