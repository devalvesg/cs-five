// Constrói public/data/players.json + teams.json a partir de um roster CURADO.
//
// Por quê curado? O grid "imaculado" (toda interseção Time×País precisa ter ≥1
// jogador) exige cobertura internacional densa — vários times que rodaram
// jogadores de MUITOS países. O cenário de CS é regional, então o scraping
// página-a-página da Liquipedia (a) é bloqueado por rate-limit e (b) não traz
// diversidade suficiente. Este roster curado usa dados factuais estáveis
// (país + organizações notáveis) e torna o grid solúvel de imediato.
//
// O scraper (build-dataset.mjs) continua válido como ENRIQUECIMENTO futuro
// (realName, roles, histórico completo) via LPDB/cache, mas a verdade do MVP
// para país+times é este arquivo.
//
// Formato de cada entrada: [nick, ISO2, realName, [orgsNotáveis...]]
// "orgNotável" = organização pela qual o jogador é marcante (não toda passagem).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

// Nome de exibição das organizações (abbr -> nome completo).
const TEAM_NAMES = {
  Astralis: "Astralis", NAVI: "Natus Vincere", FaZe: "FaZe Clan", G2: "G2 Esports",
  Vitality: "Team Vitality", MOUZ: "MOUZ", Liquid: "Team Liquid", NIP: "Ninjas in Pyjamas",
  fnatic: "Fnatic", "Virtus.pro": "Virtus.pro", SK: "SK Gaming", MIBR: "MIBR",
  Luminosity: "Luminosity", Heroic: "Heroic", ENCE: "ENCE", OG: "OG", Spirit: "Team Spirit",
  Gambit: "Gambit", Cloud9: "Cloud9", EG: "Evil Geniuses", NRG: "NRG", Complexity: "Complexity",
  Falcons: "Team Falcons", BIG: "BIG", FURIA: "FURIA", Imperial: "Imperial", paiN: "paiN Gaming",
  Immortals: "Immortals", Renegades: "Renegades", "100T": "100 Thieves", TSM: "Team SoloMid",
  Dignitas: "Dignitas", HellRaisers: "HellRaisers", Titan: "Titan", EnVyUs: "Team EnVyUs",
  VeryGames: "VeryGames", North: "North", GODSENT: "GODSENT", Outsiders: "Outsiders",
  "Eternal Fire": "Eternal Fire", "Space Soldiers": "Space Soldiers", OpTic: "OpTic Gaming",
  "Gen.G": "Gen.G", iBUYPOWER: "iBUYPOWER", FlipSid3: "FlipSid3 Tactics", Apeks: "Apeks",
  GamerLegion: "GamerLegion", "MAD Lions": "MAD Lions", Sprout: "Sprout", "3DMAX": "3DMAX",
  Endpoint: "Endpoint", TheMongolz: "The Mongolz", TYLOO: "TYLOO", FlyQuest: "FlyQuest",
};

