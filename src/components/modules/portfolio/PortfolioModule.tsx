"use client";
import { useMemo, useState } from "react";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Panel } from "../../ui/Panel";
import { Segmented } from "../../ui/Controls";
import { SourceTag } from "../../ui/SourceTag";
import { LineChart } from "../../charts/LineChart";
import { Heatmatrix } from "../../charts/Heatmatrix";
import { HBars } from "../../charts/Bars";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { usePortfolio } from "@/lib/store/portfolio";
import { useMarket } from "@/lib/store/market";
import { useUI } from "@/lib/store/ui";
import { INSTRUMENTS, INSTRUMENT_MAP } from "@/lib/data/universe";
import { analyze, assetClassOf, CLASS_COLORS, geoWeights, isInvestable, RISK_FREE, sectorOf } from "@/lib/finance/portfolio";
import { fmtMoney, fmtPct, fmtPrice, signClass } from "@/lib/format";

const NOTIONAL = 1_000_000;

function Sunburst({ holdings, onPick }: { holdings: { symbol: string; weight: number }[]; onPick: (s: string) => void }) {
  const [ref, { w, h }] = useSize();
  const [hover, setHover] = useState<string | null>(null);
  const tip = useTip();
  const quotes = useMarket((s) => s.quotes);
  const root = useMemo(() => {
    const tot = holdings.reduce((s, x) => s + x.weight, 0) || 1;
    const groups: Record<string, { name: string; value: number }[]> = {};
    for (const hh of holdings) {
      const inst = INSTRUMENT_MAP[hh.symbol];
      if (!inst) continue;
      (groups[assetClassOf(inst)] ??= []).push({ name: hh.symbol, value: hh.weight / tot });
    }
    const data = { name: "root", children: Object.entries(groups).map(([k, v]) => ({ name: k, children: v })) };
    const r = d3
      .hierarchy<{ name: string; value?: number; children?: unknown[] }>(data as never)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return d3.partition<{ name: string }>().size([2 * Math.PI, 1])(r as never);
  }, [holdings]);
  const R = Math.min(w, h) / 2 - 6;
  const arc = d3
    .arc<d3.HierarchyRectangularNode<{ name: string }>>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .padAngle(0.006)
    .innerRadius((d) => (d.depth === 1 ? R * 0.42 : R * 0.72))
    .outerRadius((d) => (d.depth === 1 ? R * 0.7 : R * 0.98));
  const center = hover ? root.descendants().find((d) => d.data.name === hover) : null;
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h}>
          <g transform={`translate(${w / 2},${h / 2})`}>
            {root.descendants().filter((d) => d.depth > 0).map((d) => {
              const cls = d.depth === 1 ? d.data.name : d.parent!.data.name;
              const c = CLASS_COLORS[cls] ?? "#888";
              const dim = hover && hover !== d.data.name && hover !== d.parent?.data.name && !(d.depth === 1 && d.children?.some((ch) => ch.data.name === hover));
              const q = d.depth === 2 ? quotes[d.data.name] : undefined;
              return (
                <motion.path
                  key={d.depth + d.data.name}
                  d={arc(d) ?? ""}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: dim ? 0.18 : 1 }}
                  fill={c}
                  fillOpacity={d.depth === 1 ? 0.35 : q ? (q.changePct >= 0 ? 0.55 : 0.28) : 0.5}
                  stroke={c}
                  strokeWidth={0.8}
                  style={{ cursor: d.depth === 2 ? "pointer" : "default", filter: hover === d.data.name ? `drop-shadow(0 0 6px ${c})` : undefined }}
                  onMouseEnter={() => setHover(d.data.name)}
                  onMouseMove={(e) =>
                    tip.show(
                      e.clientX,
                      e.clientY,
                      <div>
                        <div className="text-ink">{d.data.name}</div>
                        <div>{fmtPct(d.value ?? 0, 1, false)} of portfolio</div>
                        {q && <div className={signClass(q.changePct)}>{fmtPct(q.changePct)} today</div>}
                      </div>,
                    )
                  }
                  onMouseLeave={() => {
                    setHover(null);
                    tip.hide();
                  }}
                  onClick={() => d.depth === 2 && onPick(d.data.name)}
                />
              );
            })}
            {root
              .descendants()
              .filter((d) => d.depth === 2 && d.x1 - d.x0 > 0.16)
              .map((d) => {
                const a = (d.x0 + d.x1) / 2 - Math.PI / 2;
                const r = R * 0.85;
                return (
                  <text key={"t" + d.data.name} x={Math.cos(a) * r} y={Math.sin(a) * r + 3} fontSize={8} textAnchor="middle" fill="#fff" pointerEvents="none">
                    {d.data.name}
                  </text>
                );
              })}
            <text y={-4} textAnchor="middle" fontSize={9} letterSpacing="0.14em" fill="var(--text-dim)">
              {center ? center.data.name.toUpperCase() : "ALLOCATION"}
            </text>
            <text y={12} textAnchor="middle" fontSize={15} fill="var(--text)">
              {center ? fmtPct(center.value ?? 0, 1, false) : `${holdings.length} pos.`}
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}

