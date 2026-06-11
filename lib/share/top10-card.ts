import { getPlayer, teamName } from "@/lib/data/players";
import type { Top10Puzzle } from "@/lib/top10/schedule";

export type Top10CardSlot = {
  /** Nome exibido no slot resolvido (nick do jogador ou nome do time). */
  label: string;
  /** Código do país (dica), ou null para times / jogadores sem país. */
  flag: string | null;
  solved: boolean;
};

export type Top10CardData = {
  puzzle: number; // número do puzzle (#23)
  theme: string; // título do tema
  correct: number; // acertos
  total: number; // total (10)
  slots: Top10CardSlot[]; // ordem por rank 1..N
};

/** Monta os dados do card de compartilhamento a partir do puzzle e dos acertos. */
export function buildTop10CardData(puzzle: Top10Puzzle, found: string[], puzzleNumber: number): Top10CardData {
  return {
    puzzle: puzzleNumber,
    theme: puzzle.title,
    correct: found.length,
    total: puzzle.answers.length,
    slots: puzzle.answers.map((a) => ({
      label: a.kind === "player" ? a.id : teamName(a.id),
      flag: a.kind === "player" ? getPlayer(a.id)?.countryCode ?? null : null,
      solved: found.includes(a.id),
    })),
  };
}
