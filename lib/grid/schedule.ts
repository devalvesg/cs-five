import scheduleData from "@/public/data/grid-schedule.json";
import type { GridPuzzle } from "@/lib/grid/generator";

/** Lista pré-assada de grids válidos únicos (ver scripts/build-schedule.mjs). */
export const gridSchedule = scheduleData as GridPuzzle[];

/**
 * Grid do dia: indexa a schedule pelo número do puzzle. Quando os grids
 * acabam, recomeça (com defasagem) — mas a janela cresce ao reassar a
 * schedule com um dataset maior. Retorna null se a schedule estiver vazia.
 */
export function getGridForPuzzle(puzzleNumber: number): GridPuzzle | null {
  if (gridSchedule.length === 0) return null;
  const idx = ((puzzleNumber - 1) % gridSchedule.length + gridSchedule.length) % gridSchedule.length;
  return gridSchedule[idx];
}