export function PortfolioModule() {
  const { holdings, mode, add, remove, setWeight, normalize, reset, setHoldings } = usePortfolio();
  const quotes = useMarket((s) => s.quotes);
  const notify = useUI((s) => s.notify);
  const [bench, setBench] = useState<"SPX" | "6040">("6040");
  const [chart, setChart] = useState<"perf" | "dd" | "vol">("perf");
  const [addQ, setAddQ] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const valid = useMemo(() => holdings.filter((h) => INSTRUMENT_MAP[h.symbol]), [holdings]);
  const totW = valid.reduce((s, h) => s + h.weight, 0) || 1;
  const stats = useMemo(() => analyze(valid, bench), [valid, bench]);

  const dayRet = valid.reduce((s, h) => s + (h.weight / totW) * (quotes[h.symbol]?.changePct ?? 0), 0);
  const options = INSTRUMENTS.filter((i) => isInvestable(i) && !holdings.some((h) => h.symbol === i.symbol) && (addQ ? i.symbol.includes(addQ.toUpperCase()) || i.name.toLowerCase().includes(addQ.toLowerCase()) : false)).slice(0, 8);

  const sectors = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of valid) m[sectorOf(INSTRUMENT_MAP[h.symbol])] = (m[sectorOf(INSTRUMENT_MAP[h.symbol])] ?? 0) + h.weight / totW;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [valid, totW]);
  const geo = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of valid) for (const [k, v] of Object.entries(geoWeights(INSTRUMENT_MAP[h.symbol]))) m[k] = (m[k] ?? 0) + (v * h.weight) / totW;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [valid, totW]);

  const importCsv = () => {
    const rows = csv
      .split(/\n|;/)
      .map((l) => l.split(/[,\t ]+/).filter(Boolean))
      .filter((r) => r.length >= 1)
      .map(([s, w]) => ({ symbol: s.toUpperCase(), weight: Number(w ?? 1) || 1 }))
      .filter((r) => INSTRUMENT_MAP[r.symbol] && isInvestable(INSTRUMENT_MAP[r.symbol]));
    if (!rows.length) {
      notify("No recognized symbols in import");
      return;
    }
    const t = rows.reduce((s, r) => s + r.weight, 0);
    setHoldings(rows.map((r) => ({ symbol: r.symbol, weight: r.weight / t })), "custom");
    setCsvOpen(false);
    notify(`Imported ${rows.length} positions (user-entered, hypothetical)`);
  };

  const kpis: [string, string, string?][] = stats
    ? [
        ["Notional (hyp.)", fmtMoney(NOTIONAL)],
        ["Day P&L", `${dayRet >= 0 ? "+" : "-"}${fmtMoney(Math.abs(dayRet * NOTIONAL))}`, signClass(dayRet)],
        ["Ann. return", fmtPct(stats.annRet, 1), signClass(stats.annRet)],
        ["Ann. volatility", fmtPct(stats.annVol, 1, false)],
        ["Sharpe", stats.sharpe.toFixed(2), signClass(stats.sharpe)],
        ["Sortino", stats.sortino.toFixed(2), signClass(stats.sortino)],
        ["Max drawdown", fmtPct(stats.maxDD, 1), "text-neg"],
        ["Beta vs SPX", stats.beta.toFixed(2)],
        ["1D VaR 95%", fmtMoney(stats.var95 * NOTIONAL), "text-warn"],
        ["1D CVaR 95%", fmtMoney(stats.cvar95 * NOTIONAL), "text-neg"],
      ]
    : [];

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="grid min-h-full grid-rows-[auto_minmax(330px,1fr)_minmax(230px,0.66fr)] gap-2">
        <div className="nx-panel flex flex-wrap items-stretch">
          <div className="flex min-w-[220px] flex-col justify-center border-r border-line px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="font-display text-[14px] text-ink">{mode === "demo" ? "NEXUS Demo Allocation" : "Custom Allocation"}</span>
              <SourceTag source={mode === "demo" ? "DEMO" : "USER"} />
            </div>
            <div className="text-[9px] text-faint">Hypothetical portfolio · simulated prices · no brokerage connected</div>
          </div>
          {kpis.map(([k, v, c]) => (
            <div key={k} className="flex min-w-[96px] flex-1 flex-col justify-center border-r border-line px-3 py-1.5 last:border-r-0">
              <div className="nx-label !text-[7.5px]">{k}</div>
              <div className={`text-[14px] ${c ?? "text-ink"}`}>{v}</div>
            </div>
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel
            title="Holdings"
            code="06.A"
            source={mode === "demo" ? "DEMO" : "USER"}
            className="col-span-12 xl:col-span-5"
            right={
              <div className="flex gap-1">
                <button className="nx-btn !py-[3px]" onClick={() => setCsvOpen(!csvOpen)} data-active={csvOpen}>
                  Import
                </button>
                <button className="nx-btn !py-[3px]" onClick={normalize} title="Rescale weights to sum to 100%">
                  Normalize
                </button>
                <button className="nx-btn !py-[3px]" onClick={reset}>
                  Demo
                </button>
              </div>
            }
            bodyClassName="flex flex-col"
          >
            <div className="relative flex items-center gap-2 border-b border-line px-2 py-1.5">
              <input className="nx-input flex-1" placeholder="Add security — e.g. NVDA, GOLD, EEM, BTC…" value={addQ} onChange={(e) => setAddQ(e.target.value)} />
              <span className={`text-[9.5px] ${Math.abs(totW - 1) > 0.005 ? "text-warn" : "text-dim"}`}>Σ {fmtPct(totW, 1, false)}</span>
              {options.length > 0 && (
                <div className="absolute inset-x-2 top-full z-30 border border-line-2 bg-bg-1 shadow-xl">
                  {options.map((o) => (
                    <button
                      key={o.symbol}
                      className="flex w-full justify-between px-2 py-1 text-left text-[10px] hover:bg-a1/10"
                      onClick={() => {
                        add(o.symbol);
                        setAddQ("");
                        notify(`${o.symbol} added at 5% — normalize to rebalance`);
                      }}
                    >
                      <span className="text-ink">{o.symbol}</span>
                      <span className="text-dim">{o.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {csvOpen && (
              <div className="border-b border-line p-2">
                <textarea className="nx-input h-16 w-full font-mono" placeholder={"AAPL, 0.2\nIEF, 0.3\nGOLD, 0.1"} value={csv} onChange={(e) => setCsv(e.target.value)} />
                <div className="mt-1 flex justify-between text-[9px] text-faint">
                  <span>SYMBOL, WEIGHT per line — user-entered, stays in this browser</span>
                  <button className="nx-btn !py-[2px]" onClick={importCsv}>
                    Apply
                  </button>
                </div>
              </div>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-bg-1">
                  <tr className="text-left text-[8px] tracking-[0.14em] text-faint">
                    <th className="px-2 py-1">ASSET</th>
                    <th className="text-right">PRICE</th>
                    <th className="text-right">DAY</th>
                    <th className="w-[120px] pl-3">WEIGHT</th>
                    <th className="text-right">RISK%</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {valid.map((h, i) => {
                    const inst = INSTRUMENT_MAP[h.symbol];
                    const q = quotes[h.symbol];
                    const rc = stats?.riskContrib[i] ?? 0;
                    return (
                      <tr key={h.symbol} className={`border-t border-line/50 ${selected === h.symbol ? "bg-a1/[0.07]" : "hover:bg-white/[0.02]"}`} onClick={() => setSelected(h.symbol)}>
                        <td className="px-2 py-[3px]">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-[3px]" style={{ background: CLASS_COLORS[assetClassOf(inst)] }} />
                            <span className="text-ink">{h.symbol}</span>
                          </div>
                          <div className="max-w-[130px] truncate text-[8.5px] text-faint">{inst.name}</div>
                        </td>
                        <td className="text-right text-ink/85">{fmtPrice(q?.price)}</td>
                        <td className={`text-right ${signClass(q?.changePct)}`}>{fmtPct(q?.changePct)}</td>
                        <td className="pl-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="range"
                              className="nx-range w-[64px]"
                              min={0}
                              max={0.4}
                              step={0.005}
                              value={h.weight}
                              style={{ ["--fill" as string]: `${(h.weight / 0.4) * 100}%` }}
                              onChange={(e) => setWeight(h.symbol, Number(e.target.value))}
                            />
                            <span className="w-[38px] text-right text-ink">{((h.weight / totW) * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className={`text-right ${rc > (h.weight / totW) * 1.5 ? "text-warn" : "text-dim"}`}>{(rc * 100).toFixed(1)}</td>
                        <td className="pr-1 text-right">
                          <button className="px-1 text-faint hover:text-neg" onClick={() => remove(h.symbol)} aria-label={`Remove ${h.symbol}`}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Allocation Sunburst" code="06.B" source={mode === "demo" ? "DEMO" : "USER"} className="col-span-6 xl:col-span-3" bodyClassName="flex flex-col">
            <div className="min-h-0 flex-1">
              <Sunburst holdings={valid} onPick={setSelected} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 px-2 pb-2">
              {Object.entries(CLASS_COLORS)
                .filter(([k]) => valid.some((h) => assetClassOf(INSTRUMENT_MAP[h.symbol]) === k))
                .map(([k, c]) => (
                  <span key={k} className="flex items-center gap-1 text-[8.5px] text-dim">
                    <span className="h-1.5 w-1.5" style={{ background: c }} />
                    {k}
                  </span>
                ))}
            </div>
          </Panel>
          <Panel
            title={chart === "perf" ? "Performance vs Benchmark" : chart === "dd" ? "Underwater (Drawdown)" : "Rolling 60D Volatility"}
            code="06.C"
            source="SIM"
            className="col-span-6 xl:col-span-4"
            expandId="pf-perf"
            right={
              <div className="flex gap-1">
                <Segmented
                  value={chart}
                  onChange={setChart}
                  options={[
                    { value: "perf", label: "NAV" },
                    { value: "dd", label: "DD" },
                    { value: "vol", label: "VOL" },
                  ]}
                />
                <Segmented
                  value={bench}
                  onChange={setBench}
                  options={[
                    { value: "6040", label: "60/40" },
                    { value: "SPX", label: "SPX" },
                  ]}
                />
              </div>
            }
            bodyClassName="flex flex-col"
          >
            {stats && (
              <>
                <div className="flex gap-4 px-2.5 pt-1.5 text-[9.5px]">
                  <span className="text-dim">
                    Portfolio <span className={signClass(stats.annRet)}>{fmtPct(stats.annRet, 1)}</span>/yr
                  </span>
                  <span className="text-dim">
                    Bench <span className={signClass(stats.benchAnnRet)}>{fmtPct(stats.benchAnnRet, 1)}</span>/yr
                  </span>
                  <span className="text-dim">TE {fmtPct(stats.trackingError, 1, false)}</span>
                  <span className="text-dim">rf {fmtPct(RISK_FREE, 2, false)}</span>
                </div>
                <div className="min-h-0 flex-1">
                  {chart === "perf" && (
                    <LineChart
                      series={[
                        { id: "b", label: bench === "SPX" ? "S&P 500" : "60/40", data: stats.bench, color: "var(--text-dim)", width: 1 },
                        { id: "p", label: "Portfolio", data: stats.nav, color: "var(--a1)", area: true },
                      ]}
                      yFormat={(v) => v.toFixed(0)}
                      refLines={[{ y: 100 }]}
                      xFormat={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                    />
                  )}
                  {chart === "dd" && <LineChart series={[{ id: "dd", label: "Drawdown", data: stats.dd, color: "var(--neg)", area: true }]} yFormat={(v) => `${v.toFixed(0)}%`} xFormat={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", year: "2-digit" })} />}
                  {chart === "vol" && <LineChart series={[{ id: "v", label: "60D vol", data: stats.rollVol, color: "var(--a3)", area: true }]} yFormat={(v) => `${v.toFixed(0)}%`} xFormat={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", year: "2-digit" })} />}
                </div>
              </>
            )}
          </Panel>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel title="Sector Exposure" code="06.D" source={mode === "demo" ? "DEMO" : "USER"} className="col-span-6 xl:col-span-3" bodyClassName="overflow-y-auto p-2.5">
            <HBars items={sectors.map(([k, v]) => ({ label: k, value: v * 100, color: "var(--a1)" }))} format={(v) => `${v.toFixed(1)}%`} />
          </Panel>
          <Panel title="Geographic Exposure (look-through)" code="06.E" source="MODEL" className="col-span-6 xl:col-span-3" bodyClassName="overflow-y-auto p-2.5">
            <HBars items={geo.map(([k, v]) => ({ label: k, value: v * 100, color: "var(--a3)" }))} format={(v) => `${v.toFixed(1)}%`} />
            <div className="mt-2 text-[8.5px] text-faint">Fund look-through uses approximate index country weights.</div>
          </Panel>
          <Panel title="Risk Contribution vs Weight" code="06.F" source="SIM" className="col-span-6 xl:col-span-3" bodyClassName="overflow-y-auto p-2.5">
            {stats && (
              <div className="space-y-[3px]">
                {valid
                  .map((h, i) => ({ s: h.symbol, w: h.weight / totW, rc: stats.riskContrib[i] }))
                  .sort((a, b) => b.rc - a.rc)
                  .map((r) => (
                    <div key={r.s} className="grid grid-cols-[44px_1fr_40px] items-center gap-2">
                      <span className="text-[9.5px] text-dim">{r.s}</span>
                      <span className="relative h-[9px]">
                        <span className="absolute inset-y-0 left-0 bg-line-3/60" style={{ width: `${r.w * 200}%`, maxWidth: "100%" }} />
                        <span className="absolute left-0 top-[3px] h-[3px]" style={{ width: `${Math.max(0, r.rc) * 200}%`, maxWidth: "100%", background: "var(--warn)", boxShadow: "0 0 5px var(--warn)" }} />
                      </span>
                      <span className="text-right text-[9.5px] text-ink/85">{(r.rc * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                <div className="pt-1 text-[8.5px] text-faint">
                  <span className="text-dim">▬ weight</span> · <span className="text-warn">▬ share of portfolio variance</span> (wᵢ(Σw)ᵢ / σₚ²)
                </div>
              </div>
            )}
          </Panel>
          <Panel title="Correlation Matrix · 1Y" code="06.G" source="SIM" className="col-span-6 xl:col-span-3" bodyClassName="p-1.5" expandId="pf-corr">
            {stats && <Heatmatrix labels={valid.map((h) => h.symbol)} values={stats.corr} />}
          </Panel>
        </div>
      </div>
    </div>
  );
}
