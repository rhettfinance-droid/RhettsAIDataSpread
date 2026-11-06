"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Panel } from "../../ui/Panel";
import { QuoteTile } from "../markets/QuoteTile";
import { Heatmap } from "../markets/Heatmap";
import { IntelFeed } from "./IntelFeed";
import { Gauge } from "../../charts/Gauge";
import { Bars } from "../../charts/Bars";
import { Heatmatrix } from "../../charts/Heatmatrix";
import { Meter } from "../../ui/Controls";
import { Spark } from "../../ui/Spark";
import { SourceTag } from "../../ui/SourceTag";
import { useMarket } from "@/lib/store/market";
import { MODULES } from "@/lib/modules";
import { NODE_TYPES, EDGES, NODES } from "@/lib/data/network";
import { latestRef, MACRO_META, refSeries, type MacroKey } from "@/lib/data/macro";
import { getHistory } from "@/lib/sim/engine";
import { EQUITY_SYMBOLS } from "@/lib/data/universe";
import { correlation } from "@/lib/stats";
import { Icon } from "../../ui/Icon";
import type { NodeType, EdgeType } from "@/lib/data/network";

const NetworkScene = dynamic(() => import("../../network/NetworkScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center nx-label">initializing webgl…</div>,
});

const ALL_NODE_TYPES = new Set<NodeType>(NODE_TYPES.map((t) => t.id));
const ALL_EDGE_TYPES = new Set<EdgeType>(["capital", "trade", "correlation", "exposure", "dependency"]);

function RiskRegime() {
  const quotes = useMarket((s) => s.quotes);
  const r = useMemo(() => {
    const vix = quotes["VIX"]?.price ?? 17;
    const vixHist = getHistory("VIX").map((b) => b.close);
    const vixPct = vixHist.filter((x) => x < vix).length / vixHist.length;
    const spxH = getHistory("SPX");
    const ma50 = spxH.slice(-50).reduce((s, b) => s + b.close, 0) / 50;
    const mom = Math.max(0, Math.min(1, 0.5 + ((quotes["SPX"]?.price ?? ma50) / ma50 - 1) * 12));
    let adv = 0;
    for (const s of EQUITY_SYMBOLS) if ((quotes[s]?.changePct ?? 0) > 0) adv++;
    const breadth = adv / EQUITY_SYMBOLS.length;
    const credit = Math.max(0, Math.min(1, 0.5 + (quotes["HYG"]?.changePct ?? 0) * 60));
    const usd = Math.max(0, Math.min(1, 0.5 - (quotes["DXY"]?.changePct ?? 0) * 60));
    const vol = 1 - vixPct;
    const score = vol * 0.3 + mom * 0.25 + breadth * 0.2 + credit * 0.15 + usd * 0.1;
    return { score, parts: [ ["Volatility", vol], ["Momentum", mom], ["Breadth", breadth], ["Credit", credit], ["USD liquidity", usd] ] as [string, number][] };
  }, [quotes]);
  const label = r.score > 0.62 ? "RISK-ON" : r.score < 0.4 ? "RISK-OFF" : "NEUTRAL";
  const color = r.score > 0.62 ? "var(--pos)" : r.score < 0.4 ? "var(--neg)" : "var(--warn)";
  return (
    <div className="flex h-full items-center gap-3 px-2">
      <div className="flex flex-col items-center">
        <Gauge value={r.score} label={label} sub={`${(r.score * 100).toFixed(0)} / 100`} color={color} size={118} />
      </div>
      <div className="flex-1 space-y-1.5">
        {r.parts.map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-[9px]">
              <span className="text-dim">{k}</span>
              <span className="text-ink/80">{(v * 100).toFixed(0)}</span>
            </div>
            <Meter value={v} segments={18} color={v > 0.6 ? "var(--pos)" : v < 0.4 ? "var(--neg)" : "var(--warn)"} />
          </div>
        ))}
      </div>
    </div>
  );
}

const VITALS: MacroKey[] = ["fedfunds", "cpi", "corePce", "unemployment", "gdp", "y10", "debt"];

