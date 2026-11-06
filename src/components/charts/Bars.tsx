"use client";
import { useSize } from "./useSize";
import { useTip } from "../ui/Tooltip";

export type BarDatum = { label: string; value: number; color?: string; sub?: string; stack?: { value: number; color: string; label: string }[] };

/** Vertical bar chart supporting negatives and optional stacks. */
export function Bars({ data, format = (v: number) => v.toFixed(1), height, showValues = true, labelEvery = 1 }: { data: BarDatum[]; format?: (v: number) => string; height?: number; showValues?: boolean; labelEvery?: number }) {
  const [ref, { w, h: hh }] = useSize();
  const tip = useTip();
  const h = height ?? hh;
  const m = { t: 12, b: 16, l: 4, r: 4 };
  const vals = data.flatMap((d) => (d.stack ? [d.stack.reduce((s, x) => s + Math.max(0, x.value), 0), d.stack.reduce((s, x) => s + Math.min(0, x.value), 0)] : [d.value]));
  const mx = Math.max(0, ...vals);
  const mn = Math.min(0, ...vals);
  const span = mx - mn || 1;
  const y = (v: number) => m.t + ((mx - v) / span) * (h - m.t - m.b);
  const bw = data.length ? (w - m.l - m.r) / data.length : 0;
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h}>
          <line x1={m.l} x2={w - m.r} y1={y(0)} y2={y(0)} stroke="var(--line-3)" />
          {data.map((d, i) => {
            const x = m.l + i * bw + bw * 0.16;
            const bwi = bw * 0.68;
            const showTip = (e: React.MouseEvent) =>
              tip.show(
                e.clientX,
                e.clientY,
                <div>
                  <div className="text-dim">{d.label}</div>
                  {d.stack ? (
                    d.stack.map((s) => (
                      <div key={s.label} className="flex gap-3">
                        <span style={{ color: s.color }}>{s.label}</span>
                        <span className="ml-auto">{format(s.value)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[12px] text-ink">{format(d.value)}</div>
                  )}
                  {d.sub && <div className="text-faint">{d.sub}</div>}
                </div>,
              );
            if (d.stack) {
              let pos = 0;
              let neg = 0;
              return (
                <g key={d.label} onMouseMove={showTip} onMouseLeave={() => tip.hide()}>
                  {d.stack.map((s) => {
                    const v0 = s.value >= 0 ? pos : neg;
                    const v1 = v0 + s.value;
                    if (s.value >= 0) pos = v1;
                    else neg = v1;
                    return <rect key={s.label} x={x} width={bwi} y={Math.min(y(v0), y(v1))} height={Math.abs(y(v0) - y(v1))} fill={s.color} opacity={0.85} />;
                  })}
                  {i % labelEvery === 0 && (
                    <text x={x + bwi / 2} y={h - 4} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
                      {d.label}
                    </text>
                  )}
                </g>
              );
            }
            const c = d.color ?? (d.value >= 0 ? "var(--pos)" : "var(--neg)");
            return (
              <g key={d.label} onMouseMove={showTip} onMouseLeave={() => tip.hide()}>
                <rect x={x} width={bwi} y={Math.min(y(0), y(d.value))} height={Math.max(1, Math.abs(y(d.value) - y(0)))} fill={c} opacity={0.82} style={{ filter: `drop-shadow(0 0 3px ${c})` }} />
                {showValues && bw > 22 && (
                  <text x={x + bwi / 2} y={d.value >= 0 ? y(d.value) - 3 : y(d.value) + 9} fontSize={8} textAnchor="middle" fill="var(--text-dim)">
                    {format(d.value)}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text x={x + bwi / 2} y={h - 4} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/** Horizontal labeled bars (DOM) for ranked lists. */
export function HBars({ items, format = (v: number) => v.toFixed(1), max }: { items: { label: string; value: number; color?: string; hint?: string; onClick?: () => void }[]; format?: (v: number) => string; max?: number }) {
  const mx = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 1e-9);
  return (
    <div className="space-y-[3px]">
      {items.map((it) => {
        const c = it.color ?? (it.value >= 0 ? "var(--pos)" : "var(--neg)");
        return (
          <button key={it.label} onClick={it.onClick} disabled={!it.onClick} className="group flex w-full items-center gap-2 text-left disabled:cursor-default" title={it.hint}>
            <span className="w-[92px] shrink-0 truncate text-[9.5px] text-dim group-hover:text-ink">{it.label}</span>
            <span className="relative h-[7px] flex-1 bg-line/60">
              <span className="absolute inset-y-0 left-0" style={{ width: `${(Math.abs(it.value) / mx) * 100}%`, background: c, boxShadow: `0 0 6px ${c}`, opacity: 0.85 }} />
            </span>
            <span className="w-[52px] shrink-0 text-right text-[9.5px] text-ink/85">{format(it.value)}</span>
          </button>
        );
      })}
    </div>
  );
}
