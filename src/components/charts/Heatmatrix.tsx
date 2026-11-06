"use client";
import { useSize } from "./useSize";
import { useTip } from "../ui/Tooltip";

/** Diverging correlation-style matrix (-1..1). */
export function Heatmatrix({ labels, values, format = (v: number) => v.toFixed(2), showValues = true }: { labels: string[]; values: number[][]; format?: (v: number) => string; showValues?: boolean }) {
  const [ref, { w, h }] = useSize();
  const tip = useTip();
  const n = labels.length;
  const lab = 40;
  const cell = n ? Math.max(4, Math.min((w - lab) / n, (h - lab) / n)) : 0;
  const color = (v: number) => {
    const a = Math.min(1, Math.abs(v));
    if (v >= 0) return `rgba(${Math.round(30 + 25 * a)}, ${Math.round(140 + 105 * a)}, ${Math.round(200 + 55 * a)}, ${0.08 + a * 0.85})`;
    return `rgba(255, ${Math.round(80 - 30 * a)}, ${Math.round(110 - 20 * a)}, ${0.08 + a * 0.85})`;
  };
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && (
        <svg width={w} height={h}>
          {labels.map((l, i) => (
            <g key={l}>
              <text x={lab - 4} y={lab + i * cell + cell / 2 + 3} fontSize={Math.min(9, cell * 0.6)} textAnchor="end" fill="var(--text-dim)">
                {l}
              </text>
              <text transform={`translate(${lab + i * cell + cell / 2 + 3}, ${lab - 4}) rotate(-60)`} fontSize={Math.min(9, cell * 0.6)} fill="var(--text-dim)">
                {l}
              </text>
            </g>
          ))}
          {values.map((row, i) =>
            row.map((v, j) => (
              <g key={i + "-" + j}>
                <rect
                  x={lab + j * cell + 0.5}
                  y={lab + i * cell + 0.5}
                  width={cell - 1}
                  height={cell - 1}
                  fill={color(v)}
                  onMouseMove={(e) =>
                    tip.show(
                      e.clientX,
                      e.clientY,
                      <div>
                        <div className="text-dim">
                          {labels[i]} × {labels[j]}
                        </div>
                        <div className="text-[13px] text-ink">{format(v)}</div>
                      </div>,
                    )
                  }
                  onMouseLeave={() => tip.hide()}
                />
                {showValues && cell > 26 && (
                  <text x={lab + j * cell + cell / 2} y={lab + i * cell + cell / 2 + 3} fontSize={8} textAnchor="middle" fill={Math.abs(v) > 0.55 ? "#02040a" : "var(--text-dim)"} pointerEvents="none">
                    {format(v)}
                  </text>
                )}
              </g>
            )),
          )}
        </svg>
      )}
    </div>
  );
}
