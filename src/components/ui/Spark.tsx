"use client";
import { useId, useMemo } from "react";

export function Spark({
  data,
  width = 80,
  height = 22,
  color,
  fill = true,
  strokeWidth = 1,
  baseline,
  className,
}: {
  data: number[] | undefined;
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
  baseline?: number;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const { d, area, by, up } = useMemo(() => {
    if (!data || data.length < 2) return { d: "", area: "", by: null as number | null, up: true };
    let mn = Infinity;
    let mx = -Infinity;
    for (const v of data) {
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    if (baseline !== undefined) {
      mn = Math.min(mn, baseline);
      mx = Math.max(mx, baseline);
    }
    const r = mx - mn || 1;
    const sx = width / (data.length - 1);
    const y = (v: number) => height - 1 - ((v - mn) / r) * (height - 2);
    let path = "";
    data.forEach((v, i) => (path += `${i ? "L" : "M"}${(i * sx).toFixed(1)},${y(v).toFixed(1)}`));
    return {
      d: path,
      area: `${path}L${width},${height}L0,${height}Z`,
      by: baseline !== undefined ? y(baseline) : null,
      up: data[data.length - 1] >= (baseline ?? data[0]),
    };
  }, [data, width, height, baseline]);
  const c = color ?? (up ? "var(--pos)" : "var(--neg)");
  return (
    <svg width={width} height={height} className={className} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={c} stopOpacity={0.28} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </linearGradient>
      </defs>
      {by !== null && <line x1={0} x2={width} y1={by} y2={by} stroke="var(--line-3)" strokeDasharray="1 2" />}
      {fill && area && <path d={area} fill={`url(#g${id})`} />}
      {d && <path d={d} fill="none" stroke={c} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
