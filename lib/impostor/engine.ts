// Lógica pura do jogo Impostor (sem React) — fácil de testar.
//
// Mecânica: o jogador seleciona 1 tile por vez e clica "Verificar". Verificar um
// correto trava o tile (verde) e avança; verificar um impostor encerra (derrota,
// morte súbita). Vitória quando todos os corretos foram verificados.
import type { ImpostorOption, ImpostorPuzzle } from "./schedule";

export type ImpostorPhase = "playing" | "won" | "lost";

export type ImpostorState = {
  found: string[];        // ids verificados como corretos
  lostId: string | null;  // id do impostor que encerrou o jogo (se perdeu)
  phase: ImpostorPhase;
};

export const initialState: ImpostorState = { found: [], lostId: null, phase: "playing" };

export function optionById(puzzle: ImpostorPuzzle, id: string): ImpostorOption | undefined {
  return puzzle.options.find((o) => o.id === id);
}

export function correctIds(puzzle: ImpostorPuzzle): string[] {
  return puzzle.options.filter((o) => o.correct).map((o) => o.id);
}

/** Aplica uma verificação. Idempotente fora de "playing"; ignora id inválido/repetido. */
export function applyVerify(puzzle: ImpostorPuzzle, state: ImpostorState, id: string): ImpostorState {
  if (state.phase !== "playing") return state;
  const opt = optionById(puzzle, id);
  if (!opt || state.found.includes(id)) return state;
  if (!opt.correct) {
    return { ...state, phase: "lost", lostId: id };
  }
  const found = [...state.found, id];
  const won = correctIds(puzzle).every((c) => found.includes(c));
  return { found, lostId: null, phase: won ? "won" : "playing" };
}