function MacroVitals() {
  return (
    <div className="divide-y divide-line/70 px-2">
      {VITALS.map((k) => {
        const m = MACRO_META[k];
        const l = latestRef(k);
        const s = refSeries(k).slice(-16).map((p) => p.y ?? 0);
        const d = l.prev !== null ? l.value - l.prev : 0;
        return (
          <Link href="/macro" key={k} className="grid grid-cols-[1fr_70px_56px] items-center gap-2 py-[5px] hover:bg-a1/5">
            <div className="min-w-0">
              <div className="truncate text-[9.5px] text-ink/85">{m.label}</div>
              <div className="text-[8px] text-faint">{l.year} avg · {m.fred}</div>
            </div>
            <Spark data={s} width={70} height={18} color={m.color} />
            <div className="text-right">
              <div className="text-[11px] text-ink">{m.fmt(l.value)}</div>
              <div className={`text-[8.5px] ${d > 0 ? "text-pos" : d < 0 ? "text-neg" : "text-faint"}`}>
                {d > 0 ? "▲" : d < 0 ? "▼" : "■"} {Math.abs(d).toFixed(m.unit === "$T" ? 1 : 2)}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

const PULSE = [
  ["SPX", "US Large"],
  ["NDX", "US Tech"],
  ["RUT", "US Small"],
  ["EFA", "Intl Dev"],
  ["EEM", "EM Eq"],
  ["IEF", "UST 7-10"],
  ["AGG", "US Agg"],
  ["HYG", "High Yield"],
  ["GOLD", "Gold"],
  ["WTI", "Crude"],
  ["COPPER", "Copper"],
  ["BTC", "Bitcoin"],
  ["DXY", "Dollar"],
];

function CrossAssetPulse() {
  const quotes = useMarket((s) => s.quotes);
  return <Bars data={PULSE.map(([s, l]) => ({ label: s === "COPPER" ? "CU" : s, value: (quotes[s]?.changePct ?? 0) * 100, sub: l }))} format={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`} />;
}

const CORR = ["SPX", "NDX", "IEF", "DXY", "GOLD", "WTI", "BTC", "HYG"];

function CorrelationPulse() {
  const m = useMemo(() => {
    const rets = CORR.map((s) => {
      const c = getHistory(s).slice(-61).map((b) => b.close);
      return c.slice(1).map((v, i) => Math.log(v / c[i]));
    });
    return rets.map((a) => rets.map((b) => correlation(a, b)));
  }, []);
  return <Heatmatrix labels={CORR} values={m} />;
}

export function CommandModule() {
  return (
    <div className="grid h-full grid-cols-[288px_minmax(0,1fr)_330px] gap-2 overflow-hidden p-2">
      <div className="grid min-h-0 grid-rows-[auto_168px_minmax(0,1fr)] gap-2">
        <Panel title="Global Pulse" code="00.A" source="SIM" bodyClassName="p-1.5">
          <div className="grid grid-cols-2 gap-1">
            {["SPX", "NDX", "DJI", "RUT", "US10Y", "DXY", "GOLD", "BTC"].map((s) => (
              <QuoteTile key={s} symbol={s} compact />
            ))}
          </div>
        </Panel>
        <Panel title="Risk Regime" code="00.B" source="MODEL" delay={0.05}>
          <RiskRegime />
        </Panel>
        <Panel title="Macro Vitals" code="00.C" source="REF" bodyClassName="overflow-y-auto" delay={0.1}>
          <MacroVitals />
        </Panel>
      </div>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_190px] gap-2">
        <section className="nx-panel relative min-h-0 overflow-hidden">
          <NetworkScene
            mode="force"
            colorMode="type"
            nodeTypes={ALL_NODE_TYPES}
            edgeTypes={ALL_EDGE_TYPES}
            selected={null}
            hovered={null}
            onSelect={() => {}}
            onHover={() => {}}
            shock={null}
            compact
            autoRotate
          />
          <div className="pointer-events-none absolute left-4 top-3">
            <div className="text-[9px] tracking-[0.3em] text-a1">NEXUS // GLOBAL COMMAND</div>
            <div className="mt-1 font-display text-[26px] font-light leading-none tracking-[0.06em] text-ink nx-glow-text">Global Capital Topology</div>
            <div className="mt-1.5 text-[9.5px] tracking-[0.14em] text-dim">
              {NODES.length} INSTITUTIONS · {EDGES.length} LIVE RELATIONSHIPS · 9 ENTITY CLASSES
            </div>
          </div>
          <div className="pointer-events-none absolute right-4 top-3 flex flex-col items-end gap-1">
            {NODE_TYPES.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 text-[8.5px] tracking-[0.12em] text-dim">
                {t.plural.toUpperCase()}
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.color, boxShadow: `0 0 6px ${t.color}` }} />
              </span>
            ))}
          </div>
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1">
            {MODULES.slice(1).map((m) => (
              <Link key={m.id} href={m.path} className="nx-btn group !gap-1.5 !bg-bg/70 !py-1.5 backdrop-blur">
                <Icon d={m.icon} size={11} className="text-a1" />
                <span className="text-a1/80">{m.code}</span>
                {m.label}
                <span className="opacity-0 transition group-hover:opacity-100">→</span>
              </Link>
            ))}
          </div>
        </section>
        <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-2">
          <Panel title="Cross-Asset Pulse · 1D" code="00.D" source="SIM" bodyClassName="px-1 pb-1" delay={0.1}>
            <CrossAssetPulse />
          </Panel>
          <Panel title="Sector Heat · 1D" code="00.E" source="SIM" bodyClassName="p-1" delay={0.15}>
            <Heatmap horizon="1D" />
          </Panel>
        </div>
      </div>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_250px] gap-2">
        <Panel
          title="Intelligence Feed"
          code="00.F"
          source="SIM"
          right={
            <span className="flex items-center gap-1 text-[8.5px] text-pos">
              <span className="h-1.5 w-1.5 rounded-full bg-pos nx-blink" />
              STREAMING
            </span>
          }
          delay={0.1}
        >
          <IntelFeed />
        </Panel>
        <Panel title="Correlation Pulse · 60D" code="00.G" source="SIM" bodyClassName="p-2" delay={0.15}>
          <CorrelationPulse />
        </Panel>
      </div>
      <span className="hidden">
        <SourceTag source="SIM" />
      </span>
    </div>
  );
}
