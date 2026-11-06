"use client";

/** Semicircular gauge; value 0..1 */
export function Gauge({ value, label, sub, color = "var(--a1)", size = 120 }: { value: number; label: string; sub?: string; color?: string; size?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [+(cx + r * Math.cos(Math.PI + a * Math.PI)).toFixed(2), +(cy + r * Math.sin(Math.PI + a * Math.PI)).toFixed(2)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const ticks = Array.from({ length: 21 }, (_, i) => i / 20);
  const na = Math.PI + v * Math.PI;
  return (
    <svg width={size} height={size / 2 + 22} className="overflow-visible">
      {ticks.map((t) => {
        const a = Math.PI + t * Math.PI;
        const r0 = r + 3;
        const r1 = Math.round(t * 20) % 5 === 0 ? r + 7 : r + 5;
        return <line key={t} x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)} x2={cx + r1 * Math.cos(a)} y2={cy + r1 * Math.sin(a)} stroke="var(--line-3)" />;
      })}
      <path d={arc(0, 1)} stroke="var(--line-2)" strokeWidth={5} fill="none" />
      <path d={arc(0, Math.max(0.001, v))} stroke={color} strokeWidth={5} fill="none" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <line x1={cx} y1={cy} x2={cx + (r - 10) * Math.cos(na)} y2={cy + (r - 10) * Math.sin(na)} stroke="var(--text)" strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={2.5} fill="var(--text)" />
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize={11} fill="var(--text)" letterSpacing="0.1em">
        {label}
      </text>
      {sub && (
        <text x={cx} y={cy - r * 0.38} textAnchor="middle" fontSize={8} fill="var(--text-dim)" letterSpacing="0.14em">
          {sub}
        </text>
      )}
    </svg>
  );
}
