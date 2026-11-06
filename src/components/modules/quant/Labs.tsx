"use client";
import { useEffect, useMemo, useState } from "react";
import * as d3 from "d3";
import { Panel } from "../../ui/Panel";
import { Segmented, Slider, Toggle } from "../../ui/Controls";
import { Bars, HBars } from "../../charts/Bars";
import { LineChart } from "../../charts/LineChart";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { BUCKET_LABEL, SCENARIOS, capmWacc, dcf, type Bucket } from "@/lib/finance/quant";
import { COMPANIES, COMPANY_MAP } from "@/lib/data/companies";
import { useMarket } from "@/lib/store/market";
import { usePortfolio } from "@/lib/store/portfolio";
import { INSTRUMENT_MAP, type Instrument } from "@/lib/data/universe";
import { fmtBn, fmtMoney, fmtPct, signClass } from "@/lib/format";

// ───────────────────────── DCF ─────────────────────────

export function DCFTab({ initialTicker }: { initialTicker?: string }) {
  const [ticker, setTicker] = useState(initialTicker && COMPANY_MAP[initialTicker] ? initialTicker : "MSFT");
  const co = COMPANY_MAP[ticker];
  const last = co.years[co.years.length - 1];
  const avgFcf = co.years.slice(-3).reduce((s, y) => s + y.fcf, 0) / 3;
  const price = useMarket((s) => s.quotes[ticker]?.price);
  const [baseFcf, setBaseFcf] = useState(last.fcf > 0 ? last.fcf : Math.max(1, avgFcf));
  const [growth, setGrowth] = useState(0.1);
  const [tg, setTg] = useState(0.03);
  const [buildWacc, setBuildWacc] = useState(true);
  const [waccManual, setWaccManual] = useState(0.085);
  const [beta, setBeta] = useState(1.1);
  const [erp, setErp] = useState(0.05);
  const [rf, setRf] = useState(0.042);
  const [years, setYears] = useState(10);
  const [ref, { w, h }] = useSize();
  const tip = useTip();

  useEffect(() => {
    const c = COMPANY_MAP[ticker];
    const l = c.years[c.years.length - 1];
    const a = c.years.slice(-3).reduce((s, y) => s + y.fcf, 0) / 3;
    setBaseFcf(+(l.fcf > 0 ? l.fcf : Math.max(0.5, a)).toFixed(1));
    const ys = c.years;
    const g = (ys[ys.length - 1].revenue / ys[0].revenue) ** (1 / (ys.length - 1)) - 1;
    setGrowth(Math.max(0.02, Math.min(0.25, +g.toFixed(3))));
  }, [ticker]);

  const debtW = Math.min(0.6, last.debt / Math.max(1, last.debt + (price ?? 0) * last.shares));
  const capm = capmWacc({ rf, beta, erp, costDebt: rf + 0.012, tax: 0.21, debtWeight: debtW });
  const wacc = buildWacc ? capm.wacc : waccManual;
  const netDebt = last.debt - last.cash;
  const res = dcf({ baseFcf, growth, terminalGrowth: tg, wacc, years, netDebt, shares: last.shares });
  const upside = price ? res.perShare / price - 1 : null;

  const waccs = [-0.02, -0.01, -0.005, 0, 0.005, 0.01, 0.02].map((d) => wacc + d);
  const tgs = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => tg + d);
  const grid = waccs.map((wc) => tgs.map((g) => dcf({ baseFcf, growth, terminalGrowth: g, wacc: wc, years, netDebt, shares: last.shares })));

  const m = { t: 14, r: 8, b: 18, l: 8 };
  const maxV = Math.max(...res.rows.map((r) => r.fcf));
  const bw = w > 0 ? (w - m.l - m.r) / res.rows.length : 0;
  const ys = (v: number) => h - m.b - (v / maxV) * (h - m.t - m.b);

  return (
    <div className="grid h-full grid-cols-[260px_minmax(0,1fr)_330px] gap-2">
      <Panel title="DCF Assumptions" code="07.DCF" source="MODEL" bodyClassName="space-y-3 overflow-y-auto p-3">
        <div>
          <div className="nx-label mb-1">Company (REF financials)</div>
          <select className="nx-input w-full" value={ticker} onChange={(e) => setTicker(e.target.value)}>
            {COMPANIES.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.ticker} — {c.name}
              </option>
            ))}
          </select>
          <div className="mt-1 text-[9px] text-faint">
            Last FCF {fmtBn(last.fcf)} · net debt {fmtBn(netDebt)} · {last.shares.toFixed(2)}B shares
          </div>
        </div>
        <Slider label="Base FCF (year 0)" value={baseFcf} min={0.5} max={Math.max(150, last.fcf * 1.6)} step={0.5} onChange={setBaseFcf} format={(v) => fmtBn(v)} />
        <Slider label="FCF growth yrs 1–5" value={growth} min={-0.05} max={0.35} step={0.005} onChange={setGrowth} format={(v) => fmtPct(v, 1, false)} />
        <Slider label="Terminal growth g" value={tg} min={0} max={0.05} step={0.0025} onChange={setTg} format={(v) => fmtPct(v, 2, false)} />
        <Slider label="Forecast horizon" value={years} min={5} max={15} step={1} onChange={setYears} format={(v) => `${v} yrs`} />
        <Toggle label="Build WACC via CAPM" value={buildWacc} onChange={setBuildWacc} />
        {buildWacc ? (
          <div className="space-y-2.5 border-l border-a1/30 pl-2">
            <Slider label="Risk-free rate" value={rf} min={0.01} max={0.07} step={0.0025} onChange={setRf} format={(v) => fmtPct(v, 2, false)} />
            <Slider label="Equity beta β" value={beta} min={0.4} max={2.2} step={0.05} onChange={setBeta} format={(v) => v.toFixed(2)} />
            <Slider label="Equity risk premium" value={erp} min={0.03} max={0.08} step={0.0025} onChange={setErp} format={(v) => fmtPct(v, 2, false)} />
            <div className="text-[9px] leading-relaxed text-dim">
              kₑ = r<sub>f</sub> + β·ERP = <span className="text-ink">{fmtPct(capm.ke, 2, false)}</span>
              <br />
              k<sub>d</sub>(1−t) = <span className="text-ink">{fmtPct(capm.kd, 2, false)}</span> · D/V {fmtPct(debtW, 1, false)}
              <br />
              WACC = <span className="text-a1">{fmtPct(capm.wacc, 2, false)}</span>
            </div>
          </div>
        ) : (
          <Slider label="WACC" value={waccManual} min={0.04} max={0.16} step={0.0025} onChange={setWaccManual} format={(v) => fmtPct(v, 2, false)} />
        )}
      </Panel>
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <div className="nx-panel grid grid-cols-5">
          {[
            ["Intrinsic value / share", res.valid ? `$${res.perShare.toFixed(2)}` : "invalid", "text-a1"],
            ["Reference price (sim)", price ? `$${price.toFixed(2)}` : "—", "text-ink"],
            ["Implied upside", upside !== null && res.valid ? fmtPct(upside, 1) : "—", signClass(upside)],
            ["Enterprise value", fmtBn(res.ev), "text-ink"],
            ["Terminal value share", fmtPct(res.tvShare, 0, false), res.tvShare > 0.8 ? "text-warn" : "text-ink"],
          ].map(([k, v, c]) => (
            <div key={k} className="border-r border-line px-3 py-2 last:border-r-0">
              <div className="nx-label !text-[7.5px]">{k}</div>
              <div className={`font-display text-[20px] ${c}`}>{v}</div>
            </div>
          ))}
        </div>
        <Panel title="Projected Free Cash Flow & Present Value" code="07.DCF.A" source="MODEL" bodyClassName="flex flex-col">
          <div className="flex gap-4 px-3 pt-1.5 text-[9px] text-dim">
            <span>
              <span className="text-a3">■</span> projected FCF
            </span>
            <span>
              <span className="text-a1">■</span> discounted at WACC {fmtPct(wacc, 2, false)}
            </span>
            <span>PV(FCF) {fmtBn(res.pvFcf)}</span>
            <span>PV(TV) {fmtBn(res.pvTv)}</span>
            <span>Equity {fmtBn(res.equity)}</span>
          </div>
          <div ref={ref} className="min-h-0 flex-1">
            {w > 0 && h > 0 && (
              <svg width={w} height={h}>
                {res.rows.map((r, i) => {
                  const x = m.l + i * bw + bw * 0.12;
                  const b2 = bw * 0.36;
                  return (
                    <g
                      key={r.year}
                      onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div className="text-ink">Year {r.year}</div><div>FCF {fmtBn(r.fcf)} (g {fmtPct(r.growth, 1)})</div><div>Discount factor {r.df.toFixed(3)}</div><div className="text-a1">PV {fmtBn(r.pv)}</div></div>)}
                      onMouseLeave={() => tip.hide()}
                    >
                      <rect x={x} y={ys(r.fcf)} width={b2} height={h - m.b - ys(r.fcf)} fill="var(--a3)" opacity={0.55} />
                      <rect x={x + b2 + 2} y={ys(r.pv)} width={b2} height={h - m.b - ys(r.pv)} fill="var(--a1)" opacity={0.85} style={{ filter: "drop-shadow(0 0 4px var(--a1))" }} />
                      <text x={x + b2} y={h - 5} fontSize={8} textAnchor="middle" fill="var(--text-faint)">
                        Y{r.year}
                      </text>
                      {bw > 40 && (
                        <text x={x + b2} y={ys(r.fcf) - 3} fontSize={8} textAnchor="middle" fill="var(--text-dim)">
                          {r.fcf.toFixed(0)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </Panel>
      </div>
      <Panel title="Sensitivity · Value per Share" code="07.DCF.B" source="MODEL" expandId="dcf-sens" bodyClassName="p-3">
        <div className="mb-2 text-[9px] text-dim">Rows: WACC · Columns: terminal growth. Color vs reference price.</div>
        <table className="w-full border-collapse text-center text-[9.5px]">
          <thead>
            <tr>
              <th className="p-1 text-[8px] text-faint">WACC \ g</th>
              {tgs.map((g) => (
                <th key={g} className={`p-1 text-[8.5px] ${Math.abs(g - tg) < 1e-9 ? "text-a1" : "text-dim"}`}>
                  {fmtPct(g, 2, false)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row, i) => (
              <tr key={i}>
                <td className={`p-1 text-[8.5px] ${Math.abs(waccs[i] - wacc) < 1e-9 ? "text-a1" : "text-dim"}`}>{fmtPct(waccs[i], 2, false)}</td>
                {row.map((r, j) => {
                  const v = r.valid ? r.perShare : NaN;
                  const rel = price && Number.isFinite(v) ? v / price - 1 : 0;
                  const k = Math.max(-1, Math.min(1, rel / 0.5));
                  const bg = !Number.isFinite(v) ? "transparent" : k >= 0 ? `rgba(34,245,160,${0.08 + k * 0.5})` : `rgba(255,61,100,${0.08 - k * 0.5})`;
                  const center = i === 3 && j === 2;
                  return (
                    <td key={j} className="border border-line/60 p-1.5" style={{ background: bg, outline: center ? "1px solid var(--a1)" : undefined }}>
                      {Number.isFinite(v) ? `$${v.toFixed(0)}` : "n/a"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 space-y-1 text-[9px] leading-relaxed text-faint">
          <div>EV = Σ FCFₜ/(1+WACC)ᵗ + TV/(1+WACC)ᴺ, TV = FCFₙ(1+g)/(WACC−g)</div>
          <div>Equity = EV − net debt; per share = Equity ÷ diluted shares.</div>
          <div className="text-warn/80">Growth fades linearly from yrs 6–{years} to g. Educational model — not a price target.</div>
        </div>
      </Panel>
    </div>
  );
}

// ───────────────────────── Compound interest ─────────────────────────

export function CompoundTab() {
  const [p0, setP0] = useState(10000);
  const [pm, setPm] = useState(500);
  const [r, setR] = useState(0.07);
  const [n, setN] = useState(30);
  const [freq, setFreq] = useState<"12" | "4" | "1" | "365">("12");
  const [infl, setInfl] = useState(0.025);
  const [real, setReal] = useState(false);
  const series = useMemo(() => {
    const f = Number(freq);
    const out: { t: number; bal: number; contrib: number }[] = [];
    let bal = p0;
    let contrib = p0;
    const steps = n * 12;
    for (let m = 0; m <= steps; m++) {
      if (m % 12 === 0) out.push({ t: m / 12, bal: real ? bal / (1 + infl) ** (m / 12) : bal, contrib: real ? contrib / (1 + infl) ** (m / 12) : contrib });
      // effective monthly growth for chosen compounding frequency
      const monthly = (1 + r / f) ** (f / 12) - 1;
      bal = bal * (1 + monthly) + pm;
      contrib += pm;
    }
    return out;
  }, [p0, pm, r, n, freq, infl, real]);
  const last = series[series.length - 1];
  const compare = [r - 0.03, r, r + 0.03].map((rr) => {
    const out: { x: number; y: number }[] = [];
    let b = p0;
    for (let m = 0; m <= n * 12; m++) {
      if (m % 12 === 0) out.push({ x: m / 12, y: b });
      b = b * (1 + rr / 12) + pm;
    }
    return { rr, out };
  });
  return (
    <div className="grid h-full grid-cols-[250px_minmax(0,1fr)_300px] gap-2">
      <Panel title="Compounding Inputs" code="07.CI" source="MODEL" bodyClassName="space-y-3 p-3">
        <Slider label="Initial deposit" value={p0} min={0} max={200000} step={1000} onChange={setP0} format={(v) => fmtMoney(v)} />
        <Slider label="Monthly contribution" value={pm} min={0} max={5000} step={50} onChange={setPm} format={(v) => fmtMoney(v)} />
        <Slider label="Annual rate" value={r} min={0} max={0.15} step={0.0025} onChange={setR} format={(v) => fmtPct(v, 2, false)} />
        <Slider label="Years" value={n} min={1} max={50} step={1} onChange={setN} />
        <div>
          <div className="nx-label mb-1">Compounding</div>
          <Segmented
            value={freq}
            onChange={setFreq}
            options={[
              { value: "1", label: "Annual" },
              { value: "4", label: "Qtr" },
              { value: "12", label: "Monthly" },
              { value: "365", label: "Daily" },
            ]}
          />
        </div>
        <Toggle label="Show in today's dollars" value={real} onChange={setReal} />
        {real && <Slider label="Inflation" value={infl} min={0} max={0.08} step={0.0025} onChange={setInfl} format={(v) => fmtPct(v, 2, false)} />}
        <div className="border-t border-line pt-2 text-[9px] leading-relaxed text-faint">
          A = P(1 + r/n)<sup>nt</sup> + PMT·[((1 + r/n)<sup>nt</sup> − 1)/(r/n)]. Rule of 72: doubling time ≈ 72 / r% = <span className="text-a1">{r > 0 ? (72 / (r * 100)).toFixed(1) : "∞"} yrs</span>.
        </div>
      </Panel>
      <Panel title="Growth of Capital" code="07.CI.A" source="MODEL" bodyClassName="flex flex-col">
        <div className="min-h-0 flex-1 px-1">
          <Bars
            labelEvery={Math.max(1, Math.ceil(series.length / 16))}
            showValues={false}
            data={series.map((s) => ({ label: String(s.t), value: s.bal, stack: [{ label: "Contributions", value: s.contrib, color: "var(--a3)" }, { label: "Growth", value: Math.max(0, s.bal - s.contrib), color: "var(--a1)" }] }))}
            format={(v) => fmtMoney(v)}
          />
        </div>
      </Panel>
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <Panel title="Result" code="07.CI.B" source="MODEL" bodyClassName="p-3 space-y-1.5">
          <div className="text-center font-display text-[30px] text-a1 nx-glow-text">{fmtMoney(last.bal)}</div>
          {[
            ["Total contributed", fmtMoney(last.contrib)],
            ["Investment growth", fmtMoney(last.bal - last.contrib)],
            ["Growth share", fmtPct((last.bal - last.contrib) / last.bal, 1, false)],
            ["Multiple on capital", `${(last.bal / Math.max(1, last.contrib)).toFixed(2)}×`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-line/50 pb-1 text-[10px]">
              <span className="text-dim">{k}</span>
              <span className="text-ink">{v}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Rate Sensitivity (±3pp)" code="07.CI.C" source="MODEL">
          <LineChart
            xType="num"
            series={compare.map((c, i) => ({ id: String(i), label: fmtPct(c.rr, 1, false), data: c.out, color: ["var(--a3)", "var(--a1)", "var(--a2)"][i], width: i === 1 ? 1.8 : 1 }))}
            yFormat={(v) => `$${d3.format(".2~s")(v)}`}
            xFormat={(v) => `Y${v}`}
          />
        </Panel>
      </div>
    </div>
  );
}

// ───────────────────────── correlation / diversification lab ─────────────────────────

export function CorrelationTab() {
  const [muA, setMuA] = useState(0.08);
  const [sA, setSA] = useState(0.18);
  const [muB, setMuB] = useState(0.04);
  const [sB, setSB] = useState(0.06);
  const [rho, setRho] = useState(0.0);
  const [ref, { w, h }] = useSize();
  const curve = (r: number) =>
    d3.range(0, 1.0001, 0.02).map((wa) => {
      const wb = 1 - wa;
      return { wa, mu: wa * muA + wb * muB, s: Math.sqrt(wa * wa * sA * sA + wb * wb * sB * sB + 2 * wa * wb * r * sA * sB) };
    });
  const main = curve(rho);
  const denom = sA * sA + sB * sB - 2 * rho * sA * sB;
  const wStar = denom > 0 ? Math.max(0, Math.min(1, (sB * sB - rho * sA * sB) / denom)) : 0.5;
  const mv = main.reduce((a, b) => (b.s < a.s ? b : a));
  const m = { t: 12, r: 14, b: 24, l: 40 };
  const x = d3
    .scaleLinear()
    .domain([0, Math.max(sA, sB) * 1.1])
    .range([m.l, w - m.r]);
  const y = d3
    .scaleLinear()
    .domain([Math.min(muA, muB) * 0.8, Math.max(muA, muB) * 1.1])
    .range([h - m.b, m.t]);
  const path = (pts: { s: number; mu: number }[]) =>
    d3
      .line<{ s: number; mu: number }>()
      .x((p) => x(p.s))
      .y((p) => y(p.mu))(pts) ?? "";
  return (
    <div className="grid h-full grid-cols-[250px_minmax(0,1fr)_300px] gap-2">
      <Panel title="Two-Asset Inputs" code="07.CR" source="MODEL" bodyClassName="space-y-3 p-3">
        <div className="nx-label !text-a1">Asset A (risky)</div>
        <Slider label="Return" value={muA} min={0} max={0.15} step={0.0025} onChange={setMuA} format={(v) => fmtPct(v, 1, false)} />
        <Slider label="Volatility" value={sA} min={0.02} max={0.4} step={0.005} onChange={setSA} format={(v) => fmtPct(v, 1, false)} />
        <div className="nx-label !text-a2">Asset B (defensive)</div>
        <Slider label="Return" value={muB} min={0} max={0.15} step={0.0025} onChange={setMuB} format={(v) => fmtPct(v, 1, false)} />
        <Slider label="Volatility" value={sB} min={0.02} max={0.4} step={0.005} onChange={setSB} format={(v) => fmtPct(v, 1, false)} />
        <div className="border-t border-line pt-3">
          <Slider label="Correlation ρ" value={rho} min={-1} max={1} step={0.05} onChange={setRho} format={(v) => v.toFixed(2)} />
        </div>
        <div className="text-[9px] leading-relaxed text-faint">σₚ² = w²σ_A² + (1−w)²σ_B² + 2w(1−w)ρσ_Aσ_B. Lower ρ bends the curve left — diversification lowers risk without lowering return.</div>
      </Panel>
      <Panel title="Diversification Frontier" code="07.CR.A" source="MODEL" expandId="cr-main">
        <div ref={ref} className="h-full w-full">
          {w > 0 && h > 0 && (
            <svg width={w} height={h}>
              {y.ticks(5).map((t) => (
                <g key={t}>
                  <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                  <text x={m.l - 4} y={y(t) + 3} fontSize={8.5} textAnchor="end" fill="var(--text-faint)">
                    {(t * 100).toFixed(1)}%
                  </text>
                </g>
              ))}
              {x.ticks(6).map((t) => (
                <text key={t} x={x(t)} y={h - 8} fontSize={8.5} textAnchor="middle" fill="var(--text-faint)">
                  {(t * 100).toFixed(0)}%
                </text>
              ))}
              {[-1, -0.5, 0, 0.5, 1].map((r) => (
                <g key={r}>
                  <path d={path(curve(r))} fill="none" stroke="var(--line-3)" strokeDasharray="2 3" />
                  <text x={x(curve(r)[25].s) - 4} y={y(curve(r)[25].mu)} fontSize={8} textAnchor="end" fill="var(--text-faint)">
                    ρ={r}
                  </text>
                </g>
              ))}
              <path d={path(main)} fill="none" stroke="var(--a1)" strokeWidth={2.4} style={{ filter: "drop-shadow(0 0 6px var(--a1))" }} />
              <circle cx={x(mv.s)} cy={y(mv.mu)} r={6} fill="none" stroke="var(--warn)" />
              <text x={x(mv.s) + 9} y={y(mv.mu) + 3} fontSize={9} fill="var(--warn)">
                MIN VARIANCE
              </text>
              <circle cx={x(sA)} cy={y(muA)} r={4} fill="var(--a1)" />
              <text x={x(sA) + 7} y={y(muA) + 3} fontSize={9} fill="var(--a1)">
                100% A
              </text>
              <circle cx={x(sB)} cy={y(muB)} r={4} fill="var(--a2)" />
              <text x={x(sB) + 7} y={y(muB) + 3} fontSize={9} fill="var(--a2)">
                100% B
              </text>
            </svg>
          )}
        </div>
      </Panel>
      <Panel title="Minimum-Variance Mix" code="07.CR.B" source="MODEL" bodyClassName="p-3 space-y-2">
        <div className="text-center">
          <div className="nx-label">Optimal weight in A</div>
          <div className="font-display text-[30px] text-a1 nx-glow-text">{fmtPct(wStar, 1, false)}</div>
        </div>
        {[
          ["Portfolio σ", fmtPct(mv.s, 2, false)],
          ["Portfolio μ", fmtPct(mv.mu, 2, false)],
          ["Risk vs safest asset", fmtPct(mv.s / Math.min(sA, sB) - 1, 1)],
          ["Diversification ratio", (((mv.wa * sA + (1 - mv.wa) * sB) / mv.s) || 1).toFixed(2)],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line/50 pb-1 text-[10px]">
            <span className="text-dim">{k}</span>
            <span className="text-ink">{v}</span>
          </div>
        ))}
        <div className="text-[9px] leading-relaxed text-faint">w* = (σ_B² − ρσ_Aσ_B) / (σ_A² + σ_B² − 2ρσ_Aσ_B), clipped to [0,1] for a long-only investor. At ρ = −1 a riskless combination exists.</div>
      </Panel>
    </div>
  );
}

// ───────────────────────── scenario / stress engine ─────────────────────────

function bucketExposure(i: Instrument): Partial<Record<Bucket, number>> {
  if (i.cls === "equity") {
    // beta to US equity derived from factor loadings & vol
    const beta = ((i.loadings.MKT ?? 0.6) * i.vol) / (0.97 * 0.16);
    return { useq: beta };
  }
  const map: Record<string, Partial<Record<Bucket, number>>> = {
    SPX: { useq: 1 },
    NDX: { useq: 1.25 },
    DJI: { useq: 0.95 },
    RUT: { useq: 1.2 },
    EFA: { intl: 1 },
    EEM: { em: 1 },
    IEF: { ust: 1 },
    AGG: { ust: 0.6, ig: 0.4 },
    TIP: { ust: 0.7 },
    HYG: { hy: 1 },
    VNQ: { re: 1 },
    GOLD: { gold: 1 },
    SILVER: { gold: 1.3 },
    WTI: { cmd: 1.2 },
    BRENT: { cmd: 1.1 },
    NATGAS: { cmd: 1.5 },
    COPPER: { cmd: 1 },
    BTC: { crypto: 1 },
    ETH: { crypto: 1.2 },
  };
  return map[i.symbol] ?? { useq: 1 };
}

export function ScenarioTab() {
  const holdings = usePortfolio((s) => s.holdings);
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const [custom, setCustom] = useState<Record<Bucket, number> | null>(null);
  const sc = SCENARIOS.find((s) => s.id === sid)!;
  const shocks = custom ?? sc.shocks;
  const tot = holdings.reduce((s, h) => s + h.weight, 0) || 1;
  const rows = holdings
    .filter((h) => INSTRUMENT_MAP[h.symbol])
    .map((h) => {
      const ex = bucketExposure(INSTRUMENT_MAP[h.symbol]);
      const r = Math.max(-0.95, Object.entries(ex).reduce((s, [b, k]) => s + (k ?? 0) * shocks[b as Bucket], 0));
      return { s: h.symbol, w: h.weight / tot, r, c: (h.weight / tot) * r };
    })
    .sort((a, b) => a.c - b.c);
  const total = rows.reduce((s, r) => s + r.c, 0);
  const all = SCENARIOS.map((s) => {
    const t = holdings
      .filter((h) => INSTRUMENT_MAP[h.symbol])
      .reduce((acc, h) => {
        const ex = bucketExposure(INSTRUMENT_MAP[h.symbol]);
        const r = Math.max(-0.95, Object.entries(ex).reduce((a, [b, k]) => a + (k ?? 0) * s.shocks[b as Bucket], 0));
        return acc + (h.weight / tot) * r;
      }, 0);
    return { label: s.label, value: t * 100 };
  });
  return (
    <div className="grid h-full grid-cols-[260px_minmax(0,1fr)_320px] gap-2">
      <Panel title="Scenario Library" code="07.SC" source="REF" bodyClassName="overflow-y-auto p-2 space-y-1">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setSid(s.id);
              setCustom(null);
            }}
            className={`w-full border px-2 py-1.5 text-left transition ${sid === s.id && !custom ? "border-a1/60 bg-a1/[0.06]" : "border-line hover:border-line-3"}`}
          >
            <div className="text-[10.5px] text-ink">{s.label}</div>
            <div className="text-[8.5px] text-faint">{s.period}</div>
            <div className="mt-0.5 text-[9px] leading-snug text-dim">{s.note}</div>
          </button>
        ))}
        <button className="nx-btn w-full !justify-center !py-1.5" data-active={!!custom} onClick={() => setCustom({ ...sc.shocks })}>
          ✎ Customize shocks
        </button>
      </Panel>
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2">
        <div className="nx-panel flex items-center gap-6 px-4 py-2">
          <div>
            <div className="nx-label">Portfolio impact · {custom ? "custom" : sc.label}</div>
            <div className={`font-display text-[30px] ${signClass(total)}`}>{fmtPct(total, 1)}</div>
          </div>
          <div>
            <div className="nx-label">On $1M notional</div>
            <div className={`text-[18px] ${signClass(total)}`}>{fmtMoney(total * 1e6)}</div>
          </div>
          <div className="ml-auto max-w-[360px] text-[9px] leading-relaxed text-faint">
            Equities map to US-equity shocks scaled by model beta; funds & commodities to their sleeve. Approximate peak-to-trough moves — illustrative, not a forecast.
          </div>
        </div>
        <div className="grid min-h-0 grid-cols-2 gap-2">
          <Panel title="Contribution by Holding" code="07.SC.A" source="MODEL" bodyClassName="overflow-y-auto p-2.5">
            <HBars items={rows.map((r) => ({ label: `${r.s} (${(r.w * 100).toFixed(0)}%)`, value: r.c * 100, hint: `asset move ${fmtPct(r.r, 1)}` }))} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`} />
          </Panel>
          <Panel title="All Scenarios vs Your Portfolio" code="07.SC.B" source="MODEL" bodyClassName="p-1">
            <Bars data={all.map((a) => ({ label: a.label.split(" ")[0], value: a.value, sub: a.label }))} format={(v) => `${v.toFixed(1)}%`} />
          </Panel>
        </div>
      </div>
      <Panel title={custom ? "Custom Shock Vector" : "Sleeve Shocks"} code="07.SC.C" source={custom ? "USER" : "REF"} bodyClassName="overflow-y-auto p-3 space-y-2.5">
        {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) =>
          custom ? (
            <Slider key={b} label={BUCKET_LABEL[b]} value={custom[b]} min={-0.8} max={0.6} step={0.01} onChange={(v) => setCustom({ ...custom, [b]: v })} format={(v) => fmtPct(v, 0)} />
          ) : (
            <div key={b} className="grid grid-cols-[100px_1fr_44px] items-center gap-2">
              <span className="text-[9.5px] text-dim">{BUCKET_LABEL[b]}</span>
              <span className="relative h-[7px] bg-line/40">
                <span className="absolute inset-y-0 left-1/2 w-px bg-line-3" />
                <span
                  className="absolute inset-y-0"
                  style={{
                    left: shocks[b] >= 0 ? "50%" : `${50 + shocks[b] * 60}%`,
                    width: `${Math.abs(shocks[b]) * 60}%`,
                    background: shocks[b] >= 0 ? "var(--pos)" : "var(--neg)",
                  }}
                />
              </span>
              <span className={`text-right text-[9.5px] ${signClass(shocks[b])}`}>{fmtPct(shocks[b], 0)}</span>
            </div>
          ),
        )}
      </Panel>
    </div>
  );
}
