"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { sankey, sankeyLinkHorizontal, type SankeyLink, type SankeyNode } from "d3-sankey";
import { motion } from "framer-motion";
import { Panel } from "../../ui/Panel";
import { Segmented } from "../../ui/Controls";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { HBars } from "../../charts/Bars";
import { FLOW_NODES, FLOW_SCENARIOS, scenarioLinks, type FlowNode } from "@/lib/data/flows";
import { getAllHistory } from "@/lib/sim/engine";
import { EQUITY_SYMBOLS, INSTRUMENT_MAP, SECTORS, type SectorId } from "@/lib/data/universe";
import { createRng } from "@/lib/rng";
import { useSettings } from "@/lib/store/settings";

type SN = SankeyNode<FlowNode, object>;
type SL = SankeyLink<FlowNode, { v: number; value: number }>;

// ───────────────────────── Sankey ─────────────────────────

function FlowSankey({ scenario, focus, setFocus }: { scenario: string; focus: string | null; setFocus: (id: string | null) => void }) {
  const [ref, { w, h }] = useSize();
  const canvas = useRef<HTMLCanvasElement>(null);
  const tip = useTip();
  const density = useSettings((s) => s.particles);
  const [hoverLink, setHoverLink] = useState<number | null>(null);

  const graph = useMemo(() => {
    if (!w || !h) return null;
    const sc = FLOW_SCENARIOS.find((s) => s.id === scenario)!;
    const links = scenarioLinks(sc);
    const gen = sankey<FlowNode, { v: number }>()
      .nodeId((d) => d.id)
      .nodeWidth(10)
      .nodePadding(9)
      .nodeSort(null)
      .extent([
        [178, 8],
        [w - 160, h - 8],
      ]);
    return gen({ nodes: FLOW_NODES.map((n) => ({ ...n })), links: links.map((l) => ({ source: l.s, target: l.t, v: l.v, value: l.v })) as never });
  }, [w, h, scenario]);

  const linkPath = sankeyLinkHorizontal();
  const active = (l: SL) => !focus || (l.source as SN).id === focus || (l.target as SN).id === focus;

  // particles along links
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !graph || !w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    const rng = createRng(11);
    type P = { li: number; t: number; speed: number; off: number };
    const parts: P[] = [];
    graph.links.forEach((l, li) => {
      const n = Math.max(1, Math.round(l.value * 9 * density));
      for (let k = 0; k < n; k++) parts.push({ li, t: rng.next(), speed: 0.06 + rng.next() * 0.08, off: rng.range(-0.42, 0.42) });
    });
    let raf = 0;
    let last = performance.now();
    const lens = graph.links.map((_, i) => pathRefs.current[i]?.getTotalLength() ?? 0);
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";
      for (const p of parts) {
        p.t += p.speed * dt;
        if (p.t > 1) p.t -= 1;
        const l = graph.links[p.li] as SL;
        const el = pathRefs.current[p.li];
        if (!el || !lens[p.li]) continue;
        const on = active(l);
        const pt = el.getPointAtLength(p.t * lens[p.li]);
        const y = pt.y + p.off * (l.width ?? 2);
        const col = (l.source as SN).col === 0 ? (l.source as SN).color : (l.target as SN).color;
        const a = on ? 0.9 * Math.sin(p.t * Math.PI) : 0.06;
        ctx.fillStyle = col;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(pt.x, y, on ? 1.4 : 1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    // wait one frame so path elements reflect the latest layout
    raf = requestAnimationFrame(() => {
      for (let i = 0; i < graph.links.length; i++) lens[i] = pathRefs.current[i]?.getTotalLength() ?? 0;
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, w, h, focus, density]);

  return (
    <div ref={ref} className="relative h-full w-full">
      {graph && (
        <svg width={w} height={h} className="absolute inset-0">
          <defs>
            {graph.links.map((l, i) => (
              <linearGradient key={i} id={`fl-${i}`} gradientUnits="userSpaceOnUse" x1={(l.source as SN).x1} x2={(l.target as SN).x0}>
                <stop offset="0" stopColor={(l.source as SN).color} />
                <stop offset="1" stopColor={(l.target as SN).color} />
              </linearGradient>
            ))}
          </defs>
          {graph.links.map((l, i) => {
            const on = active(l as SL);
            return (
              <motion.path
                key={`${(l.source as SN).id}-${(l.target as SN).id}`}
                ref={(el) => void (pathRefs.current[i] = el)}
                initial={false}
                animate={{ d: linkPath(l as never) ?? "", strokeWidth: Math.max(1, l.width ?? 1), opacity: on ? (hoverLink === i ? 0.62 : 0.3) : 0.05 }}
                transition={{ duration: 0.9, ease: [0.3, 0.7, 0.2, 1] }}
                fill="none"
                stroke={`url(#fl-${i})`}
                onMouseEnter={() => setHoverLink(i)}
                onMouseMove={(e) =>
                  tip.show(
                    e.clientX,
                    e.clientY,
                    <div>
                      <div className="text-ink">
                        {(l.source as SN).label} → {(l.target as SN).label}
                      </div>
                      <div className="text-[13px] text-a1">${l.value.toFixed(2)}T</div>
                      <div className="text-faint">illustrative annual allocation (MODEL)</div>
                    </div>,
                  )
                }
                onMouseLeave={() => {
                  setHoverLink(null);
                  tip.hide();
                }}
              />
            );
          })}
          {graph.nodes.map((n) => {
            const nn = n as SN;
            const on = !focus || focus === nn.id || graph.links.some((l) => active(l as SL) && ((l.source as SN).id === nn.id || (l.target as SN).id === nn.id));
            const left = nn.col === 0;
            const right = nn.col === 2;
            return (
              <g key={nn.id} style={{ cursor: "pointer" }} onClick={() => setFocus(focus === nn.id ? null : nn.id)} opacity={on ? 1 : 0.25}>
                <motion.rect
                  initial={false}
                  animate={{ x: nn.x0, y: nn.y0, height: Math.max(1, (nn.y1 ?? 0) - (nn.y0 ?? 0)) }}
                  transition={{ duration: 0.9 }}
                  width={(nn.x1 ?? 0) - (nn.x0 ?? 0)}
                  fill={nn.color}
                  style={{ filter: `drop-shadow(0 0 6px ${nn.color})` }}
                />
                <motion.text
                  initial={false}
                  animate={{ x: left ? (nn.x0 ?? 0) - 8 : right ? (nn.x1 ?? 0) + 8 : (nn.x1 ?? 0) + 6, y: ((nn.y0 ?? 0) + (nn.y1 ?? 0)) / 2 + 3 }}
                  transition={{ duration: 0.9 }}
                  fontSize={9.5}
                  textAnchor={left ? "end" : "start"}
                  fill={focus === nn.id ? "#fff" : "var(--text)"}
                >
                  {nn.label}
                  <tspan fill="var(--text-faint)" dx={5}>
                    ${(nn.value ?? 0).toFixed(1)}T
                  </tspan>
                </motion.text>
              </g>
            );
          })}
        </svg>
      )}
      <canvas ref={canvas} className="pointer-events-none absolute inset-0" style={{ width: w, height: h }} />
      <div className="pointer-events-none absolute bottom-1 left-2 flex gap-6 text-[8px] tracking-[0.2em] text-faint">
        <span>ALLOCATORS</span>
      </div>
      <div className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] tracking-[0.2em] text-faint">VEHICLES</div>
      <div className="pointer-events-none absolute bottom-1 right-2 text-[8px] tracking-[0.2em] text-faint">ASSET CLASSES</div>
    </div>
  );
}

// ───────────────────────── weekly fund flows (streamgraph) ─────────────────────────

const STREAM_KEYS = ["US Equity", "Intl Equity", "Govt Bonds", "Credit", "Money Market", "Commodities", "Crypto"];
const STREAM_COLORS = ["#35e7ff", "#3d7bff", "#e8f0ff", "#9fd4ff", "#ffd166", "#ff9f43", "#ff3d64"];

function FundFlows() {
  const [ref, { w, h }] = useSize();
  const tip = useTip();
  const data = useMemo(() => {
    const hist = getAllHistory();
    const spx = hist["SPX"];
    const rng = createRng("fund-flows");
    const weeks: Record<string, number>[] = [];
    for (let k = spx.length - 52 * 5; k < spx.length; k += 5) {
      const r = spx[k].close / spx[k - 5].close - 1; // weekly performance drives flows (performance chasing)
      const rr = hist["IEF"][k].close / hist["IEF"][k - 5].close - 1;
      const g = hist["GOLD"][k].close / hist["GOLD"][k - 5].close - 1;
      const b = hist["BTC"][k].close / hist["BTC"][k - 5].close - 1;
      weeks.push({
        t: spx[k].time * 1000,
        "US Equity": 18 + r * 700 + rng.normal() * 4,
        "Intl Equity": 6 + r * 300 + rng.normal() * 3,
        "Govt Bonds": 9 - r * 250 + rr * 600 + rng.normal() * 3,
        Credit: 7 + r * 200 + rng.normal() * 2.5,
        "Money Market": 14 - r * 550 + rng.normal() * 4,
        Commodities: 2 + g * 120 + rng.normal() * 1,
        Crypto: 1.2 + b * 40 + rng.normal() * 0.8,
      });
    }
    // 3-week centered moving average — weekly flow prints are noisy
    return weeks.map((wk, i) => {
      const win = weeks.slice(Math.max(0, i - 1), i + 2);
      const o: Record<string, number> = { t: wk.t };
      for (const k of STREAM_KEYS) o[k] = win.reduce((s, x) => s + x[k], 0) / win.length;
      return o;
    });
  }, []);
  const stack = useMemo(
    () =>
      d3
        .stack<Record<string, number>>()
        .keys(STREAM_KEYS)
        .offset(d3.stackOffsetDiverging)
        .order(d3.stackOrderNone)(data),
    [data],
  );
  const m = { t: 8, r: 8, b: 18, l: 34 };
  const x = d3
    .scaleUtc()
    .domain(d3.extent(data, (d) => d.t) as [number, number])
    .range([m.l, w - m.r]);
  const lo = d3.min(stack, (s) => d3.min(s, (p) => p[0])) ?? 0;
  const hi = d3.max(stack, (s) => d3.max(s, (p) => p[1])) ?? 1;
  const y = d3.scaleLinear().domain([lo, hi]).nice().range([h - m.b, m.t]);
  const area = d3
    .area<d3.SeriesPoint<Record<string, number>>>()
    .x((p) => x(p.data.t))
    .y0((p) => y(p[0]))
    .y1((p) => y(p[1]))
    .curve(d3.curveBasis);
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-3 px-2 pt-1.5">
        {STREAM_KEYS.map((k, i) => (
          <span key={k} className="flex items-center gap-1 text-[8.5px] text-dim">
            <span className="h-1.5 w-2" style={{ background: STREAM_COLORS[i] }} />
            {k}
          </span>
        ))}
      </div>
      <div ref={ref} className="min-h-0 flex-1">
        {w > 0 && h > 0 && (
          <svg width={w} height={h}>
            {y.ticks(4).map((t) => (
              <g key={t}>
                <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                <text x={m.l - 4} y={y(t) + 3} fontSize={8} textAnchor="end" fill="var(--text-faint)">
                  ${t}B
                </text>
              </g>
            ))}
            {stack.map((s, i) => (
              <path
                key={s.key}
                d={area(s) ?? ""}
                fill={STREAM_COLORS[i]}
                fillOpacity={0.55}
                stroke={STREAM_COLORS[i]}
                strokeWidth={0.6}
                onMouseMove={(e) => {
                  const xv = x.invert(e.nativeEvent.offsetX).getTime();
                  const idx = d3.bisector((d: Record<string, number>) => d.t).center(data, xv);
                  tip.show(e.clientX, e.clientY, <div><div className="text-dim">Week of {new Date(data[idx].t).toISOString().slice(0, 10)}</div><div style={{ color: STREAM_COLORS[i] }}>{s.key}</div><div>{data[idx][s.key] >= 0 ? "+" : ""}${data[idx][s.key].toFixed(1)}B net flow</div></div>);
                }}
                onMouseLeave={() => tip.hide()}
              />
            ))}
            <line x1={m.l} x2={w - m.r} y1={y(0)} y2={y(0)} stroke="var(--line-3)" />
            {x.ticks(6).map((t) => (
              <text key={+t} x={x(t)} y={h - 5} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
                {d3.utcFormat("%b")(t)}
              </text>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Relative Rotation Graph ─────────────────────────

const SECTOR_COLORS = d3.schemeTableau10.concat(["#ff3d8b"]);

function useRRG() {
  return useMemo(() => {
    const hist = getAllHistory();
    const spx = hist["SPX"].map((b) => b.close);
    const N = spx.length;
    const series: Record<SectorId, { ratio: number; mom: number }[]> = {} as never;
    for (const [si, sec] of SECTORS.entries()) {
      void si;
      const members = EQUITY_SYMBOLS.filter((s) => INSTRUMENT_MAP[s].sector === sec.id);
      const caps = members.map((s) => INSTRUMENT_MAP[s].mcap ?? 1);
      const tot = caps.reduce((a, b) => a + b, 0);
      // cap-weighted sector index from daily returns
      const idx = [100];
      for (let t = 1; t < N; t++) {
        let r = 0;
        members.forEach((s, k) => (r += (caps[k] / tot) * (hist[s][t].close / hist[s][t - 1].close - 1)));
        idx.push(idx[t - 1] * (1 + r));
      }
      const rs = idx.map((v, t) => v / spx[t]);
      const ema = (arr: number[], n: number) => {
        const a = 2 / (n + 1);
        const out = [arr[0]];
        for (let i = 1; i < arr.length; i++) out.push(out[i - 1] + a * (arr[i] - out[i - 1]));
        return out;
      };
      const rsE = ema(rs, 50);
      const ratio = rs.map((v, t) => 100 + ((v / rsE[t]) - 1) * 100 * 2.2);
      const ratioE = ema(ratio, 10);
      const mom = ratio.map((v, t) => 100 + (v / ratioE[t] - 1) * 100 * 4);
      const weekly: { ratio: number; mom: number }[] = [];
      for (let t = 120; t < N; t += 5) weekly.push({ ratio: ratio[t], mom: mom[t] });
      series[sec.id] = weekly;
    }
    return series;
  }, []);
}

function RRG() {
  const data = useRRG();
  const len = data[SECTORS[0].id].length;
  const [t, setT] = useState(len - 1);
  const [playing, setPlaying] = useState(false);
  const [ref, { w, h }] = useSize();
  const tail = 6;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setT((v) => (v >= len - 1 ? tail : v + 1)), 260);
    return () => clearInterval(id);
  }, [playing, len]);
  const pts = SECTORS.flatMap((s) => data[s.id].slice(Math.max(0, t - tail), t + 1));
  const ext = Math.max(2.5, ...pts.map((p) => Math.max(Math.abs(p.ratio - 100), Math.abs(p.mom - 100)))) * 1.1;
  const m = 14;
  const x = d3.scaleLinear().domain([100 - ext, 100 + ext]).range([m, w - m]);
  const y = d3.scaleLinear().domain([100 - ext, 100 + ext]).range([h - m, m]);
  const quad = [
    { l: "LEADING", x: 1, y: 1, c: "var(--pos)" },
    { l: "WEAKENING", x: 1, y: -1, c: "var(--warn)" },
    { l: "LAGGING", x: -1, y: -1, c: "var(--neg)" },
    { l: "IMPROVING", x: -1, y: 1, c: "var(--a4)" },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-2 pt-1.5">
        <button className="nx-btn !py-[2px]" data-active={playing} onClick={() => setPlaying(!playing)}>
          {playing ? "❚❚ Pause" : "▶ Replay"}
        </button>
        <input type="range" className="nx-range flex-1" min={tail} max={len - 1} value={t} onChange={(e) => setT(Number(e.target.value))} style={{ ["--fill" as string]: `${((t - tail) / (len - 1 - tail)) * 100}%` }} />
        <span className="w-[52px] text-right text-[9px] text-dim">W−{len - 1 - t}</span>
      </div>
      <div ref={ref} className="min-h-0 flex-1">
        {w > 0 && h > 0 && (
          <svg width={w} height={h}>
            {quad.map((q) => (
              <g key={q.l}>
                <rect x={q.x > 0 ? x(100) : m} y={q.y > 0 ? m : y(100)} width={q.x > 0 ? w - m - x(100) : x(100) - m} height={q.y > 0 ? y(100) - m : h - m - y(100)} fill={q.c} opacity={0.035} />
                <text x={q.x > 0 ? w - m - 4 : m + 4} y={q.y > 0 ? m + 10 : h - m - 4} fontSize={8} letterSpacing="0.18em" textAnchor={q.x > 0 ? "end" : "start"} fill={q.c} opacity={0.75}>
                  {q.l}
                </text>
              </g>
            ))}
            <line x1={x(100)} x2={x(100)} y1={m} y2={h - m} stroke="var(--line-3)" />
            <line x1={m} x2={w - m} y1={y(100)} y2={y(100)} stroke="var(--line-3)" />
            <text x={w - m} y={y(100) - 4} fontSize={7.5} textAnchor="end" fill="var(--text-faint)">
              RS-RATIO →
            </text>
            <text x={x(100) + 4} y={m + 20} fontSize={7.5} fill="var(--text-faint)">
              ↑ RS-MOMENTUM
            </text>
            {SECTORS.map((s, i) => {
              const tr = data[s.id].slice(Math.max(0, t - tail), t + 1);
              const head = tr[tr.length - 1];
              const c = SECTOR_COLORS[i];
              return (
                <g key={s.id}>
                  <path
                    d={d3
                      .line<{ ratio: number; mom: number }>()
                      .x((p) => x(p.ratio))
                      .y((p) => y(p.mom))
                      .curve(d3.curveCatmullRom)(tr) ?? ""}
                    fill="none"
                    stroke={c}
                    strokeWidth={1.2}
                    opacity={0.7}
                  />
                  {tr.slice(0, -1).map((p, k) => (
                    <circle key={k} cx={x(p.ratio)} cy={y(p.mom)} r={1.4} fill={c} opacity={0.3 + (k / tail) * 0.5} />
                  ))}
                  <circle cx={x(head.ratio)} cy={y(head.mom)} r={4} fill={c} style={{ filter: `drop-shadow(0 0 5px ${c})` }} />
                  <text x={x(head.ratio) + 6} y={y(head.mom) + 3} fontSize={8.5} fill={c}>
                    {s.id}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── module ─────────────────────────

export function FlowsModule() {
  const [scenario, setScenario] = useState("base");
  const [focus, setFocus] = useState<string | null>(null);
  const sc = FLOW_SCENARIOS.find((s) => s.id === scenario)!;
  const base = useMemo(() => scenarioLinks(FLOW_SCENARIOS[0]), []);
  const cur = useMemo(() => scenarioLinks(sc), [sc]);
  const assetTotals = (links: ReturnType<typeof scenarioLinks>) => {
    const m: Record<string, number> = {};
    for (const l of links) if (FLOW_NODES.find((n) => n.id === l.t)!.col === 2) m[l.t] = (m[l.t] ?? 0) + l.v;
    return m;
  };
  const bt = assetTotals(base);
  const ct = assetTotals(cur);
  const deltas = FLOW_NODES.filter((n) => n.col === 2)
    .map((n) => ({ label: n.label, value: (ct[n.id] ?? 0) - (bt[n.id] ?? 0), color: n.color }))
    .sort((a, b) => b.value - a.value);
  const fnode = focus ? FLOW_NODES.find((n) => n.id === focus) : null;
  const fin = focus ? cur.filter((l) => l.t === focus) : [];
  const fout = focus ? cur.filter((l) => l.s === focus) : [];
  const label = (id: string) => FLOW_NODES.find((n) => n.id === id)?.label ?? id;

  return (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_300px] grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2 p-2">
      <Panel
        title="Global Capital Allocation · Allocators → Vehicles → Assets"
        code="03.A"
        source="MODEL"
        expandId="fl-sankey"
        right={<Segmented value={scenario} onChange={setScenario} options={FLOW_SCENARIOS.map((s) => ({ value: s.id, label: s.label, title: s.desc }))} />}
      >
        <FlowSankey scenario={scenario} focus={focus} setFocus={setFocus} />
      </Panel>
      <Panel title={fnode ? fnode.label : `Scenario · ${sc.label}`} code="03.B" source="MODEL" bodyClassName="overflow-y-auto p-3 space-y-3">
        {fnode ? (
          <>
            <div className="text-[10px] text-dim">{fnode.desc || "Destination asset class"}</div>
            {fin.length > 0 && (
              <div>
                <div className="nx-label mb-1.5">Inflows</div>
                <HBars items={fin.sort((a, b) => b.v - a.v).map((l) => ({ label: label(l.s), value: l.v, color: FLOW_NODES.find((n) => n.id === l.s)?.color, onClick: () => setFocus(l.s) }))} format={(v) => `$${v.toFixed(2)}T`} />
              </div>
            )}
            {fout.length > 0 && (
              <div>
                <div className="nx-label mb-1.5">Outflows</div>
                <HBars items={fout.sort((a, b) => b.v - a.v).map((l) => ({ label: label(l.t), value: l.v, color: FLOW_NODES.find((n) => n.id === l.t)?.color, onClick: () => setFocus(l.t) }))} format={(v) => `$${v.toFixed(2)}T`} />
              </div>
            )}
            <button className="nx-btn w-full !justify-center" onClick={() => setFocus(null)}>
              Clear focus
            </button>
          </>
        ) : (
          <>
            <div className="text-[10px] leading-relaxed text-dim">{sc.desc}</div>
            <div>
              <div className="nx-label mb-1.5">Δ allocation vs baseline</div>
              <HBars items={deltas} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}T`} max={Math.max(0.3, ...deltas.map((d) => Math.abs(d.value)))} />
            </div>
            <div className="text-[9px] leading-relaxed text-faint">
              Click any node to trace where its capital comes from and where it goes. Particle density ∝ flow size. Stylized model for exploring allocation mechanics — not measured flow data.
            </div>
          </>
        )}
      </Panel>
      <div className="col-span-2 grid min-h-0 grid-cols-2 gap-2">
        <Panel title="Weekly Fund Flows by Asset Class" code="03.C" source="SIM" expandId="fl-stream">
          <FundFlows />
        </Panel>
        <Panel title="Sector Rotation · Relative Rotation Graph vs S&P 500" code="03.D" source="SIM" expandId="fl-rrg">
          <RRG />
        </Panel>
      </div>
    </div>
  );
}
