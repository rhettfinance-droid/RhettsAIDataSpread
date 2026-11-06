"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as d3 from "d3";
import { motion } from "framer-motion";
import { Panel } from "../../ui/Panel";
import { Segmented } from "../../ui/Controls";
import { SourceTag } from "../../ui/SourceTag";
import { Bars } from "../../charts/Bars";
import { LineChart } from "../../charts/LineChart";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { COMPANIES, COMPANY_MAP, ASSUMED_TAX, cagr, derive, type CompanyProfile, type FinYear } from "@/lib/data/companies";
import { useMarket } from "@/lib/store/market";
import { useUI } from "@/lib/store/ui";
import { useSettings } from "@/lib/store/settings";
import { fmtBn, fmtPct, fmtPrice, fmtX, signClass } from "@/lib/format";

type Metric = { label: string; value: string; raw: number | null; prev?: number | null; formula: string; def: string; good?: "up" | "down" };

// ───────────────────────── waterfall ─────────────────────────

function Waterfall({ y }: { y: FinYear }) {
  const [ref, { w, h }] = useSize();
  const tip = useTip();
  const cogs = y.revenue - y.grossProfit;
  const opex = y.grossProfit - y.operatingIncome;
  const other = y.operatingIncome - y.netIncome;
  const steps = [
    { label: "Revenue", v: y.revenue, kind: "total", desc: "Top-line sales" },
    { label: "COGS", v: -cogs, kind: "delta", desc: "Cost of revenue" },
    { label: "Gross Profit", v: y.grossProfit, kind: "total", desc: "Revenue − COGS" },
    { label: "OpEx", v: -opex, kind: "delta", desc: "R&D, SG&A and other operating expenses" },
    { label: "Op. Income", v: y.operatingIncome, kind: "total", desc: "Gross profit − OpEx (EBIT)" },
    { label: "Int/Tax/Other", v: -other, kind: "delta", desc: "Interest, taxes, other income/expense (net)" },
    { label: "Net Income", v: y.netIncome, kind: "total", desc: "Bottom line attributable to shareholders" },
  ];
  let run = 0;
  const bars = steps.map((s) => {
    if (s.kind === "total") {
      run = s.v;
      return { ...s, a: 0, b: s.v };
    }
    const a = run;
    run += s.v;
    return { ...s, a, b: run };
  });
  const lo = Math.min(0, ...bars.map((b) => Math.min(b.a, b.b)));
  const hi = Math.max(...bars.map((b) => Math.max(b.a, b.b)));
  const m = { t: 18, b: 22, l: 6, r: 6 };
  const ys = d3.scaleLinear().domain([lo, hi]).range([h - m.b, m.t]);
  const bw = (w - m.l - m.r) / bars.length;
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h}>
          <line x1={m.l} x2={w - m.r} y1={ys(0)} y2={ys(0)} stroke="var(--line-3)" />
          {bars.map((b, i) => {
            const x = m.l + i * bw + bw * 0.14;
            const bwi = bw * 0.72;
            const top = ys(Math.max(b.a, b.b));
            const height = Math.max(1, Math.abs(ys(b.a) - ys(b.b)));
            const color = b.kind === "total" ? (b.v >= 0 ? (i === bars.length - 1 ? "var(--a2)" : "var(--a1)") : "var(--neg)") : "var(--neg)";
            return (
              <g
                key={b.label}
                onMouseMove={(e) =>
                  tip.show(
                    e.clientX,
                    e.clientY,
                    <div>
                      <div className="text-ink">{b.label}</div>
                      <div className="text-[13px]">{fmtBn(b.v)}</div>
                      <div className="text-dim">{b.desc}</div>
                      <div className="text-faint">{fmtPct(b.v / y.revenue, 1, false)} of revenue</div>
                    </div>,
                  )
                }
                onMouseLeave={() => tip.hide()}
              >
                <motion.rect
                  x={x}
                  width={bwi}
                  initial={{ y: ys(0), height: 0 }}
                  animate={{ y: top, height }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: [0.2, 0.7, 0.2, 1] }}
                  fill={color}
                  opacity={b.kind === "total" ? 0.85 : 0.55}
                  style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                />
                {i < bars.length - 1 && <line x1={x + bwi} x2={x + bw} y1={ys(b.b)} y2={ys(b.b)} stroke="var(--line-3)" strokeDasharray="2 2" />}
                <text x={x + bwi / 2} y={top - 4} fontSize={9} textAnchor="middle" fill="var(--text)">
                  {fmtBn(b.v)}
                </text>
                <text x={x + bwi / 2} y={h - 8} fontSize={8.5} textAnchor="middle" fill="var(--text-dim)">
                  {b.label}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ───────────────────────── balance sheet ─────────────────────────

function BalanceSheet({ y }: { y: FinYear }) {
  const [ref, { w, h }] = useSize();
  const tip = useTip();
  const other = Math.max(0, y.totalAssets - y.cash);
  const otherLiab = Math.max(0, y.totalLiabilities - y.debt);
  const eq = y.totalAssets - y.totalLiabilities;
  const cols = [
    { label: "ASSETS", parts: [{ k: "Cash & ST investments", v: y.cash, c: "var(--a2)" }, { k: "Other assets", v: other, c: "var(--a1)" }] },
    {
      label: "LIABILITIES + EQUITY",
      parts: [
        { k: "Debt", v: y.debt, c: "var(--neg)" },
        { k: "Other liabilities", v: otherLiab, c: "#ff9f43" },
        { k: "Equity (A − L)", v: Math.max(0, eq), c: "var(--a3)" },
      ],
    },
  ];
  const m = { t: 14, b: 18 };
  const scale = (h - m.t - m.b) / Math.max(y.totalAssets, y.totalLiabilities + Math.max(0, eq));
  const cw = Math.min(110, w * 0.32);
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h}>
          {cols.map((c, ci) => {
            const x = w / 2 + (ci === 0 ? -cw - 14 : 14);
            let yy = h - m.b;
            return (
              <g key={c.label}>
                <text x={x + cw / 2} y={h - 4} fontSize={8} letterSpacing="0.14em" textAnchor="middle" fill="var(--text-dim)">
                  {c.label}
                </text>
                {c.parts.map((p, pi) => {
                  const hh = p.v * scale;
                  yy -= hh;
                  return (
                    <g key={p.k} onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div className="text-ink">{p.k}</div><div>{fmtBn(p.v)}</div><div className="text-faint">{fmtPct(p.v / y.totalAssets, 1, false)} of total assets</div></div>)} onMouseLeave={() => tip.hide()}>
                      <motion.rect x={x} width={cw} initial={{ y: h - m.b, height: 0 }} animate={{ y: yy, height: Math.max(0, hh - 1) }} transition={{ duration: 0.7, delay: ci * 0.15 + pi * 0.08 }} fill={p.c} opacity={0.32} stroke={p.c} strokeWidth={1} />
                      {hh > 22 && (
                        <>
                          <text x={x + 6} y={yy + 12} fontSize={8.5} fill="var(--text)">
                            {p.k}
                          </text>
                          <text x={x + 6} y={yy + 22} fontSize={9} fill={p.c}>
                            {fmtBn(p.v)}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
          <text x={w / 2} y={m.t - 2} fontSize={11} textAnchor="middle" fill="var(--text-dim)">
            =
          </text>
        </svg>
      )}
    </div>
  );
}

// ───────────────────────── peers ─────────────────────────

function PeerMap({ current, onPick }: { current: string; onPick: (t: string) => void }) {
  const [ref, { w, h }] = useSize();
  const quotes = useMarket((s) => s.quotes);
  const tip = useTip();
  const pts = COMPANIES.map((c) => {
    const ys = c.years;
    const l = ys[ys.length - 1];
    const d = derive(l, ys[ys.length - 2]);
    const mcap = (quotes[c.ticker]?.price ?? 0) * l.shares;
    return { t: c.ticker, x: (d.revGrowth ?? 0) * 100, y: d.opMargin * 100, r: mcap, sector: c.sector };
  });
  const m = { t: 10, r: 12, b: 20, l: 32 };
  const x = d3.scaleLinear().domain(d3.extent(pts, (p) => p.x) as [number, number]).nice().range([m.l, w - m.r]);
  const y = d3.scaleLinear().domain([Math.min(0, d3.min(pts, (p) => p.y) ?? 0), (d3.max(pts, (p) => p.y) ?? 50) * 1.1]).nice().range([h - m.b, m.t]);
  const r = d3.scaleSqrt().domain([0, d3.max(pts, (p) => p.r) || 1]).range([3, 20]);
  return (
    <div ref={ref} className="h-full w-full">
      {w > 0 && h > 0 && (
        <svg width={w} height={h}>
          {y.ticks(4).map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={m.l - 4} y={y(t) + 3} fontSize={8} textAnchor="end" fill="var(--text-faint)">
                {t}%
              </text>
            </g>
          ))}
          {x.ticks(6).map((t) => (
            <text key={t} x={x(t)} y={h - 6} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
              {t}%
            </text>
          ))}
          <text x={w - m.r} y={h - 6 - 10} fontSize={7.5} textAnchor="end" fill="var(--text-faint)">
            REVENUE GROWTH →
          </text>
          <text x={m.l + 4} y={m.t + 8} fontSize={7.5} fill="var(--text-faint)">
            ↑ OPERATING MARGIN
          </text>
          {pts.map((p) => {
            const on = p.t === current;
            return (
              <g
                key={p.t}
                onClick={() => onPick(p.t)}
                style={{ cursor: "pointer" }}
                onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div className="text-ink">{p.t}</div><div>Rev growth {p.x.toFixed(1)}%</div><div>Op margin {p.y.toFixed(1)}%</div><div className="text-faint">Mkt cap (sim px) {fmtBn(p.r)}</div></div>)}
                onMouseLeave={() => tip.hide()}
              >
                <circle cx={x(p.x)} cy={y(p.y)} r={r(p.r)} fill={on ? "var(--a1)" : "var(--a3)"} fillOpacity={on ? 0.35 : 0.15} stroke={on ? "var(--a1)" : "var(--a3)"} style={{ filter: on ? "drop-shadow(0 0 6px var(--a1))" : undefined }} />
                <text x={x(p.x)} y={y(p.y) + 3} fontSize={8.5} textAnchor="middle" fill={on ? "#fff" : "var(--text-dim)"}>
                  {p.t}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ───────────────────────── module ─────────────────────────

export function CompanyModule() {
  const focus = useUI((s) => s.focusCompany);
  const setUI = useUI((s) => s.set);
  const secOn = useUI((s) => s.dataStatus.sec);
  const student = useSettings((s) => s.studentMode);
  const [ticker, setTicker] = useState("AAPL");
  const [live, setLive] = useState<CompanyProfile | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [yi, setYi] = useState(4);
  const [histMetric, setHistMetric] = useState<"revenue" | "netIncome" | "fcf" | "eps">("revenue");

  useEffect(() => {
    if (focus && COMPANY_MAP[focus]) {
      setTicker(focus);
      setLive(null);
      setUI({ focusCompany: null });
    }
  }, [focus, setUI]);

  const co: CompanyProfile = live ?? COMPANY_MAP[ticker];
  const years = co.years;
  const idx = Math.min(yi, years.length - 1);
  const y = years[idx];
  const prev = years[idx - 1];
  const d = derive(y, prev);
  const dPrev = prev ? derive(prev, years[idx - 2]) : null;
  const q = useMarket((s) => s.quotes[co.ticker]);
  const price = q?.price ?? null;
  const latest = years[years.length - 1];
  const mcap = price !== null ? price * latest.shares : null;
  const ev = mcap !== null ? mcap + latest.debt - latest.cash : null;
  const latestD = derive(latest, years[years.length - 2]);
  const pe = price !== null && latest.eps > 0 ? price / latest.eps : null;
  const evEbitda = ev !== null && latestD.ebitda > 0 ? ev / latestD.ebitda : null;
  const fcfYield = mcap ? latest.fcf / mcap : null;

  const fetchSec = async (t: string) => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/company?ticker=${encodeURIComponent(t)}`);
      const j = await r.json();
      if (j.profile) {
        setLive(j.profile);
        setTicker(j.profile.ticker);
        setYi(j.profile.years.length - 1);
      } else setErr(j.error ?? "Not found");
    } catch (e) {
      setErr((e as Error).message);
    }
    setLoading(false);
  };

  const pick = (t: string) => {
    setQuery("");
    if (COMPANY_MAP[t]) {
      setLive(null);
      setTicker(t);
      setYi(COMPANY_MAP[t].years.length - 1);
    } else if (secOn) fetchSec(t);
    else setErr(`${t} is not in the bundled dataset. Set SEC_USER_AGENT to search any SEC filer.`);
  };

  const matches = query ? COMPANIES.filter((c) => c.ticker.startsWith(query.toUpperCase()) || c.name.toLowerCase().includes(query.toLowerCase())) : [];

  const metrics: Metric[] = [
    { label: "Revenue", value: fmtBn(y.revenue), raw: y.revenue, prev: prev?.revenue, formula: "Σ sales of goods & services", def: "Total income from the company's core operations.", good: "up" },
    { label: "Gross Profit", value: fmtBn(y.grossProfit), raw: y.grossProfit, prev: prev?.grossProfit, formula: "Revenue − COGS", def: "Profit after direct production costs.", good: "up" },
    { label: "Operating Income", value: fmtBn(y.operatingIncome), raw: y.operatingIncome, prev: prev?.operatingIncome, formula: "Gross Profit − OpEx", def: "Profit from operations before interest and taxes (EBIT).", good: "up" },
    { label: "Net Income", value: fmtBn(y.netIncome), raw: y.netIncome, prev: prev?.netIncome, formula: "EBIT − Interest − Taxes ± Other", def: "Bottom-line profit for shareholders.", good: "up" },
    { label: "Free Cash Flow", value: fmtBn(y.fcf), raw: y.fcf, prev: prev?.fcf, formula: "Operating Cash Flow − CapEx", def: "Cash available after maintaining/expanding the asset base.", good: "up" },
    { label: "EPS (diluted)", value: `$${y.eps.toFixed(2)}`, raw: y.eps, prev: prev?.eps, formula: "Net Income ÷ Diluted Shares", def: "Earnings attributable to each diluted share.", good: "up" },
    { label: "Total Assets", value: fmtBn(y.totalAssets), raw: y.totalAssets, prev: prev?.totalAssets, formula: "Liabilities + Equity", def: "Everything the company owns or controls." },
    { label: "Total Liabilities", value: fmtBn(y.totalLiabilities), raw: y.totalLiabilities, prev: prev?.totalLiabilities, formula: "Assets − Equity", def: "Obligations owed to creditors." },
    { label: "Total Debt", value: fmtBn(y.debt), raw: y.debt, prev: prev?.debt, formula: "ST + LT borrowings", def: "Interest-bearing borrowings.", good: "down" },
    { label: "Cash & ST Inv.", value: fmtBn(y.cash), raw: y.cash, prev: prev?.cash, formula: "Cash + marketable securities", def: "Liquid resources.", good: "up" },
    { label: "Gross Margin", value: fmtPct(d.grossMargin, 1, false), raw: d.grossMargin, prev: dPrev?.grossMargin, formula: "Gross Profit ÷ Revenue", def: "Share of revenue left after direct costs.", good: "up" },
    { label: "Operating Margin", value: fmtPct(d.opMargin, 1, false), raw: d.opMargin, prev: dPrev?.opMargin, formula: "Operating Income ÷ Revenue", def: "Operating efficiency.", good: "up" },
    { label: "Net Margin", value: fmtPct(d.netMargin, 1, false), raw: d.netMargin, prev: dPrev?.netMargin, formula: "Net Income ÷ Revenue", def: "Profit retained from each dollar of sales.", good: "up" },
    { label: "ROE", value: fmtPct(d.roe, 1, false), raw: d.roe, prev: dPrev?.roe, formula: "Net Income ÷ Avg. Equity", def: "Return generated on shareholders' capital.", good: "up" },
    { label: "ROIC", value: fmtPct(d.roic, 1, false), raw: d.roic, prev: dPrev?.roic, formula: `EBIT×(1−${ASSUMED_TAX * 100}%) ÷ (Equity + Debt − Cash)`, def: "Return on all capital invested in operations (assumed tax rate).", good: "up" },
    { label: "Debt / Equity", value: fmtX(d.debtToEquity, 2), raw: d.debtToEquity, prev: dPrev?.debtToEquity, formula: "Total Debt ÷ Equity", def: "Financial leverage.", good: "down" },
  ];

  const hist = years.map((yy, i) => ({ label: yy.fy.replace("FY", "'").replace("20", ""), value: yy[histMetric], prev: years[i - 1]?.[histMetric] }));
  const c5 = cagr(years[0][histMetric], latest[histMetric], years.length - 1);
  const margins = useMemo(() => {
    const mk = (f: (x: ReturnType<typeof derive>) => number, id: string, label: string, color: string) => ({
      id,
      label,
      color,
      data: years.map((yy, i) => ({ x: i, y: f(derive(yy, years[i - 1])) * 100 })),
    });
    return [mk((x) => x.grossMargin, "gm", "Gross", "var(--a1)"), mk((x) => x.opMargin, "om", "Operating", "var(--a3)"), mk((x) => x.netMargin, "nm", "Net", "var(--a2)"), mk((x) => x.fcfMargin, "fm", "FCF", "#ffb547")];
  }, [years]);

  const peers = COMPANIES.map((c) => {
    const l = c.years[c.years.length - 1];
    const dd = derive(l, c.years[c.years.length - 2]);
    const px = useMarket.getState().quotes[c.ticker]?.price;
    const mc = px ? px * l.shares : null;
    const evv = mc !== null ? mc + l.debt - l.cash : null;
    return { t: c.ticker, pe: px && l.eps > 0 ? px / l.eps : null, ev: evv && dd.ebitda > 0 ? evv / dd.ebitda : null };
  });

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="grid min-h-full grid-rows-[auto_minmax(330px,1fr)_minmax(230px,0.62fr)] gap-2">
        {/* header */}
        <div className="nx-panel flex flex-wrap items-center gap-x-6 gap-y-2 px-3 py-2">
          <div className="relative w-[240px]">
            <input
              className="nx-input w-full !py-1.5"
              placeholder={secOn ? "Search ticker (bundled + SEC EDGAR)…" : "Search company or ticker…"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && query && pick(matches[0]?.ticker ?? query.toUpperCase())}
            />
            {query && (
              <div className="absolute inset-x-0 top-full z-30 border border-line-2 bg-bg-1 shadow-xl">
                {matches.map((c) => (
                  <button key={c.ticker} onClick={() => pick(c.ticker)} className="flex w-full justify-between px-2 py-1 text-left text-[10px] hover:bg-a1/10">
                    <span className="text-ink">{c.ticker}</span>
                    <span className="text-dim">{c.name}</span>
                  </button>
                ))}
                {secOn && (
                  <button onClick={() => pick(query.toUpperCase())} className="w-full px-2 py-1 text-left text-[10px] text-a1 hover:bg-a1/10">
                    ↯ Fetch “{query.toUpperCase()}” from SEC EDGAR
                  </button>
                )}
                {!matches.length && !secOn && <div className="px-2 py-1.5 text-[9.5px] text-faint">Not bundled. Configure SEC_USER_AGENT to query SEC EDGAR.</div>}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {COMPANIES.map((c) => (
              <button key={c.ticker} className="nx-btn !px-2 !py-[3px]" data-active={!live && c.ticker === ticker} onClick={() => pick(c.ticker)}>
                {c.ticker}
              </button>
            ))}
          </div>
          {loading && <span className="text-[10px] text-a1 nx-blink">querying SEC EDGAR…</span>}
          {err && <span className="text-[10px] text-warn">{err}</span>}
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-2">
          {/* identity + metrics */}
          <Panel title="Fundamentals Terminal" code="05.A" source={co.source === "LIVE" ? "LIVE" : "REF"} className="col-span-12 lg:col-span-4" bodyClassName="overflow-y-auto">
            <div className="border-b border-line p-3">
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[22px] text-ink">{co.ticker}</span>
                <span className="truncate text-[11px] text-dim">{co.name}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-faint">
                {co.sector} · {co.industry} · {co.hq} · FY ends {co.fyEnd}
              </div>
              <div className="mt-1.5 text-[10px] leading-relaxed text-dim">{co.description}</div>
              <div className="mt-2 grid grid-cols-4 gap-px bg-line">
                {[
                  ["Price", price !== null ? `$${fmtPrice(price)}` : "—", q?.source ?? "SIM"],
                  ["Mkt Cap", fmtBn(mcap), "SIM"],
                  ["EV", fmtBn(ev), "SIM"],
                  ["P/E", fmtX(pe), "SIM"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-bg-1 px-1.5 py-1">
                    <div className="nx-label !text-[7.5px]">{k}</div>
                    <div className="text-[11.5px] text-ink">{v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex items-center justify-between text-[8.5px] text-faint">
                <span>Valuation uses {q?.source === "LIVE" ? "live" : "simulated"} price × latest diluted shares</span>
                <SourceTag source={q?.source ?? "SIM"} />
              </div>
            </div>
            <div className="flex items-center gap-1 px-3 pt-2">
              <span className="nx-label mr-1">Fiscal year</span>
              <Segmented value={String(idx)} onChange={(v) => setYi(Number(v))} options={years.map((yy, i) => ({ value: String(i), label: yy.fy.replace("FY", "") }))} />
            </div>
            <div className="grid grid-cols-2 gap-px p-3 xl:grid-cols-3">
              {metrics.map((mt) => {
                const ch = mt.prev !== undefined && mt.prev !== null && mt.raw !== null && Math.abs(mt.prev) > 1e-9 ? (mt.raw - mt.prev) / Math.abs(mt.prev) : null;
                const goodDir = mt.good === "down" ? -1 : 1;
                return (
                  <div key={mt.label} className="group border border-line/60 bg-bg/40 px-2 py-1.5" title={`${mt.def}\nFormula: ${mt.formula}`}>
                    <div className="flex items-center justify-between">
                      <span className="nx-label !text-[8px]">{mt.label}</span>
                      {ch !== null && mt.good && (
                        <span className={`text-[8.5px] ${ch * goodDir >= 0 ? "text-pos" : "text-neg"}`}>
                          {ch >= 0 ? "▲" : "▼"}
                          {Math.abs(ch * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-ink">{mt.value}</div>
                    {student && <div className="truncate text-[8px] text-a1/70">{mt.formula}</div>}
                  </div>
                );
              })}
            </div>
            {co.notes && <div className="px-3 pb-3 text-[9px] leading-relaxed text-warn/80">Note: {co.notes}</div>}
          </Panel>

          {/* income statement + history */}
          <div className="col-span-12 grid min-h-0 grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2 lg:col-span-5">
            <Panel title={`Income Statement Waterfall · ${y.fy}`} code="05.B" source={co.source === "LIVE" ? "LIVE" : "REF"} expandId="co-wf" bodyClassName="px-2 pt-1">
              <Waterfall y={y} />
            </Panel>
            <Panel
              title="Historical Comparison"
              code="05.C"
              source={co.source === "LIVE" ? "LIVE" : "REF"}
              right={
                <Segmented
                  value={histMetric}
                  onChange={setHistMetric}
                  options={[
                    { value: "revenue", label: "REV" },
                    { value: "netIncome", label: "NI" },
                    { value: "fcf", label: "FCF" },
                    { value: "eps", label: "EPS" },
                  ]}
                />
              }
              bodyClassName="flex flex-col"
            >
              <div className="flex gap-4 px-2.5 pt-1.5 text-[9.5px]">
                <span className="text-dim">
                  {years.length - 1}Y CAGR <span className={signClass(c5)}>{c5 === null ? "n/m" : fmtPct(c5, 1)}</span>
                </span>
                {hist.slice(1).map((hh) => {
                  const g = hh.prev && hh.prev > 0 ? hh.value / hh.prev - 1 : null;
                  return (
                    <span key={hh.label} className="text-faint">
                      {hh.label} <span className={signClass(g)}>{g === null ? "n/m" : fmtPct(g, 0)}</span>
                    </span>
                  );
                })}
              </div>
              <div className="min-h-0 flex-1 px-2 pb-1">
                <Bars data={hist.map((hh, i) => ({ label: hh.label, value: hh.value, color: i === idx ? "var(--a1)" : hh.value >= 0 ? "var(--a3)" : "var(--neg)" }))} format={(v) => (histMetric === "eps" ? `$${v.toFixed(2)}` : fmtBn(v))} />
              </div>
            </Panel>
          </div>

          {/* balance sheet + DuPont */}
          <div className="col-span-12 grid min-h-0 grid-rows-[minmax(0,1.1fr)_minmax(0,1fr)] gap-2 lg:col-span-3">
            <Panel title={`Balance Sheet · ${y.fy}`} code="05.D" source={co.source === "LIVE" ? "LIVE" : "REF"} bodyClassName="flex flex-col">
              <div className="px-2.5 pt-1.5 text-[9px] text-dim">
                Accounting identity: <span className="text-ink">Assets = Liabilities + Equity</span>
              </div>
              <div className="min-h-0 flex-1">
                <BalanceSheet y={y} />
              </div>
            </Panel>
            <Panel title="DuPont ROE Decomposition" code="05.E" source="MODEL" bodyClassName="p-2.5">
              <div className="text-center">
                <div className="nx-label">Return on Equity</div>
                <div className="font-display text-[24px] text-a1 nx-glow-text">{fmtPct(d.netMargin * d.assetTurnover * d.equityMultiplier, 1, false)}</div>
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-1 text-center">
                {[
                  ["Net margin", fmtPct(d.netMargin, 1, false), "NI ÷ Revenue", "Profitability"],
                  ["Asset turnover", fmtX(d.assetTurnover, 2), "Revenue ÷ Avg Assets", "Efficiency"],
                  ["Equity mult.", fmtX(d.equityMultiplier, 2), "Avg Assets ÷ Avg Equity", "Leverage"],
                ].map(([k, v, f, t], i) => (
                  <div key={k} className="contents">
                    {i > 0 && <span className="text-[14px] text-faint">×</span>}
                    <div className="border border-line bg-bg/40 px-1 py-1.5">
                      <div className="text-[7.5px] tracking-[0.12em] text-faint">{t.toUpperCase()}</div>
                      <div className="text-[12.5px] text-ink">{v}</div>
                      <div className="text-[8px] text-dim">{k}</div>
                      {student && <div className="text-[7.5px] text-a1/70">{f}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-[8.5px] leading-relaxed text-faint">DuPont analysis attributes ROE to margin, asset efficiency and financial leverage — a high ROE driven mainly by leverage carries more risk.</div>
            </Panel>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel title="Margin Trends" code="05.F" source="REF" className="col-span-12 md:col-span-4" bodyClassName="flex flex-col">
            <div className="flex gap-3 px-2.5 pt-1.5">
              {margins.map((mm) => (
                <span key={mm.id} className="flex items-center gap-1 text-[9px] text-dim">
                  <span className="h-[2px] w-2.5" style={{ background: mm.color }} />
                  {mm.label}
                </span>
              ))}
            </div>
            <div className="min-h-0 flex-1">
              <LineChart series={margins} xType="num" xFormat={(v) => years[Math.round(v)]?.fy.replace("FY", "") ?? ""} yFormat={(v) => `${v.toFixed(0)}%`} refLines={[{ y: 0 }]} tooltipTitle={(v) => years[Math.round(v)]?.fy} />
            </div>
          </Panel>
          <Panel title="Peer Map · Growth vs Profitability" code="05.G" source="REF" className="col-span-12 md:col-span-5" expandId="co-peer">
            <PeerMap current={co.ticker} onPick={pick} />
          </Panel>
          <Panel title="Valuation Multiples" code="05.H" source="SIM" className="col-span-12 md:col-span-3" bodyClassName="flex flex-col p-2.5">
            <div className="grid grid-cols-3 gap-px bg-line">
              {[
                ["P/E", fmtX(pe)],
                ["EV/EBITDA", fmtX(evEbitda)],
                ["FCF yield", fmtPct(fcfYield, 1, false)],
              ].map(([k, v]) => (
                <div key={k} className="bg-bg-1 p-1.5 text-center">
                  <div className="nx-label !text-[7.5px]">{k}</div>
                  <div className="text-[13px] text-a1">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 nx-label !text-[8px]">EV/EBITDA across coverage</div>
            <div className="mt-1 space-y-[3px]">
              {peers
                .filter((p) => p.ev !== null)
                .sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0))
                .map((p) => (
                  <div key={p.t} className="flex items-center gap-2">
                    <span className={`w-10 text-[9px] ${p.t === co.ticker ? "text-a1" : "text-dim"}`}>{p.t}</span>
                    <span className="relative h-[6px] flex-1 bg-line/50">
                      <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, ((p.ev ?? 0) / 60) * 100)}%`, background: p.t === co.ticker ? "var(--a1)" : "var(--a3)", opacity: 0.8 }} />
                    </span>
                    <span className="w-9 text-right text-[9px] text-ink/80">{fmtX(p.ev)}</span>
                  </div>
                ))}
            </div>
            <Link href={`/quant?tab=dcf&ticker=${co.ticker}`} className="nx-btn mt-auto !justify-center !py-1.5">
              Model {co.ticker} in DCF Lab →
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
