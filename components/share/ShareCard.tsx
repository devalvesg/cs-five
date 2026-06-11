import { flagSrc, countryLabel } from "@/lib/data/players";
import type { Top10CardData, Top10CardSlot } from "@/lib/share/top10-card";
import "./share-card.css";

export type ShareVariant = "square" | "story";

const DIMS: Record<ShareVariant, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

/** Brandmark CS-FIVE: hexágono dourado + crosshair (portado do handoff). */
export function CardBrand({ size }: { size: number }) {
  const g = "#e0a93c";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }} aria-hidden>
      <polygon points="32,4 55,17.5 55,46.5 32,60 9,46.5 9,17.5" fill="#10151d" stroke={g} strokeWidth="3.2" />
      <circle cx="32" cy="32" r="9.5" fill="none" stroke={g} strokeWidth="3.2" />
      <g stroke={g} strokeWidth="3.2" strokeLinecap="round">
        <line x1="32" y1="13" x2="32" y2="22" />
        <line x1="32" y1="42" x2="32" y2="51" />
        <line x1="13" y1="32" x2="22" y2="32" />
        <line x1="42" y1="32" x2="51" y2="32" />
      </g>
      <circle cx="32" cy="32" r="2.6" fill={g} />
    </svg>
  );
}

function CardWordmark({ size }: { size: number }) {
  return (
    <span className="cw" style={{ fontSize: size }}>
      <span className="cw-a">CS-</span>
      <span className="cw-b">FIVE</span>
    </span>
  );
}

function CardFlag({ code, size }: { code: string; size: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flagSrc(code)} alt={countryLabel(code)} width={size} height={Math.round((size * 2) / 3)} />
  );
}

function Slot({ index, slot, big }: { index: number; slot: Top10CardSlot; big?: boolean }) {
  const fsize = big ? 44 : 34;
  if (slot.solved) {
    return (
      <div className={"slot slot-on" + (big ? " slot-big" : "")}>
        <span className="slot-rank">{index + 1}</span>
        {slot.flag && (
          <span className="slot-flag">
            <CardFlag code={slot.flag} size={fsize} />
          </span>
        )}
        <span className="slot-name">{slot.label}</span>
        <span className="slot-check">✓</span>
      </div>
    );
  }
  return (
    <div className={"slot slot-off" + (big ? " slot-big" : "")}>
      <span className="slot-rank slot-rank-off">{index + 1}</span>
      <span className="slot-hidden">
        <span className="hdot" />
        <span className="hdot" />
        <span className="hdot" />
      </span>
    </div>
  );
}

/** Card de resultado do Top 10 renderizado em tamanho real (1080) para rasterizar. */
export default function ShareCard({ data, variant }: { data: Top10CardData; variant: ShareVariant }) {
  const story = variant === "story";
  const { w, h } = DIMS[variant];
  const slots = data.slots;

  const header = (
    <div className="ch-head">
      <div className="ch-brand">
        <CardBrand size={story ? 96 : 78} />
        <CardWordmark size={story ? 64 : 54} />
      </div>
      <div className="ch-meta">
        <div className="ch-mode">
          <span className="ch-top">TOP</span> <span className="ch-ten">10</span>
        </div>
        <div className="ch-puzzle">#{data.puzzle}</div>
      </div>
    </div>
  );

  const theme = <div className="ch-theme">{data.theme}</div>;

  const score = (
    <div className="ch-score">
      <div className="ch-scorenum">
        {data.correct}
        <span className="ch-scoreslash">/{data.total}</span>
      </div>
      <div className="ch-scorelabel">acertos</div>
    </div>
  );

  const grid = story ? (
    <div className="ch-slots ch-slots-col">
      {slots.map((s, i) => (
        <Slot key={i} index={i} slot={s} big />
      ))}
    </div>
  ) : (
    <div className="ch-slots ch-slots-2col">
      <div className="ch-col">
        {slots.slice(0, 5).map((s, i) => (
          <Slot key={i} index={i} slot={s} />
        ))}
      </div>
      <div className="ch-col">
        {slots.slice(5, 10).map((s, i) => (
          <Slot key={i + 5} index={i + 5} slot={s} />
        ))}
      </div>
    </div>
  );

  const footer = (
    <div className="ch-foot">
      <div className="ch-cta">csfive.gg</div>
      <div className="ch-foot-sep" />
      <div className="ch-tagline">Novo desafio todo dia</div>
    </div>
  );

  return (
    <div className={"sharecard " + (story ? "sc-story" : "sc-square")} style={{ width: w, height: h }}>
      <div className="sc-glow" />
      <div className="sc-inner">
        {header}
        {theme}
        {story ? (
          <>
            {score}
            {grid}
          </>
        ) : (
          <div className="ch-mid">
            {score}
            {grid}
          </div>
        )}
        {footer}
      </div>
    </div>
  );
}
