// Persistência de estado e estatísticas do Top 10 em localStorage (single-player).

import { getDailyKey } from "@/lib/daily";

export type Top10Stats = {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  lastWinKey: string | null;
};

export type Top10Saved = {
  found: string[]; // ids das entradas já encontradas
  status: "playing" | "won" | "gaveup";
};

const STATS_KEY = "cs5:top10:stats";
const gameKey = (dayKey: string) => `cs5:top10:${dayKey}`;

const defaultStats = (): Top10Stats => ({
  played: 0, wins: 0, currentStreak: 0, maxStreak: 0, lastWinKey: null,
});

function isYesterday(prev: string, today: string): boolean {
  const p = new Date(prev + "T00:00:00Z").getTime();
  const t = new Date(today + "T00:00:00Z").getTime();
  return t - p === 86_400_000;
}

export function loadStats(): Top10Stats {
  if (typeof localStorage === "undefined") return defaultStats();
  try { return { ...defaultStats(), ...JSON.parse(localStorage.getItem(STATS_KEY) || "{}") }; }
  catch { return defaultStats(); }
}

export function loadGame(dayKey: string = getDailyKey()): Top10Saved | null {
  if (typeof localStorage === "undefined") return null;
  try { const raw = localStorage.getItem(gameKey(dayKey)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function saveGame(game: Top10Saved, dayKey: string = getDailyKey()): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(gameKey(dayKey), JSON.stringify(game));
}

/** Registra o resultado do dia nas estatísticas (uma vez por dia). */
export function recordResult(won: boolean, dayKey: string = getDailyKey()): Top10Stats {
  const s = loadStats();
  if (s.lastWinKey === dayKey) return s;
  s.played += 1;
  if (won) {
    s.currentStreak = s.lastWinKey && isYesterday(s.lastWinKey, dayKey) ? s.currentStreak + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak, s.currentStreak);
    s.wins += 1;
    s.lastWinKey = dayKey;
  } else {
    s.currentStreak = 0;
  }
  if (typeof localStorage !== "undefined") localStorage.setItem(STATS_KEY, JSON.stringify(s));
  return s;
}
