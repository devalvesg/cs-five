import { type Top10Answer, type Top10Puzzle } from "./schedule";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
/** Achata leetspeak (m0NESY→monesy) p/ casar palpite fonético, como na busca do Grid. */
const deleet = (s: string) =>
  norm(s).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a")
    .replace(/5/g, "s").replace(/7/g, "t").replace(/[$]/g, "s").replace(/@/g, "a");

/** Casa um palpite com uma das respostas (por nome/abbr/realName, sem acento e com leetspeak). */
export function matchGuess(puzzle: Top10Puzzle, guess: string): Top10Answer | null {
  const g = norm(guess), gl = deleet(guess);
  if (!g) return null;
  for (const a of puzzle.answers) {
    for (const alias of a.aliases) {
      if (norm(alias) === g || deleet(alias) === gl) return a;
    }
  }
  return null;
}
