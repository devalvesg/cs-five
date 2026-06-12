import scheduleData from "@/public/data/impostor-schedule.json";

export type ImpostorOption = {
  kind: "player" | "team";
  id: string;         // nick (players.json) ou abbr (teams.json)
  correct: boolean;   // satisfaz o critério do dia?
};

export type ImpostorPuzzle = {
  id: string;                 // chave única do critério (ledger de não-repetição)
  title: string;              // "Já levantou um troféu de Major"
  family: "title" | "award" | "team";
  entityKind: "player" | "team";
  options: ImpostorOption[];  // 8–10, embaralhadas, 3–6 corretas
};

export const puzzles = scheduleData as ImpostorPuzzle[];

/** Puzzle do dia, determinístico pelo número do puzzle (cicla a lista). */
export function getImpostorForPuzzle(n: number): ImpostorPuzzle | null {
  if (!puzzles.length) return null;
  return puzzles[((n % puzzles.length) + puzzles.length) % puzzles.length];
}
