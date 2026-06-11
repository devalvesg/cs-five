import { getPuzzleNumber } from "@/lib/daily";

/** Monta o texto de compartilhamento com a grade de emojis. */
export function buildGridShare(cells: Record<string, string>): string {
  const n = getPuzzleNumber();
  const lines: string[] = [];
  let filled = 0;
  for (let r = 0; r < 3; r++) {
    let line = "";
    for (let c = 0; c < 3; c++) {
      const ok = !!cells[`${r}-${c}`];
      if (ok) filled++;
      line += ok ? "🟩" : "⬛";
    }
    lines.push(line);
  }
  return [
    `cs-5 Grid #${n}`,
    ...lines,
    `${filled}/9`,
    "csfive.gg",
  ].join("\n");
}
