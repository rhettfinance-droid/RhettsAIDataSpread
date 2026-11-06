"use client";
import { useMemo, useState } from "react";
import { Panel } from "../../ui/Panel";
import { Segmented, Meter } from "../../ui/Controls";
import { QuoteTile } from "./QuoteTile";
import { CandleChart, type ChartStyle } from "./CandleChart";
import { Heatmap } from "./Heatmap";
import { LineChart } from "../../charts/LineChart";
import { HBars } from "../../charts/Bars";
import { Spark } from "../../ui/Spark";
import { useMarket } from "@/lib/store/market";
import { EQUITY_SYMBOLS, INSTRUMENTS, INSTRUMENT_MAP } from "@/lib/data/universe";
import { breadthSeries, horizonReturn, realizedVol, sectorReturns, type Horizon } from "@/lib/sim/analytics";
import { getHistory } from "@/lib/sim/engine";
import { fmtCompact, fmtPct, fmtPrice, signClass } from "@/lib/format";

const KPI = ["SPX", "NDX", "DJI", "RUT", "VIX", "US10Y", "US02Y", "DXY", "GOLD", "WTI", "BTC", "EURUSD"];
const RANGES = [
  { value: "63", label: "3M" },
  { value: "126", label: "6M" },
  { value: "252", label: "1Y" },
  { value: "520", label: "2Y" },
];

