// Núcleo "daily": tudo determinístico por data UTC, igual para todos os jogadores.

const MS_PER_DAY = 86_400_000;
const LAUNCH_UTC = Date.UTC(2026, 6, 1); // 2026-07-01 (mês é 0-based)

/** Chave do dia em UTC (YYYY-MM-DD). O dia vira à meia-noite UTC. */
export function getDailyKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Número do puzzle = dias desde o lançamento (#1 no dia do lançamento). */
export function getPuzzleNumber(d: Date = new Date()): number {
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.floor((today - LAUNCH_UTC) / MS_PER_DAY) + 1;
}

/**
 * Data atual de uma fonte confiável (header HTTP `Date` da própria origem),
 * pra não confiar no relógio do PC — que o usuário poderia adiantar/atrasar
 * pra trocar o puzzle do dia. Cai pro relógio local se offline ou sem header.
 */
export async function getTrustedNow(): Promise<Date> {
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(window.location.origin, { method: "HEAD", cache: "no-store" });
      const header = res.headers.get("date");
      if (header) {
        const d = new Date(header);
        if (!Number.isNaN(d.getTime())) return d;
      }
    } catch {
      // offline / bloqueado → fallback abaixo
    }
  }
  return new Date();
}

/** Hash FNV-1a → uint32. */
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Semente determinística por jogo + dia. */
export function getDailySeed(gameId: string, key: string = getDailyKey()): number {
  return hashStr(`${gameId}:${key}`);
}

/** PRNG mulberry32: determinístico a partir de uma semente uint32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
