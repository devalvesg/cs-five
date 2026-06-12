import { describe, it, expect } from "vitest";
// @ts-expect-error — helper .mjs sem tipos
import { stabilize } from "../scripts/stable-merge.mjs";

const id = (x: { id: string }) => x.id;
const ids = (arr: { id: string }[]) => arr.map(id).join(",");

describe("stabilize (schedule estável entre rebuilds)", () => {
  it("preserva a ordem das entradas existentes e anexa as novas no fim", () => {
    const existing = [{ id: "A" }, { id: "B" }, { id: "C" }];
    const candidates = [{ id: "C" }, { id: "X" }, { id: "A" }, { id: "B" }, { id: "Y" }];
    expect(ids(stabilize(existing, candidates, id))).toBe("A,B,C,X,Y");
  });

  it("substitui no lugar uma entrada que ficou inválida (sem deslocar as outras)", () => {
    const existing = [{ id: "A" }, { id: "B" }, { id: "C" }];
    const candidates = [{ id: "C" }, { id: "A" }, { id: "X" }]; // B sumiu
    expect(ids(stabilize(existing, candidates, id))).toBe("A,X,C");
  });

  it("primeira vez (existing vazio) = ordem canônica dos candidatos", () => {
    expect(ids(stabilize([], [{ id: "X" }, { id: "Y" }], id))).toBe("X,Y");
  });

  it("refresca o CONTEÚDO mantendo o slot (mesmo id, dado atual)", () => {
    const existing = [{ id: "A", v: 1 }];
    const candidates = [{ id: "A", v: 2 }];
    const out = stabilize(existing, candidates, id) as { id: string; v: number }[];
    expect(out[0].v).toBe(2); // conteúdo atualizado, mesma posição
  });

  it("é idempotente quando os candidatos == existentes", () => {
    const a = [{ id: "A" }, { id: "B" }, { id: "C" }];
    expect(ids(stabilize(a, [...a], id))).toBe("A,B,C");
  });
});
