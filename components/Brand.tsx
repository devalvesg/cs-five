/** Logo CS-FIVE: crosshair dentro de hexágono dourado + wordmark "CS-FIVE". */

export function BrandMark({ size = 34 }: { size?: number }) {
  const g = "#e0a93c";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }} aria-hidden>
      <polygon points="32,5 54,18 54,46 32,59 10,46 10,18" fill="#10151d" stroke={g} strokeWidth="3" />
      <circle cx="32" cy="32" r="9" fill="none" stroke={g} strokeWidth="3" />
      <g stroke={g} strokeWidth="3" strokeLinecap="round">
        <line x1="32" y1="14" x2="32" y2="22" />
        <line x1="32" y1="42" x2="32" y2="50" />
        <line x1="14" y1="32" x2="22" y2="32" />
        <line x1="42" y1="32" x2="50" y2="32" />
      </g>
      <circle cx="32" cy="32" r="2.5" fill={g} />
    </svg>
  );
}

export function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span
      className="font-display font-extrabold leading-none tracking-[0.04em] whitespace-nowrap"
      style={{ fontSize: size }}
    >
      <span className="text-cs-txt">CS-</span>
      <span className="text-cs-gold">FIVE</span>
    </span>
  );
}

export function Crosshair({ size = 22, color = "#e0a93c" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="9" fill="none" stroke={color} strokeWidth="2.5" />
      <g stroke={color} strokeWidth="2.5" strokeLinecap="round">
        <line x1="16" y1="3" x2="16" y2="9" />
        <line x1="16" y1="23" x2="16" y2="29" />
        <line x1="3" y1="16" x2="9" y2="16" />
        <line x1="23" y1="16" x2="29" y2="16" />
      </g>
    </svg>
  );
}
