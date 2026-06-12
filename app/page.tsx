import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { BrandMark, Crosshair } from "@/components/Brand";

function GridPreview() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className={`flex aspect-square items-center justify-center rounded-md border border-cs-lineSoft text-[9px] font-bold ${
            i === 0 ? "bg-[#10151d]" : "bg-cs-surface2 text-cs-green"
          }`}
        >
          {i === 0 ? <BrandMark size={20} /> : i % 2 === 0 ? "✓" : ""}
        </div>
      ))}
    </div>
  );
}

function Top10Preview() {
  return (
    <div className="flex flex-col justify-center gap-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-3 text-right text-[10px] font-bold text-cs-muted">{i + 1}</span>
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-cs-blue/70">
            <Crosshair size={11} color="#4a9fe0" />
          </span>
          <span className="h-[9px] flex-1 rounded-[5px] border border-cs-lineSoft bg-gradient-to-r from-[#1c2532] to-[#141b26]" />
        </div>
      ))}
    </div>
  );
}

function ImpostorPreview() {
  // 6 tiles espalhados: alguns "corretos" (verde ✓) e impostores (✕).
  const cells = [
    { ok: true }, { ok: false }, { ok: true },
    { ok: false }, { ok: true }, { ok: false },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {cells.map((c, i) => (
        <span
          key={i}
          className={`flex aspect-square items-center justify-center rounded-md border text-[11px] font-bold ${
            c.ok ? "border-cs-green/70 bg-cs-green/[0.12] text-cs-green" : "border-cs-red/60 bg-cs-red/[0.10] text-cs-red"
          }`}
        >
          {c.ok ? "✓" : "✕"}
        </span>
      ))}
    </div>
  );
}

function SoonPreview() {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="flex h-[22px] w-[22px] items-center justify-center rounded border border-cs-lineSoft bg-cs-surface2">
          {i % 3 === 0 ? <Crosshair size={14} /> : null}
        </span>
      ))}
    </div>
  );
}

const Badge = ({ kind, children }: { kind: "new" | "update"; children: React.ReactNode }) => (
  <span
    className={`absolute -top-2 left-3.5 z-[3] rounded-md px-2.5 py-1 font-display text-xs font-extrabold tracking-[0.06em] ${
      kind === "new" ? "bg-cs-green text-[#06250c]" : "bg-cs-blue text-[#04223a]"
    }`}
  >
    {children}
  </span>
);

function GameCard({
  href, badge, badgeKind, subtitle, preview, disabled,
}: {
  href?: string; badge?: string; badgeKind?: "new" | "update";
  subtitle: string; preview: React.ReactNode; disabled?: boolean;
}) {
  const inner = (
    <div
      className={`group relative overflow-hidden rounded-[10px] border border-cs-lineSoft bg-cs-surface transition ${
        disabled
          ? "opacity-55"
          : "cursor-pointer hover:-translate-y-1 hover:border-cs-gold hover:shadow-[0_10px_30px_rgba(0,0,0,.5)]"
      }`}
    >
      {badge && badgeKind && <Badge kind={badgeKind}>{badge}</Badge>}
      <div className="flex h-[150px] items-center justify-center bg-cs-surface2 p-3.5">{preview}</div>
      <div className="bg-cs-foot px-3 pb-3.5 pt-3 text-center">
        <div className="font-display text-[22px] font-extrabold tracking-[0.04em]">
          {disabled ? "EM BREVE" : "PLAY"}
        </div>
        <div className="mt-0.5 text-[13px] font-semibold text-cs-muted">{subtitle}</div>
      </div>
    </div>
  );
  return disabled || !href ? inner : <Link href={href}>{inner}</Link>;
}

export default function HomePage() {
  return (
    <div className="relative z-[1] min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-[920px] px-4 pb-20 pt-8">
        <h2 className="mb-6 mt-2 text-center font-display text-[26px] font-bold tracking-[0.01em]">
          Escolha o jogo que você quer jogar:
        </h2>

        <div className="mx-auto grid max-w-[840px] grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-[18px]">
          <GameCard href="/top10" badge="NEW" badgeKind="new" subtitle="CS-FIVE Top 10" preview={<Top10Preview />} />
          <GameCard href="/grid" badge="UPDATE" badgeKind="update" subtitle="CS-FIVE Grid" preview={<GridPreview />} />
          <GameCard href="/impostor" badge="NEW" badgeKind="new" subtitle="CS-FIVE Impostor" preview={<ImpostorPreview />} />
          <GameCard disabled subtitle="CS-FIVE Wordle" preview={<SoonPreview />} />
        </div>

        <div className="mb-2.5 mt-12 text-center font-display text-xl font-bold text-cs-muted">
          Mais jogos em breve
        </div>
      </main>
    </div>
  );
}
