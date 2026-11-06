"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as d3 from "d3";
import { Panel } from "../../ui/Panel";
import { Segmented } from "../../ui/Controls";
import { Spark } from "../../ui/Spark";
import { LineChart, type Series } from "../../charts/LineChart";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import {
  ALL_MACRO_KEYS,
  CURVE_SNAPSHOTS,
  CURVE_TENORS,
  CURVE_YEARS,
  MACRO_META,
  RECESSIONS,
  YEARS,
  latestRef,
  modeledCurve,
  refSeries,
  refValue,
  type MacroKey,
} from "@/lib/data/macro";
import { useUI } from "@/lib/store/ui";
import { useMarket } from "@/lib/store/market";
import { linreg, mean, std, correlation } from "@/lib/stats";

const RateSurface = dynamic(() => import("./RateSurface"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center nx-label">building surface…</div> });

type Live = Partial<Record<MacroKey, { t: string; v: number }[]>>;

function useFred() {
  const fred = useUI((s) => s.dataStatus.fred);
  const [live, setLive] = useState<Live | null>(null);
  useEffect(() => {
    if (!fred) return;
    fetch("/api/macro")
      .then((r) => r.json())
      .then((j) => j.source === "fred" && setLive(j.series))
      .catch(() => {});
  }, [fred]);
  return live;
}

// ───────────────────────── yield curve ─────────────────────────

function YieldCurve({ hoverYear }: { hoverYear: number | null }) {
  const [ref, { w, h }] = useSize();
  const [on, setOn] = useState<string[]>(["2006", "2009", "2023", "2025"]);
  const quotes = useMarket((s) => s.quotes);
  const tip = useTip();
  const live = useMemo(() => {
    const y2 = quotes["US02Y"]?.price;
    const y10 = quotes["US10Y"]?.price;
    const y30 = quotes["US30Y"]?.price;
    if (!y2 || !y10 || !y30) return null;
    const short = 3.62; // policy-anchored front end (reference)
    // monotone interpolation in log-maturity through anchors
    const anchors: [number, number][] = [
      [1 / 12, short + 0.05],
      [0.25, short],
      [2, y2],
      [10, y10],
      [30, y30],
    ];
    const lx = anchors.map(([m]) => Math.log(m));
    const interp = d3.scaleLinear().domain(lx).range(anchors.map(([, v]) => v));
    return CURVE_YEARS.map((m) => interp(Math.log(m)));
  }, [quotes]);
  const m = { t: 10, r: 10, b: 20, l: 32 };
  const x = d3
    .scaleLog()
    .domain([1 / 12, 30])
    .range([m.l, Math.max(m.l + 1, w - m.r)]);
  const all = [...CURVE_SNAPSHOTS.filter((s) => on.includes(s.id)).flatMap((s) => s.y), ...(live ?? []), 0];
  const y = d3
    .scaleLinear()
    .domain([0, Math.max(6, ...all) + 0.3])
    .range([Math.max(m.t + 1, h - m.b), m.t]);
  const line = d3
    .line<number>()
    .x((_, i) => x(CURVE_YEARS[i]))
    .y((v) => y(v))
    .curve(d3.curveMonotoneX);
  const hoverCurve = hoverYear ? modeledCurve(hoverYear) : null;
  const spread = live ? (live[8] - live[4]) * 100 : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 px-2 pt-1.5">
        {CURVE_SNAPSHOTS.map((s) => (
          <button
            key={s.id}
            className="nx-btn !px-1.5 !py-[2px] !text-[8.5px]"
            data-active={on.includes(s.id)}
            title={s.note}
            onClick={() => setOn(on.includes(s.id) ? on.filter((x) => x !== s.id) : [...on, s.id])}
          >
            <span className="h-[2px] w-2" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
        {spread !== null && (
          <span className="ml-auto text-[9px] text-dim">
            2s10s <span className={spread >= 0 ? "text-pos" : "text-neg"}>{spread.toFixed(1)}bp</span> <span className="text-faint">(sim)</span>
          </span>
        )}
      </div>
      <div ref={ref} className="min-h-0 flex-1">
        {w > 0 && h > 0 && (
          <svg width={w} height={h}>
            {y.ticks(5).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                <text x={m.l - 5} y={y(t) + 3} fontSize={8.5} textAnchor="end" fill="var(--text-faint)">
                  {t}%
                </text>
              </g>
            ))}
            {CURVE_YEARS.map((mm, i) => (
              <text key={i} x={x(mm)} y={h - 6} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
                {CURVE_TENORS[i]}
              </text>
            ))}
            {CURVE_SNAPSHOTS.filter((s) => on.includes(s.id)).map((s) => (
              <g key={s.id}>
                <path d={line(s.y) ?? ""} fill="none" stroke={s.color} strokeWidth={1.3} opacity={0.85} />
                {s.y.map((v, i) => (
                  <circle
                    key={i}
                    cx={x(CURVE_YEARS[i])}
                    cy={y(v)}
                    r={2.4}
                    fill="var(--bg)"
                    stroke={s.color}
                    onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div className="text-dim">{s.label} · {CURVE_TENORS[i]}</div><div className="text-ink">{v.toFixed(2)}%</div><div className="text-[9px] text-faint">{s.note}</div></div>)}
                    onMouseLeave={() => tip.hide()}
                  />
                ))}
              </g>
            ))}
            {hoverCurve && <path d={line(hoverCurve) ?? ""} fill="none" stroke="#fff" strokeDasharray="3 3" strokeWidth={1} />}
            {live && (
              <g>
                <path d={line(live) ?? ""} fill="none" stroke="var(--a1)" strokeWidth={2} style={{ filter: "drop-shadow(0 0 4px var(--a1))" }} />
                <text x={w - m.r} y={y(live[10]) - 6} fontSize={8.5} textAnchor="end" fill="var(--a1)">
                  NOW (SIM)
                </text>
              </g>
            )}
            {hoverCurve && (
              <text x={m.l + 4} y={m.t + 8} fontSize={8.5} fill="#fff">
                {hoverYear} modeled curve
              </text>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── cycle clock ─────────────────────────

function CycleClock({ hoverYear, setHoverYear }: { hoverYear: number | null; setHoverYear: (y: number | null) => void }) {
  const [ref, { w, h }] = useSize();
  const pts = useMemo(
    () =>
      YEARS.slice(1).map((yr) => {
        const g = refValue("gdp", yr) ?? 0;
        const c = refValue("cpi", yr) ?? 0;
        const cp = refValue("cpi", yr - 1) ?? 0;
        return { yr, x: g - 2.5, y: c - cp };
      }),
    [],
  );
  const m = 18;
  const ext = Math.max(...pts.map((p) => Math.abs(p.x))) * 1.05;
  const exty = Math.max(...pts.map((p) => Math.abs(p.y))) * 1.05;
  const x = d3.scaleLinear().domain([-ext, ext]).range([m, w - m]);
  const y = d3.scaleLinear().domain([-exty, exty]).range([h - m, m]);
  const q = [
    { label: "REFLATION / OVERHEAT", x: 1, y: 1, c: "var(--warn)" },
    { label: "GOLDILOCKS", x: 1, y: -1, c: "var(--pos)" },
    { label: "STAGFLATION", x: -1, y: 1, c: "var(--neg)" },
    { label: "DISINFLATIONARY BUST", x: -1, y: -1, c: "var(--a4)" },
  ];
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h}>
          <circle cx={x(0)} cy={y(0)} r={Math.min(w, h) * 0.18} fill="none" stroke="var(--line)" />
          <circle cx={x(0)} cy={y(0)} r={Math.min(w, h) * 0.36} fill="none" stroke="var(--line)" strokeDasharray="2 4" />
          <line x1={m} x2={w - m} y1={y(0)} y2={y(0)} stroke="var(--line-2)" />
          <line x1={x(0)} x2={x(0)} y1={m} y2={h - m} stroke="var(--line-2)" />
          {q.map((qq) => (
            <text key={qq.label} x={qq.x > 0 ? w - m - 2 : m + 2} y={qq.y > 0 ? m + 8 : h - m - 4} fontSize={7.5} letterSpacing="0.14em" textAnchor={qq.x > 0 ? "end" : "start"} fill={qq.c} opacity={0.75}>
              {qq.label}
            </text>
          ))}
          <text x={w - m} y={y(0) - 4} fontSize={7.5} textAnchor="end" fill="var(--text-faint)">
            GROWTH vs TREND →
          </text>
          <text x={x(0) + 4} y={m + 18} fontSize={7.5} fill="var(--text-faint)">
            ↑ Δ INFLATION
          </text>
          {pts.slice(1).map((p, i) => {
            const a = pts[i];
            const t = i / pts.length;
            return <line key={p.yr} x1={x(a.x)} y1={y(a.y)} x2={x(p.x)} y2={y(p.y)} stroke="var(--a1)" strokeOpacity={0.12 + t * 0.7} strokeWidth={0.6 + t * 1.2} />;
          })}
          {pts.map((p, i) => {
            const recent = i > pts.length - 7;
            const hot = p.yr === hoverYear;
            return (
              <g key={p.yr} onMouseEnter={() => setHoverYear(p.yr)} onMouseLeave={() => setHoverYear(null)} style={{ cursor: "pointer" }}>
                <circle cx={x(p.x)} cy={y(p.y)} r={hot ? 5 : recent ? 3 : 2} fill={hot ? "#fff" : recent ? "var(--a1)" : "var(--text-dim)"} style={{ filter: recent ? "drop-shadow(0 0 4px var(--a1))" : undefined }} />
                {(recent || hot || [2008, 2009, 2020, 2021, 2022, 1991, 2001].includes(p.yr)) && (
                  <text x={x(p.x) + 5} y={y(p.y) - 4} fontSize={8} fill={hot ? "#fff" : recent ? "var(--a1)" : "var(--text-faint)"}>
                    {p.yr}
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

// ───────────────────────── relationship explorer ─────────────────────────

function Relationship() {
  const [xk, setX] = useState<MacroKey>("unemployment");
  const [yk, setY] = useState<MacroKey>("corePce");
  const [lag, setLag] = useState(0);
  const [ref, { w, h }] = useSize();
  const tip = useTip();
  const pts = useMemo(() => {
    const out: { yr: number; x: number; y: number }[] = [];
    for (const yr of YEARS) {
      const xv = refValue(xk, yr);
      const yv = refValue(yk, yr + lag);
      if (xv !== null && yv !== null) out.push({ yr, x: xv, y: yv });
    }
    return out;
  }, [xk, yk, lag]);
  const reg = useMemo(() => linreg(pts.map((p) => p.x), pts.map((p) => p.y)), [pts]);
  const r = correlation(pts.map((p) => p.x), pts.map((p) => p.y));
  const m = { t: 8, r: 8, b: 18, l: 34 };
  const x = d3.scaleLinear().domain(d3.extent(pts, (p) => p.x) as [number, number]).nice().range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain(d3.extent(pts, (p) => p.y) as [number, number]).nice().range([h - m.b, m.t]);
  const dec = (yr: number) => ["#4d8bff", "#9a6bff", "#3dff9a", "#ffb547"][Math.min(3, Math.floor((yr - 1990) / 10))];
  const opts = ALL_MACRO_KEYS.map((k) => ({ value: k, label: MACRO_META[k].short }));
  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-1.5 px-2 pt-1.5">
        <select className="nx-input !py-0.5 !text-[10px]" value={xk} onChange={(e) => setX(e.target.value as MacroKey)}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              X · {o.label}
            </option>
          ))}
        </select>
        <select className="nx-input !py-0.5 !text-[10px]" value={yk} onChange={(e) => setY(e.target.value as MacroKey)}>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              Y · {o.label}
            </option>
          ))}
        </select>
        <Segmented value={String(lag)} onChange={(v) => setLag(Number(v))} options={[0, 1, 2].map((l) => ({ value: String(l), label: `L${l}`, title: `Y lagged ${l} year(s)` }))} />
      </div>
      <div className="flex gap-3 px-2 py-1 text-[9px]">
        <span className="text-dim">
          r <span className="text-a1">{r.toFixed(2)}</span>
        </span>
        <span className="text-dim">
          R² <span className="text-a1">{reg.r2.toFixed(2)}</span>
        </span>
        <span className="text-dim">
          slope <span className="text-ink">{reg.slope.toFixed(2)}</span>
        </span>
        <span className="text-dim">n {pts.length}</span>
        <span className="ml-auto flex gap-2">
          {["90s", "00s", "10s", "20s"].map((d, i) => (
            <span key={d} style={{ color: dec(1990 + i * 10) }}>
              ● {d}
            </span>
          ))}
        </span>
      </div>
      <div ref={ref} className="min-h-0 flex-1">
        {w > 0 && h > 0 && pts.length > 1 && (
          <svg width={w} height={h}>
            {y.ticks(4).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                <text x={m.l - 4} y={y(t) + 3} fontSize={8} textAnchor="end" fill="var(--text-faint)">
                  {t}
                </text>
              </g>
            ))}
            {x.ticks(5).map((t) => (
              <text key={t} x={x(t)} y={h - 5} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
                {t}
              </text>
            ))}
            <line x1={x(x.domain()[0])} y1={y(reg.intercept + reg.slope * x.domain()[0])} x2={x(x.domain()[1])} y2={y(reg.intercept + reg.slope * x.domain()[1])} stroke="var(--a1)" strokeDasharray="4 3" opacity={0.7} />
            {pts.map((p) => (
              <circle
                key={p.yr}
                cx={x(p.x)}
                cy={y(p.y)}
                r={3}
                fill={dec(p.yr)}
                opacity={0.85}
                onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div className="text-dim">{p.yr}{lag ? ` → ${p.yr + lag}` : ""}</div><div>{MACRO_META[xk].short}: {MACRO_META[xk].fmt(p.x)}</div><div>{MACRO_META[yk].short}: {MACRO_META[yk].fmt(p.y)}</div></div>)}
                onMouseLeave={() => tip.hide()}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

function TaylorRule() {
  const [rstar, setRstar] = useState(0.75);
  const ustar = 4.3;
  const data = useMemo(() => {
    const actual = refSeries("fedfunds");
    const taylor = YEARS.map((yr) => {
      const pi = refValue("corePce", yr) ?? 2;
      const u = refValue("unemployment", yr) ?? ustar;
      const gap = -2 * (u - ustar); // Okun's law approximation
      return { x: Date.UTC(yr, 6, 1), y: Math.max(-4, rstar + pi + 0.5 * (pi - 2) + 0.5 * gap) };
    });
    return { actual, taylor };
  }, [rstar]);
  const last = data.taylor[data.taylor.length - 1].y ?? 0;
  const ff = latestRef("fedfunds").value;
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 pt-1.5 text-[9px] text-dim">
        <span>i = r* + π + 0.5(π − 2) + 0.5·gap</span>
        <span className="ml-auto">r*</span>
        <Segmented value={String(rstar)} onChange={(v) => setRstar(Number(v))} options={[0.5, 0.75, 1.0, 1.25].map((v) => ({ value: String(v), label: v.toFixed(2) }))} />
      </div>
      <div className="px-2 py-1 text-[9.5px]">
        <span className="text-dim">Rule-implied {YEARS[YEARS.length - 1]}: </span>
        <span className="text-a1">{last.toFixed(2)}%</span>
        <span className="text-dim"> vs actual </span>
        <span className="text-ink">{ff.toFixed(2)}%</span>
        <span className={ff > last ? "text-neg" : "text-pos"}> → policy {ff > last ? "tighter" : "looser"} than rule by {Math.abs(ff - last).toFixed(2)}pp</span>
      </div>
      <div className="min-h-0 flex-1">
        <LineChart
          series={[
            { id: "ff", label: "Fed funds (actual)", data: data.actual, color: "var(--a1)", step: true },
            { id: "tr", label: "Taylor rule", data: data.taylor, color: "#ffb547", dash: "4 3", width: 1.2 },
          ]}
          bands={RECESSIONS.map((r) => ({ x0: r.from, x1: r.to }))}
          yFormat={(v) => `${v.toFixed(0)}%`}
          refLines={[{ y: 0 }]}
          margin={{ t: 6, r: 8, b: 16, l: 28 }}
        />
      </div>
      <div className="px-2 pb-1 text-[8.5px] text-faint">π = core PCE, gap ≈ −2·(u − {ustar}%) via Okun&apos;s law. Annual averages — educational approximation.</div>
    </div>
  );
}

// ───────────────────────── module ─────────────────────────

export function MacroModule() {
  const live = useFred();
  const [sel, setSel] = useState<MacroKey[]>(["fedfunds", "cpi", "unemployment", "y10"]);
  const [norm, setNorm] = useState<"raw" | "z">("raw");
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [surf, setSurf] = useState<{ y: number | null; t: number | null; v: number | null }>({ y: null, t: null, v: null });
  const [rightTab, setRightTab] = useState<"rel" | "taylor">("rel");
  const effectiveYear = surf.y ?? hoverYear;

  const seriesFor = (k: MacroKey) => {
    const l = live?.[k];
    if (l && l.length) return { data: l.map((p) => ({ x: Date.parse(p.t), y: p.v })), live: true };
    return { data: refSeries(k), live: false };
  };

  const series: Series[] = useMemo(
    () =>
      sel.map((k) => {
        const s = seriesFor(k);
        let data = s.data;
        if (norm === "z") {
          const vals = data.map((p) => p.y).filter((v): v is number => v !== null);
          const mu = mean(vals);
          const sd = std(vals) || 1;
          data = data.map((p) => ({ x: p.x, y: p.y === null ? null : (p.y - mu) / sd }));
        }
        const meta = MACRO_META[k];
        return { id: k, label: meta.short, data, color: meta.color, axis: norm === "raw" && meta.unit !== "%" ? "right" : "left", area: sel.length === 1 } as Series;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sel, norm, live],
  );

  const anyLive = !!live && sel.some((k) => live[k]?.length);

  return (
    <div className="grid h-full grid-cols-[236px_minmax(0,1fr)_340px] gap-2 p-2">
      <Panel title="Indicators" code="04.A" source={live ? "LIVE" : "REF"} bodyClassName="overflow-y-auto">
        <div className="px-2 py-1.5 text-[9px] leading-snug text-faint">
          Select up to 5 series to overlay. {live ? "FRED live series active." : "Annual reference averages; add FRED_API_KEY for live monthly data."}
        </div>
        {ALL_MACRO_KEYS.map((k) => {
          const meta = MACRO_META[k];
          const s = seriesFor(k);
          const vals = s.data.map((p) => p.y).filter((v): v is number => v !== null);
          const lastV = vals[vals.length - 1];
          const prevV = vals[vals.length - (s.live ? 13 : 2)];
          const on = sel.includes(k);
          return (
            <button
              key={k}
              onClick={() => setSel(on ? sel.filter((x) => x !== k) : sel.length >= 5 ? [...sel.slice(1), k] : [...sel, k])}
              className={`grid w-full grid-cols-[3px_1fr_64px] items-center gap-2 border-b border-line/60 px-2 py-1.5 text-left transition ${on ? "bg-a1/[0.06]" : "hover:bg-white/[0.02]"}`}
              title={meta.desc}
            >
              <span className="h-7 w-[3px]" style={{ background: on ? meta.color : "var(--line-2)", boxShadow: on ? `0 0 8px ${meta.color}` : undefined }} />
              <span className="min-w-0">
                <span className="block truncate text-[10px] text-ink/90">{meta.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[12px] text-ink">{meta.fmt(lastV)}</span>
                  {prevV !== undefined && (
                    <span className={`text-[8.5px] ${lastV - prevV > 0 ? "text-pos" : "text-neg"}`}>
                      {lastV - prevV > 0 ? "▲" : "▼"}
                      {Math.abs(lastV - prevV).toFixed(2)}
                    </span>
                  )}
                </span>
              </span>
              <Spark data={vals.slice(-(s.live ? 120 : 16))} width={64} height={22} color={meta.color} />
            </button>
          );
        })}
      </Panel>

      <div className="grid min-h-0 grid-rows-[minmax(0,1.05fr)_minmax(0,1fr)] gap-2">
        <Panel
          title="Macro Time Series · Recessions shaded"
          code="04.B"
          source={anyLive ? "LIVE" : "REF"}
          expandId="mac-ts"
          right={
            <Segmented
              value={norm}
              onChange={setNorm}
              options={[
                { value: "raw", label: "Levels" },
                { value: "z", label: "Z-score", title: "Standardize each series to compare cycles" },
              ]}
            />
          }
          bodyClassName="p-1"
        >
          <div className="flex flex-wrap gap-3 px-2 pt-1">
            {sel.map((k) => (
              <span key={k} className="flex items-center gap-1 text-[9px] text-dim">
                <span className="h-[2px] w-3" style={{ background: MACRO_META[k].color }} />
                {MACRO_META[k].label}
                {norm === "raw" && MACRO_META[k].unit !== "%" ? " (R)" : ""}
              </span>
            ))}
          </div>
          <div className="absolute inset-x-1 bottom-1 top-6">
            <LineChart
              series={series}
              bands={RECESSIONS.map((r) => ({ x0: r.from, x1: r.to, label: r.label }))}
              yFormat={(v) => (norm === "z" ? `${v.toFixed(1)}σ` : `${v.toFixed(1)}`)}
              yFormatRight={(v) => v.toFixed(1)}
              refLines={norm === "z" ? [{ y: 0 }] : [{ y: 2, label: "2% target", color: "rgba(255,138,208,0.5)" }]}
              tooltipTitle={(x) => (anyLive ? new Date(x).toISOString().slice(0, 7) : `${new Date(x).getUTCFullYear()} annual avg`)}
            />
          </div>
        </Panel>
        <div className="grid min-h-0 grid-cols-2 gap-2">
          <Panel title="Treasury Yield Curve" code="04.C" source="REF" expandId="mac-curve">
            <YieldCurve hoverYear={effectiveYear} />
          </Panel>
          <Panel
            title="Rate Surface 1990–2025 · 3D"
            code="04.D"
            source="MODEL"
            expandId="mac-surf"
            right={
              <span className="text-[9px] text-dim">
                {surf.y !== null && surf.t !== null ? (
                  <>
                    <span className="text-ink">{surf.y}</span> · {CURVE_TENORS[surf.t]} · <span className="text-a1">{surf.v?.toFixed(2)}%</span>
                  </>
                ) : (
                  "hover surface"
                )}
              </span>
            }
          >
            <RateSurface year={effectiveYear} onHover={(y, t, v) => setSurf({ y, t, v })} />
            <div className="pointer-events-none absolute bottom-1.5 left-2 text-[8px] leading-relaxed tracking-[0.12em] text-faint">
              X MATURITY 1M→30Y (LOG) · Z YEAR 1990→2025 · Y YIELD
              <br />
              NELSON–SIEGEL FIT THROUGH FED FUNDS, 2Y & 10Y ANNUAL AVERAGES
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <Panel title="Business Cycle Clock" code="04.E" source="REF" expandId="mac-clock" bodyClassName="p-1">
          <CycleClock hoverYear={effectiveYear} setHoverYear={setHoverYear} />
        </Panel>
        <Panel
          title={rightTab === "rel" ? "Relationships" : "Policy Rule"}
          code="04.F"
          source={rightTab === "rel" ? "REF" : "MODEL"}
          expandId="mac-rel"
          right={
            <Segmented
              value={rightTab}
              onChange={setRightTab}
              options={[
                { value: "rel", label: "Scatter" },
                { value: "taylor", label: "Taylor" },
              ]}
            />
          }
        >
          {rightTab === "rel" ? <Relationship /> : <TaylorRule />}
        </Panel>
      </div>
    </div>
  );
}
