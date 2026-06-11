"use client";

import { useRef, useState } from "react";
import type { ShareVariant } from "./ShareCard";

const DIMS: Record<ShareVariant, { w: number; h: number }> = {
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
};

/** Escala do preview p/ caber numa caixa máx. de ~360×440. */
function previewScale(variant: ShareVariant): number {
  const { w, h } = DIMS[variant];
  return Math.min(360 / w, 440 / h);
}

export default function ShareCardModal({
  filename,
  renderCard,
  onClose,
}: {
  /** Nome do arquivo sem extensão (ex.: "cs-five-top10-23"). */
  filename: string;
  renderCard: (variant: ShareVariant) => React.ReactNode;
  onClose: () => void;
}) {
  const [variant, setVariant] = useState<ShareVariant>("square");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const { w, h } = DIMS[variant];
  const scale = previewScale(variant);

  async function download() {
    const node = captureRef.current;
    if (!node || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await document.fonts.ready;
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, { width: w, height: h, pixelRatio: 1, cacheBust: true });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setErr("Não foi possível gerar a imagem. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-cs-line bg-cs-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg font-bold">Compartilhar resultado</h2>

        {/* Preview escalado */}
        <div className="overflow-hidden rounded-xl border border-cs-line" style={{ width: w * scale, height: h * scale }}>
          <div style={{ width: w, height: h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            {renderCard(variant)}
          </div>
        </div>

        {/* Toggle de formato */}
        <div className="flex gap-2">
          {(["square", "story"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              className={[
                "rounded-full border-2 px-4 py-1.5 font-display text-sm font-bold transition",
                variant === v
                  ? "border-cs-gold bg-cs-gold/15 text-cs-gold"
                  : "border-cs-line text-cs-muted hover:border-cs-gold/50 hover:text-cs-txt",
              ].join(" ")}
            >
              {v === "square" ? "Quadrado" : "Story"}
            </button>
          ))}
        </div>

        {err && <p className="text-center text-xs text-cs-red">{err}</p>}

        <button
          onClick={download}
          disabled={busy}
          className="w-full rounded-full bg-cs-gold py-2.5 font-display font-bold text-cs-ink transition hover:bg-cs-goldBright disabled:opacity-60"
        >
          {busy ? "Gerando…" : "Baixar imagem"}
        </button>
        <button onClick={onClose} className="text-sm text-cs-muted hover:text-cs-txt">
          Fechar
        </button>

        {/* Nó de captura em tamanho real, fora da viewport */}
        <div aria-hidden style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }}>
          <div ref={captureRef}>{renderCard(variant)}</div>
        </div>
      </div>
    </div>
  );
}
