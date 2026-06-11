"use client";

import { useEffect, useState } from "react";
import { getTrustedNow, getPuzzleNumber } from "@/lib/daily";

/**
 * Número do puzzle do dia, calculado a partir de uma fonte de data confiável
 * (header HTTP), não do relógio local. Retorna `null` enquanto resolve.
 */
export function usePuzzleNumber(): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    getTrustedNow().then((d) => {
      if (alive) setN(getPuzzleNumber(d));
    });
    return () => {
      alive = false;
    };
  }, []);
  return n;
}
