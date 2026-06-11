import scheduleData from "@/public/data/top10-schedule.json";

export type Top10Answer = {
  rank: number;
  kind: "team" | "player";
  id: string;
  value: number;
  aliases: string[];
};
export type Top10Puzzle = {
  id: string;
  title: string;
  entityKind: "team" | "player";
  answers: Top10Answer[];
};

export const themes = scheduleData as Top10Puzzle[];

/** Tema do dia, determinístico pelo número do puzzle (cicla a lista). */
export function getTop10ForPuzzle(n: number): Top10Puzzle | null {
  if (!themes.length) return null;
  return themes[((n % themes.length) + themes.length) % themes.length];
}
