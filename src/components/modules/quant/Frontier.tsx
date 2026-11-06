"use client";
import { useMemo, useState } from "react";
import * as d3 from "d3";
import { Panel } from "../../ui/Panel";
import { Segmented, Slider } from "../../ui/Controls";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { CMA, CMA_CORR, covFrom, frontier, portStats, randomPortfolios } from "@/lib/finance/quant";
import { usePortfolio } from "@/lib/store/portfolio";
import { INSTRUMENT_MAP } from "@/lib/data/universe";
import { getHistory } from "@/lib/sim/engine";
import { covariance, mean } from "@/lib/stats";
import { fmtPct } from "@/lib/format";

type Universe = { labels: string[]; colors: string[]; mu: number[]; cov: number[][] };

function cmaUniverse(enabled: string[]): Universe {
  const idx = CMA.map((a, i) => (enabled.includes(a.id) ? i : -1)).filter((i) => i >= 0);
  const sig = idx.map((i) => CMA[i].sigma);
  const corr = idx.map((i) => idx.map((j) => CMA_CORR[i][j]));
  return { labels: idx.map((i) => CMA[i].label), colors: idx.map((i) => CMA[i].color), mu: idx.map((i) => CMA[i].mu), cov: covFrom(sig, corr) };
}

function holdingsUniverse(symbols: string[]): Universe {
  const syms = symbols.filter((s) => INSTRUMENT_MAP[s]).slice(0, 14);
  const R = syms.map((s) => {
    const c = getHistory(s).slice(-505).map((b) => b.close);
    return c.slice(1).map((v, i) => v / c[i] - 1);
  });
  // shrink sample means toward the cross-sectional average (James–Stein style) to tame estimation error
  const raw = R.map((r) => mean(r) * 252);
  const avg = mean(raw);
  const mu = raw.map((m) => 0.5 * m + 0.5 * avg);
  const cov = R.map((a) => R.map((b) => covariance(a, b) * 252));
  const pal = d3.schemeTableau10;
  return { labels: syms, colors: syms.map((_, i) => pal[i % 10]), mu, cov };
}

