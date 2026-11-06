"use client";
import { useMemo, useState, type ReactNode } from "react";
import * as d3 from "d3";
import { useSize } from "./useSize";
import { useTip } from "../ui/Tooltip";

export type Pt = { x: number; y: number | null };
export type Series = {
  id: string;
  label?: string;
  data: Pt[];
  color: string;
  area?: boolean;
  width?: number;
  dash?: string;
  axis?: "left" | "right";
  opacity?: number;
  step?: boolean;
};

type Props = {
  series: Series[];
  xType?: "time" | "num";
  yFormat?: (v: number) => string;
  yFormatRight?: (v: number) => string;
  xFormat?: (v: number) => string;
  bands?: { x0: number; x1: number; label?: string; color?: string }[];
  refLines?: { y: number; label?: string; color?: string; axis?: "left" | "right" }[];
  vLines?: { x: number; label?: string; color?: string }[];
  yDomain?: [number, number];
  yDomainRight?: [number, number];
  margin?: { t: number; r: number; b: number; l: number };
  tooltipTitle?: (x: number) => ReactNode;
  className?: string;
  grid?: boolean;
  zeroBase?: boolean;
  onHoverX?: (x: number | null) => void;
};

export function LineChart({
  series,
  xType = "time",
  yFormat = (v) => d3.format(",.2~f")(v),
  yFormatRight,
  xFormat,
  bands,
  refLines,
  vLines,
  yDomain,
  yDomainRight,
  margin,
  tooltipTitle,
  className,
  grid = true,
  zeroBase,
  onHoverX,
}: Props) {
  const [ref, { w, h }] = useSize();
  const [hx, setHx] = useState<number | null>(null);
  const tip = useTip();
  const hasRight = series.some((s) => s.axis === "right");
  const m = margin ?? { t: 8, r: hasRight ? 44 : 10, b: 18, l: 44 };

  const scales = useMemo(() => {
    const all = series.flatMap((s) => s.data);
    const xs = all.map((p) => p.x);
    const xd = d3.extent(xs) as [number, number];
    const xr: [number, number] = [m.l, Math.max(m.l + 1, w - m.r)];
    const x =
      xType === "time"
        ? (d3.scaleUtc().domain([new Date(xd[0] ?? 0), new Date(xd[1] ?? 1)]).range(xr) as unknown as d3.ScaleLinear<number, number>)
        : d3.scaleLinear().domain([xd[0] ?? 0, xd[1] ?? 1]).range(xr);
    const ext = (axis: "left" | "right") => {
      const ys = series.filter((s) => (s.axis ?? "left") === axis).flatMap((s) => s.data.map((p) => p.y).filter((v): v is number => v !== null && Number.isFinite(v)));
      let [a, b] = d3.extent(ys) as [number, number];
      if (a === undefined) return [0, 1] as [number, number];
      if (zeroBase) {
        a = Math.min(0, a);
        b = Math.max(0, b);
      }
      const pad = (b - a) * 0.08 || Math.abs(a) * 0.05 || 1;
      return [a - pad, b + pad] as [number, number];
    };
    const y = d3.scaleLinear().domain(yDomain ?? ext("left")).range([Math.max(m.t + 1, h - m.b), m.t]).nice(5);
    const yR = d3.scaleLinear().domain(yDomainRight ?? ext("right")).range([Math.max(m.t + 1, h - m.b), m.t]).nice(5);
    return { x, y, yR };
  }, [series, w, h, xType, yDomain, yDomainRight, m.l, m.r, m.t, m.b, zeroBase]);

  const xAt = (v: number) => scales.x(xType === "time" ? (new Date(v) as unknown as number) : v);

  const paths = useMemo(
    () =>
      series.map((s) => {
        const ys = s.axis === "right" ? scales.yR : scales.y;
        const line = d3
          .line<Pt>()
          .defined((p) => p.y !== null && Number.isFinite(p.y))
          .x((p) => xAt(p.x))
          .y((p) => ys(p.y as number))
          .curve(s.step ? d3.curveStepAfter : d3.curveMonotoneX);
        const area = d3
          .area<Pt>()
          .defined((p) => p.y !== null && Number.isFinite(p.y))
          .x((p) => xAt(p.x))
          .y0(ys(Math.max(ys.domain()[0], Math.min(0, ys.domain()[1]))))
          .y1((p) => ys(p.y as number))
          .curve(s.step ? d3.curveStepAfter : d3.curveMonotoneX);
        return { s, d: line(s.data) ?? "", a: s.area ? area(s.data) ?? "" : "" };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, scales],
  );

  const xTicks = useMemo(() => {
    const n = Math.max(2, Math.floor(w / 90));
    return (scales.x.ticks(n) as unknown as (Date | number)[]).map((t) => (t instanceof Date ? t.getTime() : t));
  }, [scales, w]);
  const fmtX = xFormat ?? (xType === "time" ? (v: number) => d3.utcFormat("%Y")(new Date(v)) : (v: number) => String(v));

  const nearest = (s: Series, x: number) => {
    const i = d3.bisector((p: Pt) => p.x).center(s.data, x);
    return s.data[i];
  };

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.target as SVGRectElement).getBoundingClientRect();
    const px = e.clientX - rect.left + m.l;
    const inv = scales.x.invert(px) as unknown as Date | number;
    const xv = inv instanceof Date ? inv.getTime() : inv;
    const base = series[0];
    if (!base || !base.data.length) return;
    const snap = nearest(base, xv)?.x ?? xv;
    setHx(snap);
    onHoverX?.(snap);
    tip.show(
      e.clientX,
      e.clientY,
      <div>
        <div className="mb-1 text-[9px] tracking-[0.14em] text-dim">{tooltipTitle ? tooltipTitle(snap) : xType === "time" ? d3.utcFormat("%b %d, %Y")(new Date(snap)) : fmtX(snap)}</div>
        {series.map((s) => {
          const p = nearest(s, snap);
          if (!p || p.y === null) return null;
          const f = s.axis === "right" && yFormatRight ? yFormatRight : yFormat;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span className="h-[2px] w-2.5" style={{ background: s.color }} />
              <span className="text-dim">{s.label ?? s.id}</span>
              <span className="ml-auto pl-3 text-ink">{f(p.y)}</span>
            </div>
          );
        })}
      </div>,
    );
  };

  return (
    <div ref={ref} className={className ?? "h-full w-full"}>
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="block overflow-visible">
          <defs>
            {series
              .filter((s) => s.area)
              .map((s) => (
                <linearGradient key={s.id} id={`lg-${s.id.replace(/[^a-z0-9]/gi, "")}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor={s.color} stopOpacity={0.32} />
                  <stop offset="1" stopColor={s.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
          </defs>
          {bands?.map((b, i) => (
            <g key={i}>
              <rect x={xAt(b.x0)} width={Math.max(1, xAt(b.x1) - xAt(b.x0))} y={m.t} height={h - m.t - m.b} fill={b.color ?? "rgba(255,61,100,0.07)"} />
              {b.label && (
                <text x={xAt(b.x0) + 2} y={m.t + 8} fontSize={7.5} fill="rgba(255,120,140,0.6)" letterSpacing="0.1em">
                  {b.label}
                </text>
              )}
            </g>
          ))}
          {grid &&
            scales.y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={w - m.r} y1={scales.y(t)} y2={scales.y(t)} stroke="var(--line)" />
                <text x={m.l - 5} y={scales.y(t) + 3} fontSize={8.5} textAnchor="end" fill="var(--text-faint)">
                  {yFormat(t)}
                </text>
              </g>
            ))}
          {hasRight &&
            scales.yR.ticks(5).map((t) => (
              <text key={t} x={w - m.r + 5} y={scales.yR(t) + 3} fontSize={8.5} fill="var(--text-faint)">
                {(yFormatRight ?? yFormat)(t)}
              </text>
            ))}
          {xTicks.map((t) => (
            <g key={t}>
              <line x1={xAt(t)} x2={xAt(t)} y1={h - m.b} y2={h - m.b + 3} stroke="var(--line-3)" />
              <text x={xAt(t)} y={h - m.b + 12} fontSize={8.5} textAnchor="middle" fill="var(--text-faint)">
                {fmtX(t)}
              </text>
            </g>
          ))}
          <line x1={m.l} x2={w - m.r} y1={h - m.b} y2={h - m.b} stroke="var(--line-2)" />
          {refLines?.map((r, i) => {
            const ys = r.axis === "right" ? scales.yR : scales.y;
            return (
              <g key={i}>
                <line x1={m.l} x2={w - m.r} y1={ys(r.y)} y2={ys(r.y)} stroke={r.color ?? "var(--line-3)"} strokeDasharray="3 3" />
                {r.label && (
                  <text x={w - m.r - 2} y={ys(r.y) - 3} fontSize={8} textAnchor="end" fill={r.color ?? "var(--text-dim)"}>
                    {r.label}
                  </text>
                )}
              </g>
            );
          })}
          {vLines?.map((v, i) => (
            <g key={i}>
              <line x1={xAt(v.x)} x2={xAt(v.x)} y1={m.t} y2={h - m.b} stroke={v.color ?? "var(--line-3)"} strokeDasharray="2 3" />
              {v.label && (
                <text x={xAt(v.x) + 3} y={m.t + 9} fontSize={8} fill={v.color ?? "var(--text-dim)"}>
                  {v.label}
                </text>
              )}
            </g>
          ))}
          {paths.map(({ s, a }) => a && <path key={s.id + "a"} d={a} fill={`url(#lg-${s.id.replace(/[^a-z0-9]/gi, "")})`} />)}
          {paths.map(({ s, d }) => (
            <path
              key={s.id}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={s.width ?? 1.3}
              strokeDasharray={s.dash}
              opacity={s.opacity ?? 1}
              style={{ filter: (s.width ?? 1.3) >= 1.3 ? `drop-shadow(0 0 3px ${s.color})` : undefined }}
            />
          ))}
          {hx !== null && (
            <g pointerEvents="none">
              <line x1={xAt(hx)} x2={xAt(hx)} y1={m.t} y2={h - m.b} stroke="var(--line-3)" />
              {series.map((s) => {
                const p = nearest(s, hx);
                if (!p || p.y === null) return null;
                const ys = s.axis === "right" ? scales.yR : scales.y;
                return <circle key={s.id} cx={xAt(p.x)} cy={ys(p.y)} r={2.6} fill="var(--bg)" stroke={s.color} strokeWidth={1.4} />;
              })}
            </g>
          )}
          <rect
            x={m.l}
            y={m.t}
            width={Math.max(0, w - m.l - m.r)}
            height={Math.max(0, h - m.t - m.b)}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={() => {
              setHx(null);
              onHoverX?.(null);
              tip.hide();
            }}
          />
        </svg>
      )}
    </div>
  );
}
