import { describe, it, expect } from "vitest";
import { getDailyKey, getPuzzleNumber, getDailySeed, mulberry32 } from "@/lib/daily";

describe("daily", () => {
  it("chave do dia é UTC e vira à meia-noite UTC", () => {
    expect(getDailyKey(new Date("2026-07-01T23:59:59Z"))).toBe("2026-07-01");
    expect(getDailyKey(new Date("2026-07-02T00:00:00Z"))).toBe("2026-07-02");
  });

  it("número do puzzle conta dias desde o lançamento", () => {
    expect(getPuzzleNumber(new Date("2026-07-01T12:00:00Z"))).toBe(1);
    expect(getPuzzleNumber(new Date("2026-07-11T12:00:00Z"))).toBe(11);
  });

  it("semente é determinística por jogo+dia e difere entre dias", () => {
    expect(getDailySeed("grid", "2026-07-01")).toBe(getDailySeed("grid", "2026-07-01"));
    expect(getDailySeed("grid", "2026-07-01")).not.toBe(getDailySeed("grid", "2026-07-02"));
    expect(getDailySeed("grid", "2026-07-01")).not.toBe(getDailySeed("top10", "2026-07-01"));
  });

  it("mulberry32 é determinístico para a mesma semente", () => {
    const a = mulberry32(123), b = mulberry32(123);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
