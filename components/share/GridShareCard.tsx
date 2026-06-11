import { teamLogo, flagSrc } from "@/lib/data/players";
import type { Criterion } from "@/lib/grid/generator";
import type { GridCardData } from "@/lib/share/grid-card";
import { CardBrand, type ShareVariant } from "./ShareCard";
import "./share-card.css";

const DIMS: Record<ShareVariant, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

function GridWordmark({ size }: { size: number }) {
  return (
    <span className="cw" style={{ fontSize: size }}>
      <span className="cw-a">CS-</span>
      <span className="cw-b">FIVE</span>
    </span>
  );
}

/** Cabeçalho de linha/coluna: logo do time ou bandeira do país. */
function GridHead({ crit, size }: { crit: Criterion; size: number }) {
  if (crit.kind === "team") {
    const logo = teamLogo(crit.value);
    if (!logo) return <span style={{ width: size, height: size }} />;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={crit.label} width={size} height={size} />;
  }
  // país → bandeira (aspecto 3:2)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="ghead-flag" src={flagSrc(crit.value)} alt={crit.label} width={size} height={Math.round((size * 2) / 3)} />
  );
}

/** Card de resultado do Grid renderizado em tamanho real (1080) para rasterizar. */
export default function GridShareCard({ data, variant }: { data: GridCardData; variant: ShareVariant }) {
  const story = variant === "story";
  const { w, h } = DIMS[variant];
  const headSize = story ? 96 : 72;

  return (
    <div className={"sharecard " + (story ? "sc-story" : "sc-square")} style={{ width: w, height: h }}>
      <div className="sc-glow" />
      <div className="sc-inner sc-gridcard">
        <div className="ch-head">
          <div className="ch-brand">
            <CardBrand size={story ? 96 : 78} />
            <GridWordmark size={story ? 64 : 54} />
          </div>
          <div className="ch-meta">
            <div className="ch-mode">
              <span className="ch-ten">GRID</span>
            </div>
            <div className="ch-puzzle">#{data.puzzle}</div>
          </div>
        </div>

        <div className="ch-score">
          <div className="ch-scorenum">
            {data.correct}
            <span className="ch-scoreslash">/9</span>
          </div>
          <div className="ch-scorelabel">acertos</div>
        </div>

        <div className="ch-gridwrap">
          <div className={"ggrid " + (story ? "ggrid-story" : "ggrid-square")}>
            <div className="gcorner">
              <CardBrand size={story ? 54 : 42} />
            </div>
            {data.cols.map((c) => (
              <div className="ghead" key={`c-${c.value}`}>
                <GridHead crit={c} size={headSize} />
              </div>
            ))}
            {data.rows.map((row, ri) => (
              <Row key={`r-${row.value}`}>
                <div className="ghead">
                  <GridHead crit={row} size={headSize} />
                </div>
                {data.cols.map((col, ci) => {
                  const on = data.solved[ri][ci];
                  return (
                    <div className={"gcell " + (on ? "gcell-on" : "gcell-off")} key={`${row.value}-${col.value}`}>
                      <span className={on ? "gcell-check" : "gcell-x"}>{on ? "✓" : "✕"}</span>
                    </div>
                  );
                })}
              </Row>
            ))}
          </div>
        </div>

        <div className="ch-foot">
          <div className="ch-cta">csfive.gg</div>
          <div className="ch-foot-sep" />
          <div className="ch-tagline">Novo desafio todo dia</div>
        </div>
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