export function FrontierTab() {
  const holdings = usePortfolio((s) => s.holdings);
  const [src, setSrc] = useState<"cma" | "pf">("cma");
  const [enabled, setEnabled] = useState(CMA.map((a) => a.id));
  const [rf, setRf] = useState(0.0375);
  const [cap, setCap] = useState(1);
  const [pick, setPick] = useState<number | null>(null);
  const [ref, { w, h }] = useSize();
  const tip = useTip();

  const uni = useMemo(() => (src === "cma" ? cmaUniverse(enabled) : holdingsUniverse(holdings.map((x) => x.symbol))), [src, enabled, holdings]);
  const front = useMemo(() => (uni.mu.length >= 2 ? frontier(uni.mu, uni.cov, rf, Math.max(cap, 1 / uni.mu.length + 0.001)) : null), [uni, rf, cap]);
  const cloud = useMemo(() => (uni.mu.length >= 2 ? randomPortfolios(uni.mu, uni.cov, rf, 3500) : []), [uni, rf]);
  const current = useMemo(() => {
    if (src !== "pf") return null;
    const tot = holdings.reduce((s, x) => s + x.weight, 0) || 1;
    const wmap = Object.fromEntries(holdings.map((x) => [x.symbol, x.weight / tot]));
    const w = uni.labels.map((l) => wmap[l] ?? 0);
    const s = w.reduce((a, b) => a + b, 0) || 1;
    return portStats(
      w.map((x) => x / s),
      uni.mu,
      uni.cov,
    );
  }, [src, holdings, uni]);

  const sel = front ? (pick !== null ? front.eff[Math.min(pick, front.eff.length - 1)] : front.maxSharpe) : null;
  const m = { t: 12, r: 16, b: 24, l: 40 };
  const allS = [...cloud.map((c) => c.sigma), ...(front?.eff.map((p) => p.sigma) ?? []), ...uni.cov.map((r, i) => Math.sqrt(r[i]))];
  const allM = [...cloud.map((c) => c.mu), ...uni.mu, rf];
  const x = d3
    .scaleLinear()
    .domain([0, (d3.max(allS) ?? 0.3) * 1.08])
    .range([m.l, w - m.r]);
  const y = d3
    .scaleLinear()
    .domain([Math.min(0, d3.min(allM) ?? 0), (d3.max(allM) ?? 0.1) * 1.1])
    .range([h - m.b, m.t]);
  const sharpeColor = d3.scaleSequential(d3.interpolateCool).domain(d3.extent(cloud, (c) => c.sharpe) as [number, number]);

  return (
    <div className="grid h-full grid-cols-[250px_minmax(0,1fr)_280px] gap-2">
      <Panel title="Optimizer Setup" code="07.EF" source="MODEL" bodyClassName="space-y-3 overflow-y-auto p-3">
        <div>
          <div className="nx-label mb-1">Universe</div>
          <Segmented
            value={src}
            onChange={(v) => {
              setSrc(v);
              setPick(null);
            }}
            options={[
              { value: "cma", label: "Asset classes" },
              { value: "pf", label: "My holdings" },
            ]}
          />
          <div className="mt-1 text-[9px] leading-snug text-faint">
            {src === "cma" ? "Illustrative long-run capital market assumptions." : "μ, Σ estimated from 2Y simulated history (means shrunk 50% to the average)."}
          </div>
        </div>
        {src === "cma" && (
          <div className="space-y-px">
            {CMA.map((a) => {
              const on = enabled.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => setEnabled(on ? enabled.filter((e) => e !== a.id) : [...enabled, a.id])}
                  className={`grid w-full grid-cols-[8px_1fr_40px_40px] items-center gap-2 px-1 py-[3px] text-left text-[9.5px] ${on ? "" : "opacity-35"}`}
                >
                  <span className="h-2 w-2" style={{ background: a.color }} />
                  <span className="text-ink/85">{a.label}</span>
                  <span className="text-right text-pos">{fmtPct(a.mu, 1, false)}</span>
                  <span className="text-right text-dim">{fmtPct(a.sigma, 0, false)}</span>
                </button>
              );
            })}
          </div>
        )}
        <Slider label="Risk-free rate" value={rf} min={0} max={0.06} step={0.0025} onChange={setRf} format={(v) => fmtPct(v, 2, false)} />
        <Slider label="Max weight per asset" value={cap} min={0.15} max={1} step={0.05} onChange={setCap} format={(v) => fmtPct(v, 0, false)} />
        <div className="border-t border-line pt-2 text-[9px] leading-relaxed text-faint">
          Long-only Markowitz frontier: for a grid of risk-aversion λ we solve max w&apos;μ − ½λ·w&apos;Σw subject to Σw = 1, 0 ≤ w ≤ cap via projected gradient ascent. The tangency portfolio maximizes the Sharpe ratio.
        </div>
      </Panel>
      <Panel title="Efficient Frontier · Risk / Return Space" code="07.EF.A" source="MODEL" expandId="ef-main">
        <div ref={ref} className="h-full w-full">
          {w > 0 && h > 0 && front && (
            <svg width={w} height={h}>
              {y.ticks(6).map((t) => (
                <g key={t}>
                  <line x1={m.l} x2={w - m.r} y1={y(t)} y2={y(t)} stroke="var(--line)" />
                  <text x={m.l - 5} y={y(t) + 3} fontSize={8.5} textAnchor="end" fill="var(--text-faint)">
                    {(t * 100).toFixed(0)}%
                  </text>
                </g>
              ))}
              {x.ticks(6).map((t) => (
                <text key={t} x={x(t)} y={h - 8} fontSize={8.5} textAnchor="middle" fill="var(--text-faint)">
                  {(t * 100).toFixed(0)}%
                </text>
              ))}
              <text x={w - m.r} y={h - m.b - 4} fontSize={8} textAnchor="end" fill="var(--text-faint)">
                VOLATILITY σ →
              </text>
              <text x={m.l + 4} y={m.t + 8} fontSize={8} fill="var(--text-faint)">
                ↑ EXPECTED RETURN μ
              </text>
              {cloud.map((c, i) => (
                <circle key={i} cx={x(c.sigma)} cy={y(c.mu)} r={1.3} fill={sharpeColor(c.sharpe)} opacity={0.35} />
              ))}
              {/* capital market line */}
              <line x1={x(0)} y1={y(rf)} x2={x(x.domain()[1])} y2={y(rf + front.maxSharpe.sharpe * x.domain()[1])} stroke="var(--warn)" strokeDasharray="5 4" opacity={0.7} />
              <path
                d={d3
                  .line<{ sigma: number; mu: number }>()
                  .x((p) => x(p.sigma))
                  .y((p) => y(p.mu))
                  .curve(d3.curveMonotoneX)(front.eff) ?? ""}
                fill="none"
                stroke="var(--a1)"
                strokeWidth={2.2}
                style={{ filter: "drop-shadow(0 0 6px var(--a1))" }}
              />
              {front.eff.map((p, i) => (
                <circle
                  key={i}
                  cx={x(p.sigma)}
                  cy={y(p.mu)}
                  r={sel === p ? 5 : 3}
                  fill={sel === p ? "#fff" : "var(--bg)"}
                  stroke="var(--a1)"
                  style={{ cursor: "pointer" }}
                  onClick={() => setPick(i)}
                  onMouseMove={(e) => tip.show(e.clientX, e.clientY, <div><div>μ {fmtPct(p.mu, 2, false)} · σ {fmtPct(p.sigma, 2, false)}</div><div className="text-dim">Sharpe {p.sharpe.toFixed(2)} · click to inspect</div></div>)}
                  onMouseLeave={() => tip.hide()}
                />
              ))}
              {uni.labels.map((l, i) => (
                <g key={l}>
                  <rect x={x(Math.sqrt(uni.cov[i][i])) - 3} y={y(uni.mu[i]) - 3} width={6} height={6} fill={uni.colors[i]} transform={`rotate(45 ${x(Math.sqrt(uni.cov[i][i]))} ${y(uni.mu[i])})`} />
                  <text x={x(Math.sqrt(uni.cov[i][i])) + 7} y={y(uni.mu[i]) + 3} fontSize={8.5} fill={uni.colors[i]}>
                    {l}
                  </text>
                </g>
              ))}
              <g>
                <circle cx={x(front.maxSharpe.sigma)} cy={y(front.maxSharpe.mu)} r={8} fill="none" stroke="var(--warn)" />
                <text x={x(front.maxSharpe.sigma) + 11} y={y(front.maxSharpe.mu) - 6} fontSize={9} fill="var(--warn)">
                  MAX SHARPE
                </text>
                <circle cx={x(front.minVar.sigma)} cy={y(front.minVar.mu)} r={8} fill="none" stroke="var(--a2)" />
                <text x={x(front.minVar.sigma) + 11} y={y(front.minVar.mu) + 12} fontSize={9} fill="var(--a2)">
                  MIN VARIANCE
                </text>
                <circle cx={x(0)} cy={y(rf)} r={3} fill="var(--warn)" />
              </g>
              {current && (
                <g>
                  <circle cx={x(current.sigma)} cy={y(current.mu)} r={6} fill="var(--neg)" opacity={0.85} />
                  <text x={x(current.sigma) + 9} y={y(current.mu) + 3} fontSize={9} fill="var(--neg)">
                    YOUR PORTFOLIO
                  </text>
                </g>
              )}
            </svg>
          )}
        </div>
      </Panel>
      <Panel title={pick === null ? "Tangency Portfolio" : "Selected Frontier Portfolio"} code="07.EF.B" source="MODEL" bodyClassName="overflow-y-auto p-3">
        {sel && (
          <>
            <div className="grid grid-cols-3 gap-px bg-line">
              {[
                ["Return", fmtPct(sel.mu, 2, false)],
                ["Vol", fmtPct(sel.sigma, 2, false)],
                ["Sharpe", sel.sharpe.toFixed(2)],
              ].map(([k, v]) => (
                <div key={k} className="bg-bg-1 p-1.5 text-center">
                  <div className="nx-label !text-[7.5px]">{k}</div>
                  <div className="text-[13px] text-a1">{v}</div>
                </div>
              ))}
            </div>
            <div className="nx-label mb-1.5 mt-3">Weights</div>
            <div className="space-y-[3px]">
              {sel.w
                .map((wt, i) => ({ wt, i }))
                .sort((a, b) => b.wt - a.wt)
                .map(({ wt, i }) => (
                  <div key={i} className="grid grid-cols-[86px_1fr_40px] items-center gap-2">
                    <span className="truncate text-[9.5px] text-dim">{uni.labels[i]}</span>
                    <span className="relative h-[7px] bg-line/50">
                      <span className="absolute inset-y-0 left-0" style={{ width: `${wt * 100}%`, background: uni.colors[i], boxShadow: `0 0 6px ${uni.colors[i]}` }} />
                    </span>
                    <span className="text-right text-[9.5px] text-ink">{(wt * 100).toFixed(1)}%</span>
                  </div>
                ))}
            </div>
            {pick !== null && (
              <button className="nx-btn mt-3 w-full !justify-center" onClick={() => setPick(null)}>
                Back to max-Sharpe
              </button>
            )}
            {current && (
              <div className="mt-3 border-t border-line pt-2 text-[9.5px] text-dim">
                Your holdings: μ {fmtPct(current.mu, 1, false)} · σ {fmtPct(current.sigma, 1, false)} · Sharpe {((current.mu - rf) / current.sigma).toFixed(2)}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