function CrossAssetBoard() {
  const quotes = useMarket((s) => s.quotes);
  const spark = useMarket((s) => s.spark);
  const groups = ["Rates", "FX", "Commodities", "Digital Assets", "Funds"];
  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-[10px]">
        <tbody>
          {groups.map((g) => (
            <GroupRows key={g} group={g} quotes={quotes} spark={spark} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GroupRows({ group, quotes, spark }: { group: string; quotes: ReturnType<typeof useMarket.getState>["quotes"]; spark: Record<string, number[]> }) {
  const rows = INSTRUMENTS.filter((i) => i.group === group);
  return (
    <>
      <tr>
        <td colSpan={5} className="nx-label px-2 pb-0.5 pt-2 !text-[8px] !text-faint">
          {group}
        </td>
      </tr>
      {rows.map((i) => {
        const q = quotes[i.symbol];
        const isRate = i.kind === "level";
        const m1 = horizonReturn(i.symbol, q?.price, "1M");
        return (
          <tr key={i.symbol} className="border-t border-line/60 hover:bg-a1/5">
            <td className="px-2 py-[3px] text-ink/85">{i.symbol}</td>
            <td className="text-right text-ink">{q ? (isRate ? q.price.toFixed(3) + "%" : fmtPrice(q.price)) : "—"}</td>
            <td className={`text-right ${signClass(q?.change)}`}>{isRate ? `${((q?.change ?? 0) * 100).toFixed(1)}bp` : fmtPct(q?.changePct)}</td>
            <td className={`text-right ${signClass(m1)}`} title="1-month change">
              {isRate ? `${(((m1 * (q?.price ?? 0)) / (1 + m1)) * 100).toFixed(0)}bp` : fmtPct(m1, 1)}
            </td>
            <td className="w-[58px] pl-2 pr-1">
              <Spark data={spark[i.symbol]} width={52} height={14} baseline={q?.prevClose} />
            </td>
          </tr>
        );
      })}
    </>
  );
}

function BreadthPanel() {
  const quotes = useMarket((s) => s.quotes);
  const b = useMemo(() => breadthSeries(), []);
  const live = useMemo(() => {
    let adv = 0;
    let dec = 0;
    let upVol = 0;
    let dnVol = 0;
    for (const s of EQUITY_SYMBOLS) {
      const q = quotes[s];
      if (!q) continue;
      if (q.changePct > 0) {
        adv++;
        upVol += q.volume;
      } else {
        dec++;
        dnVol += q.volume;
      }
    }
    return { adv, dec, upVol, dnVol };
  }, [quotes]);
  const last = b[b.length - 1];
  const tot = live.adv + live.dec || 1;
  return (
    <div className="flex h-full flex-col p-2">
      <div className="grid grid-cols-4 gap-2">
        <div>
          <div className="nx-label !text-[8px]">Adv / Dec</div>
          <div className="text-[13px]">
            <span className="text-pos">{live.adv}</span>
            <span className="text-faint"> / </span>
            <span className="text-neg">{live.dec}</span>
          </div>
        </div>
        <div>
          <div className="nx-label !text-[8px]">Up volume</div>
          <div className="text-[13px] text-ink">{((live.upVol / (live.upVol + live.dnVol || 1)) * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="nx-label !text-[8px]">% &gt; 50DMA</div>
          <div className="text-[13px] text-a1">{last?.above50.toFixed(0)}%</div>
        </div>
        <div>
          <div className="nx-label !text-[8px]">McClellan</div>
          <div className={`text-[13px] ${signClass(last?.mcclellan)}`}>{last?.mcclellan.toFixed(1)}</div>
        </div>
      </div>
      <div className="mt-1.5 flex h-[5px] overflow-hidden">
        <div className="bg-pos/80 shadow-[0_0_6px_var(--pos)]" style={{ width: `${(live.adv / tot) * 100}%` }} />
        <div className="flex-1 bg-neg/70" />
      </div>
      <div className="mt-1 min-h-0 flex-1">
        <LineChart
          series={[
            { id: "ad", label: "A/D line", data: b.map((p) => ({ x: p.t, y: p.ad })), color: "var(--a1)", area: true },
            { id: "a50", label: "% above 50DMA", data: b.map((p) => ({ x: p.t, y: p.above50 })), color: "#ffb547", axis: "right", width: 1 },
          ]}
          yFormat={(v) => v.toFixed(0)}
          yFormatRight={(v) => `${v.toFixed(0)}%`}
          xFormat={(v) => new Date(v).toLocaleDateString("en-US", { month: "short" })}
          margin={{ t: 6, r: 32, b: 16, l: 34 }}
        />
      </div>
    </div>
  );
}

function VolPanel() {
  const vix = useMarket((s) => s.quotes["VIX"]);
  const rv = useMemo(() => realizedVol("SPX", 20).slice(-200), []);
  const vixHist = useMemo(() => getHistory("VIX").slice(-200).map((b) => ({ x: b.time * 1000, y: b.close })), []);
  const v = vix?.price ?? 16;
  // model term structure: mean-reversion toward long-run level θ with speed κ
  const theta = 19.5;
  const kappa = 2.2;
  const curve = [1, 2, 3, 4, 5, 6, 7, 8].map((m) => ({ m, f: theta + (v - theta) * Math.exp((-kappa * m) / 12) }));
  const contango = curve[1].f > v;
  const pct = useMemo(() => {
    const h = getHistory("VIX").map((b) => b.close);
    return h.filter((x) => x < v).length / h.length;
  }, [v]);
  const fmin = Math.min(v, ...curve.map((c) => c.f)) - 1;
  const fmax = Math.max(v, ...curve.map((c) => c.f)) + 1;
  return (
    <div className="flex h-full flex-col p-2">
      <div className="flex items-start gap-3">
        <div>
          <div className="nx-label !text-[8px]">VIX spot</div>
          <div className="text-[18px] leading-tight text-ink">{v.toFixed(2)}</div>
          <div className={`text-[9px] ${contango ? "text-pos" : "text-neg"}`}>{contango ? "CONTANGO · calm" : "BACKWARDATION · stress"}</div>
        </div>
        <div className="flex-1">
          <div className="nx-label mb-1 !text-[8px]">Futures curve (model)</div>
          <svg viewBox="0 0 160 46" className="h-[46px] w-full">
            {curve.map((c, i) => {
              const x = 8 + i * 20;
              const y = 40 - ((c.f - fmin) / (fmax - fmin)) * 34;
              const next = curve[i + 1];
              return (
                <g key={c.m}>
                  {next && <line x1={x} y1={y} x2={x + 20} y2={40 - ((next.f - fmin) / (fmax - fmin)) * 34} stroke="var(--a3)" strokeWidth={1.2} />}
                  <circle cx={x} cy={y} r={1.8} fill="var(--a3)" />
                  <text x={x} y={46} fontSize={5} textAnchor="middle" fill="var(--text-faint)">
                    M{c.m}
                  </text>
                </g>
              );
            })}
            <line x1={0} x2={160} y1={40 - ((v - fmin) / (fmax - fmin)) * 34} y2={40 - ((v - fmin) / (fmax - fmin)) * 34} stroke="var(--line-3)" strokeDasharray="2 2" />
          </svg>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="nx-label !text-[8px]">2Y percentile</span>
        <Meter value={pct} segments={24} color={pct > 0.7 ? "var(--neg)" : pct > 0.4 ? "var(--warn)" : "var(--pos)"} className="flex-1" />
        <span className="text-[10px] text-ink">{(pct * 100).toFixed(0)}</span>
      </div>
      <div className="mt-1 min-h-0 flex-1">
        <LineChart
          series={[
            { id: "vix", label: "VIX (implied)", data: vixHist, color: "var(--a3)" },
            { id: "rv", label: "SPX 20d realized", data: rv, color: "var(--a1)", width: 1 },
          ]}
          yFormat={(x) => x.toFixed(0)}
          xFormat={(x) => new Date(x).toLocaleDateString("en-US", { month: "short" })}
          margin={{ t: 6, r: 6, b: 16, l: 26 }}
        />
      </div>
    </div>
  );
}

export function MarketsModule() {
  const [symbol, setSymbol] = useState("SPX");
  const [range, setRange] = useState("252");
  const [style, setStyle] = useState<ChartStyle>("candles");
  const [bands, setBands] = useState(false);
  const [profile, setProfile] = useState(true);
  const [heatH, setHeatH] = useState<Horizon>("1D");
  const [secH, setSecH] = useState<Horizon>("1D");
  const quotes = useMarket((s) => s.quotes);
  const q = quotes[symbol];
  const inst = INSTRUMENT_MAP[symbol];
  const sectors = useMemo(() => sectorReturns(quotes, secH).sort((a, b) => b.ret - a.ret), [quotes, secH]);
  const movers = useMemo(() => {
    const list = EQUITY_SYMBOLS.map((s) => ({ s, r: quotes[s]?.changePct ?? 0 })).sort((a, b) => b.r - a.r);
    return { up: list.slice(0, 5), dn: list.slice(-5).reverse() };
  }, [quotes]);

  return (
    <div className="h-full overflow-y-auto p-2">
      <div className="grid min-h-full grid-rows-[62px_minmax(340px,1fr)_minmax(240px,0.74fr)] gap-2">
        <div className="grid grid-cols-6 gap-1.5 xl:grid-cols-12">
          {KPI.map((s) => (
            <QuoteTile key={s} symbol={s} compact active={s === symbol} onClick={() => setSymbol(s)} />
          ))}
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel
            title={`${symbol} · ${inst?.name ?? ""}`}
            code="02.A"
            source={q?.source ?? "SIM"}
            expandId="mk-chart"
            className="col-span-12 min-h-[340px] xl:col-span-7"
            right={
              <div className="flex items-center gap-1.5">
                <Segmented value={range} onChange={setRange} options={RANGES} />
                <Segmented
                  value={style}
                  onChange={setStyle}
                  options={[
                    { value: "candles", label: "OHLC" },
                    { value: "line", label: "Line" },
                    { value: "area", label: "Area" },
                  ]}
                />
                <button className="nx-btn !px-2 !py-[3px]" data-active={bands} onClick={() => setBands(!bands)} title="Bollinger Bands (20, 2σ)">
                  BB
                </button>
                <button className="nx-btn !px-2 !py-[3px]" data-active={profile} onClick={() => setProfile(!profile)} title="Volume profile of the visible range">
                  VP
                </button>
              </div>
            }
          >
            <div className="absolute left-2.5 top-1.5 z-10 flex items-baseline gap-3">
              <span className="text-[20px] text-ink">{q ? (inst?.kind === "level" ? q.price.toFixed(3) + "%" : fmtPrice(q.price)) : "—"}</span>
              <span className={`text-[11px] ${signClass(q?.changePct)}`}>
                {inst?.kind === "level" ? `${((q?.change ?? 0) * 100).toFixed(1)}bp` : `${q && q.change >= 0 ? "+" : ""}${fmtPrice(q?.change)} (${fmtPct(q?.changePct)})`}
              </span>
              <span className="text-[9px] text-faint">
                H {fmtPrice(q?.high)} · L {fmtPrice(q?.low)} · VOL {fmtCompact(q?.volume)}
              </span>
              <span className="text-[9px]">
                <span className="text-a3">━ MA20</span> <span className="text-warn">━ MA50</span> <span className="text-a1">RSI(14)</span>
              </span>
            </div>
            <div className="absolute inset-0 top-7">
              <CandleChart symbol={symbol} range={Number(range)} style={style} showBands={bands} showProfile={profile} />
            </div>
          </Panel>
          <Panel
            title="Equity Heatmap · S&P Leaders"
            code="02.B"
            source="SIM"
            expandId="mk-heat"
            className="col-span-12 min-h-[340px] xl:col-span-5"
            right={<Segmented value={heatH} onChange={setHeatH} options={(["1D", "5D", "1M", "3M", "1Y"] as Horizon[]).map((h) => ({ value: h, label: h }))} />}
            bodyClassName="p-1"
          >
            <Heatmap horizon={heatH} onPick={setSymbol} selected={symbol} />
          </Panel>
        </div>

        <div className="grid min-h-0 grid-cols-12 gap-2">
          <Panel
            title="Sector Performance"
            code="02.C"
            source="SIM"
            className="col-span-6 xl:col-span-3"
            right={<Segmented value={secH} onChange={setSecH} options={(["1D", "5D", "1M", "3M"] as Horizon[]).map((h) => ({ value: h, label: h }))} />}
            bodyClassName="overflow-y-auto p-2.5"
          >
            <HBars items={sectors.map((s) => ({ label: s.name.replace("Consumer ", "Cons. ").replace("Communication", "Comm."), value: s.ret * 100 }))} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <div className="nx-label mb-1 !text-[8px] !text-pos">Top movers</div>
                {movers.up.map((m) => (
                  <button key={m.s} onClick={() => setSymbol(m.s)} className="flex w-full justify-between text-[9.5px] hover:text-a1">
                    <span>{m.s}</span>
                    <span className="text-pos">{fmtPct(m.r)}</span>
                  </button>
                ))}
              </div>
              <div>
                <div className="nx-label mb-1 !text-[8px] !text-neg">Bottom movers</div>
                {movers.dn.map((m) => (
                  <button key={m.s} onClick={() => setSymbol(m.s)} className="flex w-full justify-between text-[9.5px] hover:text-a1">
                    <span>{m.s}</span>
                    <span className="text-neg">{fmtPct(m.r)}</span>
                  </button>
                ))}
              </div>
            </div>
          </Panel>
          <Panel title="Market Breadth" code="02.D" source="SIM" className="col-span-6 xl:col-span-3">
            <BreadthPanel />
          </Panel>
          <Panel title="Volatility Regime" code="02.E" source="SIM" className="col-span-6 xl:col-span-3">
            <VolPanel />
          </Panel>
          <Panel title="Cross-Asset Board" code="02.F" source="SIM" className="col-span-6 xl:col-span-3">
            <CrossAssetBoard />
          </Panel>
        </div>
      </div>
    </div>
  );
}
