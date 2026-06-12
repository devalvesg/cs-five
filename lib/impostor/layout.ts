// Posições dos tiles numa "formação" (plano 600×580, coords do CENTRO de cada
// tile). O centro (~300,300) é reservado p/ a caixa da categoria, então as
// posições da faixa central ficam só nos extremos. Layout por contagem (8–10).

export const PITCH_W = 600;
export const PITCH_H = 580;

export type Pos = { x: number; y: number };

const LAYOUTS: Record<number, Pos[]> = {
  8: [
    { x: 215, y: 90 }, { x: 385, y: 90 },
    { x: 96, y: 250 }, { x: 504, y: 250 },
    { x: 96, y: 375 }, { x: 504, y: 375 },
    { x: 215, y: 535 }, { x: 385, y: 535 },
  ],
  9: [
    { x: 300, y: 72 },
    { x: 110, y: 175 }, { x: 490, y: 175 },
    { x: 80, y: 312 }, { x: 520, y: 312 },
    { x: 110, y: 448 }, { x: 490, y: 448 },
    { x: 230, y: 545 }, { x: 370, y: 545 },
  ],
  10: [
    { x: 215, y: 78 }, { x: 385, y: 78 },
    { x: 150, y: 198 }, { x: 450, y: 198 },
    { x: 96, y: 312 }, { x: 504, y: 312 },
    { x: 150, y: 430 }, { x: 450, y: 430 },
    { x: 215, y: 545 }, { x: 385, y: 545 },
  ],
};

/** Posições p/ N tiles (cai no layout mais próximo disponível, 8–10). */
export function positionsFor(count: number): Pos[] {
  const n = Math.max(8, Math.min(10, count));
  const layout = LAYOUTS[n] ?? LAYOUTS[10];
  return layout.slice(0, count);
}