// nick, país, nome real, organizações notáveis
const ROSTER = [
  // ── Dinamarca ───────────────────────────────────────────────
  ["device", "DK", "Nicolai Reedtz", ["Astralis", "NIP", "Falcons"]],
  ["dupreeh", "DK", "Peter Rasmussen", ["Astralis", "Vitality"]],
  ["Xyp9x", "DK", "Andreas Højsleth", ["Astralis"]],
  ["gla1ve", "DK", "Lukas Rossander", ["Astralis"]],
  ["Magisk", "DK", "Emil Reif", ["Astralis", "Vitality", "Heroic"]],
  ["karrigan", "DK", "Finn Andersen", ["FaZe", "MOUZ", "Astralis", "Heroic", "Falcons"]],
  ["cadiaN", "DK", "Casper Møller", ["Heroic", "Liquid"]],
  ["blameF", "DK", "Benjamin Bremer", ["Complexity", "Astralis", "FaZe"]],
  ["stavn", "DK", "Martin Lund", ["Heroic", "Falcons"]],
  ["TeSeS", "DK", "René Madsen", ["Heroic", "BIG", "Falcons"]],
  ["jabbi", "DK", "Jakob Nygaard", ["Heroic", "Astralis", "Vitality"]],
  ["sjuush", "DK", "Rasmus Beck", ["Heroic", "BIG", "MOUZ"]],
  ["k0nfig", "DK", "Kristian Wienecke", ["Astralis", "Complexity", "North"]],
  ["Kjaerbye", "DK", "Markus Kjærbye", ["Astralis", "North", "MIBR"]],
  ["HooXi", "DK", "Philip Aistrup", ["G2", "Heroic"]],
  ["MSL", "DK", "Mathias Lauridsen", ["North", "Dignitas"]],
  ["roeJ", "DK", "Rasmus Stæhr", ["Heroic", "Dignitas"]],
  ["Bubzkji", "DK", "Lucas Andersen", ["Astralis", "MAD Lions"]],
  ["refrezh", "DK", "Nikolaj Christensen", ["Heroic", "BIG"]],
  ["Staehr", "DK", "Victor Staehr", ["Astralis", "Falcons"]],

  // ── Suécia ──────────────────────────────────────────────────
  ["f0rest", "SE", "Patrik Lindberg", ["NIP", "Dignitas"]],
  ["GeT_RiGhT", "SE", "Christopher Alesund", ["NIP", "Dignitas"]],
  ["JW", "SE", "Jesper Wecksell", ["fnatic", "NIP"]],
  ["KRIMZ", "SE", "Freddy Johansson", ["fnatic"]],
  ["flusha", "SE", "Robin Rönnquist", ["fnatic", "GODSENT"]],
  ["olofmeister", "SE", "Olof Kajbjer", ["fnatic", "FaZe"]],
  ["pronax", "SE", "Markus Wallsten", ["fnatic", "GODSENT"]],
  ["friberg", "SE", "Adam Friberg", ["NIP"]],
  ["Xizt", "SE", "Richard Landström", ["NIP", "fnatic", "Dignitas"]],
  ["dennis", "SE", "Dennis Edman", ["fnatic", "NIP"]],
  ["twist", "SE", "Simon Eliasson", ["fnatic", "NIP"]],
  ["Brollan", "SE", "Ludvig Brolin", ["fnatic", "MOUZ", "Vitality"]],
  ["REZ", "SE", "Fredrik Sterner", ["NIP"]],
  ["hampus", "SE", "Hampus Poser", ["NIP", "Falcons"]],
  ["Plopski", "SE", "Jonas Heuer Adamczyk", ["NIP", "Heroic"]],
  ["draken", "SE", "William Sundin", ["NIP", "Heroic"]],
  ["Golden", "SE", "Maikil Selim", ["fnatic"]],
  ["Lekr0", "SE", "Jonas Olofsson", ["NIP", "fnatic"]],

  // ── França ──────────────────────────────────────────────────
  ["ZywOo", "FR", "Mathieu Herbaut", ["Vitality"]],
  ["apEX", "FR", "Dan Madesclaire", ["Vitality", "EnVyUs", "Titan", "G2"]],
  ["shox", "FR", "Richard Papillon", ["G2", "Vitality", "Titan", "VeryGames"]],
  ["kennyS", "FR", "Kenny Schrub", ["Titan", "EnVyUs", "G2"]],
  ["NBK", "FR", "Nathan Schmitt", ["G2", "EnVyUs", "Vitality", "OG", "VeryGames"]],
  ["Happy", "FR", "Vincent Schopenhauer", ["EnVyUs", "Titan", "G2"]],
  ["RpK", "FR", "Cédric Guipouy", ["G2", "Vitality", "Titan", "VeryGames"]],
  ["kioShiMa", "FR", "Fabien Fiey", ["EnVyUs", "FaZe", "MIBR"]],
  ["ScreaM", "FR", "Adil Benrlitom", ["Titan", "G2", "EnVyUs"]],
  ["SmithZz", "FR", "Édouard Dubourdeaux", ["EnVyUs", "G2", "Titan", "VeryGames"]],
  ["Ex6TenZ", "FR", "Kévin Droolans", ["VeryGames", "Titan", "G2"]],
  ["bodyy", "FR", "Alexandre Pianaro", ["G2"]],
  ["AmaNEk", "FR", "Ali Saouli", ["G2", "EG", "OG"]],
  ["JACKZ", "FR", "Audric Jug", ["G2"]],
  ["misutaaa", "FR", "Audric Toledo", ["Vitality"]],
  ["Maka", "FR", "Christophe Badawi", ["EnVyUs"]],

  // ── Brasil ──────────────────────────────────────────────────
  ["FalleN", "BR", "Gabriel Toledo", ["Luminosity", "SK", "MIBR", "Liquid", "Imperial"]],
  ["coldzera", "BR", "Marcelo David", ["Luminosity", "SK", "MIBR", "FaZe", "Falcons"]],
  ["fer", "BR", "Fernando Alvarenga", ["Luminosity", "SK", "MIBR", "Imperial"]],
  ["TACO", "BR", "Epitácio de Melo", ["Luminosity", "SK", "MIBR", "Liquid"]],
  ["fnx", "BR", "Lincoln Lau", ["Luminosity", "SK", "Imperial"]],
  ["boltz", "BR", "Ricardo Prass", ["Immortals", "SK", "MIBR"]],
  ["felps", "BR", "João Vasconcellos", ["Immortals", "SK", "MIBR", "GODSENT"]],
  ["kscerato", "BR", "Kaike Cerato", ["FURIA"]],
  ["yuurih", "BR", "Yuri Santos", ["FURIA"]],
  ["arT", "BR", "Andrei Piovezan", ["FURIA"]],
  ["chelo", "BR", "Marcelo Cespedes", ["MIBR", "FURIA"]],
  ["saffee", "BR", "Rafael Costa", ["paiN", "FURIA", "Imperial"]],
  ["HEN1", "BR", "Henrique Teles", ["Immortals", "MIBR", "Imperial"]],
  ["skullz", "BR", "Felipe Medeiros", ["paiN", "Liquid"]],

  // ── Rússia ──────────────────────────────────────────────────
  ["electronic", "RU", "Denis Sharipov", ["NAVI", "Cloud9"]],
  ["flamie", "RU", "Egor Vasilyev", ["NAVI"]],
  ["Perfecto", "RU", "Ilya Zalutskiy", ["NAVI"]],
  ["Boombl4", "RU", "Kirill Mikhailov", ["NAVI", "Cloud9", "Spirit"]],
  ["sh1ro", "RU", "Dmitry Sokolov", ["Gambit", "Cloud9", "Spirit"]],
  ["Ax1Le", "RU", "Sergey Rykhtorov", ["Gambit", "Cloud9"]],
  ["interz", "RU", "Timofey Yakushin", ["Gambit", "Cloud9"]],
  ["jame", "RU", "Dzhami Ali", ["Virtus.pro", "Outsiders", "Spirit"]],
  ["magixx", "RU", "Vladislav Bobrov", ["NAVI"]],
  ["donk", "RU", "Danil Kryshkovets", ["Spirit"]],
  ["chopper", "RU", "Leonid Vishnyakov", ["Spirit"]],
  ["m0NESY", "RU", "Ilya Osipov", ["NAVI", "G2", "Falcons"]],
  ["nafany", "RU", "Vladislav Gorshkov", ["Gambit", "Cloud9"]],

  // ── Ucrânia ─────────────────────────────────────────────────
  ["s1mple", "UA", "Oleksandr Kostyliev", ["NAVI", "Liquid", "FlipSid3", "HellRaisers"]],
  ["b1t", "UA", "Valeriy Vakhovskiy", ["NAVI"]],
  ["Zeus", "UA", "Danylo Teslenko", ["NAVI", "Gambit", "HellRaisers"]],
  ["sdy", "UA", "Viktor Orudzhev", ["MOUZ", "Outsiders", "NAVI"]],
  ["w0nderful", "UA", "Ihor Zhdanov", ["NAVI"]],
  ["zont1x", "UA", "Andrii Hrytsenko", ["Spirit"]],

  // ── Finlândia ───────────────────────────────────────────────
  ["allu", "FI", "Aleksi Jalli", ["NIP", "ENCE", "FaZe"]],
  ["Aleksib", "FI", "Aleksi Virolainen", ["ENCE", "OG", "NAVI", "G2", "MOUZ"]],
  ["sergej", "FI", "Jere Salo", ["ENCE"]],
  ["suNny", "FI", "Miikka Kemppi", ["MOUZ", "ENCE", "BIG"]],
  ["Jamppi", "FI", "Elias Olkkonen", ["ENCE", "MOUZ"]],
  ["Jimpphat", "FI", "Jimi Salo", ["MOUZ"]],
  ["xseveN", "FI", "Aleksi Ojala", ["ENCE"]],

  // ── Polônia ─────────────────────────────────────────────────
  ["NEO", "PL", "Filip Kubski", ["Virtus.pro"]],
  ["TaZ", "PL", "Wiktor Wojtas", ["Virtus.pro"]],
  ["pashaBiceps", "PL", "Jarosław Jarząbkowski", ["Virtus.pro"]],
  ["Snax", "PL", "Janusz Pogorzelski", ["Virtus.pro", "MOUZ", "G2"]],
  ["byali", "PL", "Paweł Bieliński", ["Virtus.pro"]],
  ["MICHU", "PL", "Michał Müller", ["MOUZ", "Complexity"]],
  ["dycha", "PL", "Paweł Dycha", ["MOUZ", "Apeks"]],
  ["siuhy", "PL", "Kamil Szkaradek", ["MOUZ"]],

  // ── EUA ─────────────────────────────────────────────────────
  ["stewie2k", "US", "Jake Yip", ["Cloud9", "SK", "MIBR", "Liquid", "EG"]],
  ["EliGE", "US", "Jonathan Jablonowski", ["Liquid", "Complexity", "FaZe"]],
  ["nitr0", "US", "Nicholas Cannella", ["Liquid", "FaZe", "100T"]],
  ["Brehze", "US", "Vincent Hoang", ["EG", "Liquid", "NRG"]],
  ["Ethan", "US", "Ethan Arnold", ["EG", "NRG", "FaZe"]],
  ["tarik", "US", "Tarik Celik", ["Cloud9", "OpTic", "MIBR", "EG"]],
  ["autimatic", "US", "Timothy Ta", ["Cloud9", "Gen.G", "TSM"]],
  ["RUSH", "US", "William Wierzba", ["Cloud9", "Complexity"]],
  ["n0thing", "US", "Jordan Gilbert", ["Cloud9"]],
  ["Skadoodle", "US", "Tyler Latham", ["Cloud9", "TSM", "iBUYPOWER"]],
  ["floppy", "US", "Ricky Kemery", ["Complexity", "Liquid"]],
  ["oSee", "US", "Josh Ohm", ["Liquid"]],
  ["FNS", "US", "Pujan Mehta", ["NRG", "Cloud9"]],

  // ── Canadá ──────────────────────────────────────────────────
  ["NAF", "CA", "Keith Markovic", ["Liquid", "Renegades"]],
  ["Twistzz", "CA", "Russel Van Dulken", ["Liquid", "FaZe"]],
  ["daps", "CA", "Damian Steele", ["NRG", "Gen.G"]],

  // ── Austrália ───────────────────────────────────────────────
  ["jks", "AU", "Justin Savage", ["Renegades", "100T", "Complexity", "G2", "FaZe"]],
  ["AZR", "AU", "Aaron Ward", ["Renegades", "100T"]],
  ["Liazz", "AU", "Jay Liaz", ["Renegades", "100T"]],

  // ── Bósnia ──────────────────────────────────────────────────
  ["NiKo", "BA", "Nikola Kovač", ["MOUZ", "FaZe", "G2", "Falcons"]],
  ["huNter-", "BA", "Nemanja Kovač", ["G2", "Falcons"]],

  // ── Eslováquia ──────────────────────────────────────────────
  ["GuardiaN", "SK", "Ladislav Kovács", ["NAVI", "FaZe", "Virtus.pro"]],
  ["frozen", "SK", "David Čerňanský", ["MOUZ", "Falcons"]],

  // ── Estônia ─────────────────────────────────────────────────
  ["ropz", "EE", "Robin Kool", ["MOUZ", "FaZe", "Vitality"]],

  // ── Noruega ─────────────────────────────────────────────────
  ["rain", "NO", "Håvard Nygaard", ["FaZe"]],
  ["jkaem", "NO", "Joakim Myrbostad", ["TSM", "Heroic", "Dignitas"]],

  // ── Alemanha ────────────────────────────────────────────────
  ["tabseN", "DE", "Johannes Wagner", ["BIG"]],
  ["syrsoN", "DE", "Florian Rische", ["BIG"]],
  ["tiziaN", "DE", "Tizian Feldbusch", ["BIG"]],
  ["k1to", "DE", "Josef Glaburda", ["BIG", "Vitality"]],
  ["faveN", "DE", "Josef Baumann", ["BIG"]],
  ["nex", "DE", "Nils Gruhne", ["BIG"]],

  // ── Turquia ─────────────────────────────────────────────────
  ["XANTARES", "TR", "İsmailcan Dörtkardeş", ["Space Soldiers", "BIG", "Eternal Fire"]],
  ["woxic", "TR", "Özgür Eker", ["MOUZ", "HellRaisers", "Eternal Fire"]],
  ["MAJ3R", "TR", "Engin Küpeli", ["Space Soldiers", "Eternal Fire"]],
  ["Calyx", "TR", "Buğra Arkın", ["Space Soldiers", "Eternal Fire"]],
  ["imoRR", "TR", "Ozan Çolak", ["Space Soldiers"]],

  // ── Israel ──────────────────────────────────────────────────
  ["Spinx", "IL", "Lotan Giladi", ["ENCE", "Vitality", "Falcons"]],
  ["flameZ", "IL", "Shahar Shushan", ["Vitality", "OG"]],
  ["xertioN", "IL", "Dan Girshevich", ["MOUZ"]],

  // ── Cazaquistão ─────────────────────────────────────────────
  ["Hobbit", "KZ", "Abay Khasenov", ["Gambit", "Spirit", "HellRaisers"]],
  ["AdreN", "KZ", "Dauren Kystaubayev", ["Gambit", "Virtus.pro"]],

  // ── Letônia ─────────────────────────────────────────────────
  ["broky", "LV", "Helvijs Saukants", ["FaZe"]],
  ["YEKINDAR", "LV", "Mareks Gaļinskis", ["Virtus.pro", "Liquid", "FaZe", "Outsiders"]],

  // ── Sérvia ──────────────────────────────────────────────────
  ["nexa", "RS", "Nemanja Isaković", ["G2", "OG"]],

  // ── Lituânia ────────────────────────────────────────────────
  ["jL", "LT", "Justinas Lekavičius", ["NAVI"]],
  ["Bymas", "LT", "Aurimas Pipiras", ["FaZe", "MOUZ"]],

  // ════════════════ EXPANSÃO (cobertura mais profunda) ════════════════

  // ── Dinamarca (extra) ───────────────────────────────────────
  ["Snappi", "DK", "Marco Pfeiffer", ["ENCE", "Astralis"]],
  ["valde", "DK", "Valdemar Bjørn Vangså", ["North", "OG", "MAD Lions"]],
  ["es3tag", "DK", "Patrick Hansen", ["Heroic", "Astralis", "Cloud9", "Complexity"]],
  ["b0RUP", "DK", "Rasmus Borup", ["Sprout", "GamerLegion"]],
  ["nicoodoz", "DK", "Nico Tamjidi", ["fnatic"]],

  // ── Suécia (extra) ──────────────────────────────────────────
  ["Maikelele", "SE", "Mikail Bill", ["NIP", "FaZe", "Space Soldiers"]],
  ["nawwk", "SE", "Tim Jonasson", ["NIP", "GamerLegion"]],
  ["isak", "SE", "Isak Fahlén", ["GamerLegion", "Astralis"]],

  // ── França (extra) ──────────────────────────────────────────
  ["acoR", "FR", "Aurélien Drapier", ["Vitality", "MAD Lions", "GamerLegion"]],
  ["Lucky", "FR", "Lucas Chastang", ["3DMAX"]],
  ["Djoko", "FR", "Bryan Ouedraogo", ["3DMAX"]],
  ["Graviti", "FR", "Sebastien Bonin", ["3DMAX"]],
  ["Ex3rcice", "FR", "Lucas Quéran", ["3DMAX"]],

  // ── Reino Unido ─────────────────────────────────────────────
  ["mezii", "GB", "William Merriman", ["fnatic", "Vitality"]],
  ["smooya", "GB", "Owen Butterfield", ["BIG", "Endpoint"]],
  ["ALEX", "GB", "Alex McMeekin", ["MOUZ", "Vitality", "Cloud9"]],

  // ── Brasil (extra) ──────────────────────────────────────────
  ["VINI", "BR", "Vinicius Figueiredo", ["paiN", "FURIA"]],
  ["drop", "BR", "André Abreu", ["FURIA"]],
  ["brnz4n", "BR", "Bruno Cassença", ["MIBR"]],
  ["steel", "BR", "Lucas Lopes", ["Immortals", "Liquid", "MIBR"]],
  ["lucas1", "BR", "Lucas Teles", ["Immortals", "MIBR", "Imperial"]],

  // ── Rússia / Ucrânia (extra) ────────────────────────────────
  ["seized", "RU", "Denis Kostin", ["NAVI"]],
  ["Edward", "UA", "Ioann Sukhariev", ["NAVI"]],
  ["markeloff", "UA", "Yegor Markelov", ["NAVI", "Gambit"]],
  ["ANGE1", "UA", "Kirill Karasiow", ["HellRaisers"]],

  // ── EUA (extra) ─────────────────────────────────────────────
  ["Grim", "US", "Michael Wince", ["Liquid", "Complexity"]],
  ["Hiko", "US", "Spencer Martin", ["Liquid", "Renegades"]],
  ["swag", "US", "Braxton Pierce", ["iBUYPOWER"]],

  // ── Canadá (extra) ──────────────────────────────────────────
  ["shroud", "CA", "Michael Grzesiek", ["Cloud9"]],

  // ── Austrália (extra) ───────────────────────────────────────
  ["dexter", "AU", "Aaron Bajric", ["MOUZ"]],

  // ── Noruega (extra) ─────────────────────────────────────────
  ["hallzerk", "NO", "Håkon Fjærli", ["Complexity", "FlyQuest"]],

  // ── Alemanha (extra) ────────────────────────────────────────
  ["gob b", "DE", "Fatih Dayik", ["BIG", "MOUZ"]],

  // ── Turquia (extra) ─────────────────────────────────────────
  ["xfl0ud", "TR", "Mehmet Özen", ["Eternal Fire"]],
  ["Wicadia", "TR", "Berke Galgonul", ["Eternal Fire"]],

  // ── Tchéquia ────────────────────────────────────────────────
  ["oskar", "CZ", "David Kaňák", ["MOUZ", "HellRaisers"]],

  // ── Holanda ─────────────────────────────────────────────────
  ["chrisJ", "NL", "Chris de Jong", ["MOUZ"]],

  // ── Eslováquia (extra) ──────────────────────────────────────
  ["STYKO", "SK", "Martin Styk", ["MOUZ", "Cloud9"]],

  // ── Hungria ─────────────────────────────────────────────────
  ["torzsi", "HU", "Ádám Torzsás", ["MOUZ"]],

  // ── Guatemala ───────────────────────────────────────────────
  ["malbsMd", "GT", "Mario Samayoa", ["G2"]],

  // ── Bulgária ────────────────────────────────────────────────
  ["CeRq", "BG", "Tarik Cerqueira", ["NRG", "EG"]],

  // ── Indonésia ───────────────────────────────────────────────
  ["BnTeT", "ID", "Hansel Ferdinand", ["TYLOO", "Gen.G", "ENCE"]],

  // ── Mongólia (The Mongolz) ──────────────────────────────────
  ["910", "MN", "Usukhbayar Banzragch", ["TheMongolz"]],
  ["bLitzZ", "MN", "Garidmagnai Byambasuren", ["TheMongolz"]],
  ["Techno4K", "MN", "Ayush Batbold", ["TheMongolz"]],
  ["mzinho", "MN", "Mungunshagai Bilguun", ["TheMongolz"]],
  ["Senzu", "MN", "Garidmagnai Senzu", ["TheMongolz"]],
];

const players = ROSTER.map(([id, countryCode, realName, teamsNotable]) => ({
  id,
  realName,
  countryCode,
  roles: [],
  csgo: true,
  cs2: true,
  teamsNotable,
  teamOrgsRaw: teamsNotable,
}));

// Times de fato usados (com ≥1 jogador) → teams.json.
const usedTeams = [...new Set(players.flatMap((p) => p.teamsNotable))].sort();
const teams = usedTeams.map((abbr) => ({ abbr, name: TEAM_NAMES[abbr] || abbr }));

writeFileSync(join(OUT_DIR, "players.json"), JSON.stringify(players, null, 2));
writeFileSync(join(OUT_DIR, "teams.json"), JSON.stringify(teams, null, 2));

// Resumo.
const byCountry = {};
for (const p of players) byCountry[p.countryCode] = (byCountry[p.countryCode] || 0) + 1;
console.log(`✔ ${players.length} jogadores · ${teams.length} times`);
console.log("Países:", JSON.stringify(byCountry));
