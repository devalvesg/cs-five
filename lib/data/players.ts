import playersData from "@/public/data/players.json";
import teamsData from "@/public/data/teams.json";

export type Player = {
  id: string;
  realName?: string;
  country?: string;
  countryCode: string | null;
  roles: string[];
  status?: string;
  csgo: boolean;
  cs2: boolean;
  teamsNotable: string[];
  teamOrgsRaw: string[];
  photo?: string; // URL/caminho da foto (opcional; cai p/ nome se ausente)
};
export type Team = { abbr: string; name: string; logo?: string };

export const players = playersData as Player[];
export const teams = teamsData as Team[];

const teamByAbbr = new Map(teams.map((t) => [t.abbr, t]));
const playerById = new Map(players.map((p) => [p.id, p]));

export const teamName = (abbr: string): string => teamByAbbr.get(abbr)?.name ?? abbr;
export const teamLogo = (abbr: string): string | undefined => teamByAbbr.get(abbr)?.logo;
export const getPlayer = (id: string): Player | undefined => playerById.get(id);

export const COUNTRIES: Record<string, { name: string; flag: string }> = {
  DK: { name: "Dinamarca", flag: "🇩🇰" }, SE: { name: "Suécia", flag: "🇸🇪" },
  UA: { name: "Ucrânia", flag: "🇺🇦" }, RU: { name: "Rússia", flag: "🇷🇺" },
  FR: { name: "França", flag: "🇫🇷" }, BR: { name: "Brasil", flag: "🇧🇷" },
  US: { name: "EUA", flag: "🇺🇸" }, CA: { name: "Canadá", flag: "🇨🇦" },
  PL: { name: "Polônia", flag: "🇵🇱" }, FI: { name: "Finlândia", flag: "🇫🇮" },
  NO: { name: "Noruega", flag: "🇳🇴" }, EE: { name: "Estônia", flag: "🇪🇪" },
  BA: { name: "Bósnia", flag: "🇧🇦" }, SK: { name: "Eslováquia", flag: "🇸🇰" },
  DE: { name: "Alemanha", flag: "🇩🇪" }, TR: { name: "Turquia", flag: "🇹🇷" },
  IL: { name: "Israel", flag: "🇮🇱" }, KZ: { name: "Cazaquistão", flag: "🇰🇿" },
  AU: { name: "Austrália", flag: "🇦🇺" }, GB: { name: "Reino Unido", flag: "🇬🇧" },
  BE: { name: "Bélgica", flag: "🇧🇪" }, LV: { name: "Letônia", flag: "🇱🇻" },
  RS: { name: "Sérvia", flag: "🇷🇸" }, LT: { name: "Lituânia", flag: "🇱🇹" },
  CZ: { name: "Tchéquia", flag: "🇨🇿" }, NL: { name: "Holanda", flag: "🇳🇱" },
  HU: { name: "Hungria", flag: "🇭🇺" }, GT: { name: "Guatemala", flag: "🇬🇹" },
  BG: { name: "Bulgária", flag: "🇧🇬" }, ID: { name: "Indonésia", flag: "🇮🇩" },
  MN: { name: "Mongólia", flag: "🇲🇳" }, CN: { name: "China", flag: "🇨🇳" },
};
export const countryLabel = (code: string): string => COUNTRIES[code]?.name ?? code;
export const countryFlag = (code: string): string => COUNTRIES[code]?.flag ?? "🏳️";
/** Caminho do PNG da bandeira (baixado em public/flags via scripts/fetch-assets.mjs). */
export const flagSrc = (code: string): string => `/flags/${code}.png`;

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** Achata leetspeak (m0NESY→monesy, s1mple→simple) p/ casar a busca fonética. */
const deleet = (s: string) =>
  norm(s).replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a")
    .replace(/5/g, "s").replace(/7/g, "t").replace(/[$]/g, "s").replace(/@/g, "a");

/** Busca client-side por nick (id) ou nome real; prefixo > substring, com fallback leetspeak. */
export function searchPlayers(query: string, limit = 8): Player[] {
  const n = norm(query.trim());
  if (!n) return [];
  const nl = deleet(query.trim());
  const scored: Array<{ p: Player; s: number }> = [];
  for (const p of players) {
    const id = norm(p.id);
    const idl = deleet(p.id);
    const rn = norm(p.realName ?? "");
    let s = -1;
    if (id.startsWith(n)) s = 0;
    else if (idl.startsWith(nl)) s = 1;       // ex.: "monesy" → "m0nesy"
    else if (id.includes(n)) s = 2;
    else if (idl.includes(nl)) s = 3;
    else if (rn.includes(n)) s = 4;
    if (s >= 0) scored.push({ p, s });
  }
  scored.sort((a, b) => a.s - b.s || a.p.id.length - b.p.id.length);
  return scored.slice(0, limit).map((x) => x.p);
}

/** Busca client-side de times por nome ou sigla; prefixo > substring. */
export function searchTeams(query: string, limit = 8): Team[] {
  const n = norm(query.trim());
  if (!n) return [];
  const scored: Array<{ t: Team; s: number }> = [];
  for (const t of teams) {
    const abbr = norm(t.abbr);
    const name = norm(t.name);
    let s = -1;
    if (abbr.startsWith(n) || name.startsWith(n)) s = 0;
    else if (abbr.includes(n) || name.includes(n)) s = 1;
    if (s >= 0) scored.push({ t, s });
  }
  scored.sort((a, b) => a.s - b.s || a.t.name.length - b.t.name.length);
  return scored.slice(0, limit).map((x) => x.t);
}
