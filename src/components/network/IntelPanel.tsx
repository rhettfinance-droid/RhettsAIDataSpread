"use client";
import { useMemo } from "react";
import Link from "next/link";
import { CENTRALITY, EDGE_TYPES, EDGE_TYPE_MAP, NODE_MAP, NODE_TYPE_MAP, neighbors, type NetNode } from "@/lib/data/network";
import { getHistory, syntheticSeries } from "@/lib/sim/engine";
import { useQuote } from "@/lib/store/market";
import { fmtBn, fmtPct, fmtPrice, signClass } from "@/lib/format";
import { LineChart } from "../charts/LineChart";
import { SourceTag } from "../ui/SourceTag";
import { Meter } from "../ui/Controls";
import { COMPANY_MAP } from "@/lib/data/companies";
import { useUI } from "@/lib/store/ui";

const TICKER_FOR: Record<string, string> = { CO_NVDA: "NVDA", CO_AAPL: "AAPL", CO_MSFT: "MSFT", CO_GOOGL: "GOOGL", CO_AMZN: "AMZN", CO_META: "META", CO_TSLA: "TSLA", CO_XOM: "XOM", CO_WMT: "WMT" };

export function IntelPanel({
  node,
  onSelect,
  onShock,
  shockActive,
  isolate,
  setIsolate,
  systemic,
}: {
  node: NetNode;
  onSelect: (id: string) => void;
  onShock: () => void;
  shockActive: boolean;
  isolate: boolean;
  setIsolate: (v: boolean) => void;
  systemic: number;
}) {
  const t = NODE_TYPE_MAP[node.type];
  const q = useQuote(node.sym ?? "__none__");
  const setUI = useUI((s) => s.set);
  const links = useMemo(() => neighbors(node.id), [node.id]);
  const perf = useMemo(() => {
    const ref = getHistory("SPX").slice(-260);
    if (node.sym) {
      const h = getHistory(node.sym).slice(-260);
      const base = h[0]?.close ?? 1;
      return h.map((b) => ({ x: b.time * 1000, y: (b.close / base - 1) * 100 }));
    }
    const s = syntheticSeries(node.id, 260, node.type === "region" ? 0.12 : 0.2, 0.05);
    return s.map((v, i) => ({ x: (ref[i]?.time ?? 0) * 1000, y: (v / s[0] - 1) * 100 }));
  }, [node]);
  const spx = useMemo(() => {
    const h = getHistory("SPX").slice(-260);
    return h.map((b) => ({ x: b.time * 1000, y: (b.close / h[0].close - 1) * 100 }));
  }, []);
  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const l of links) m[l.edge.type] = (m[l.edge.type] ?? 0) + 1;
    return m;
  }, [links]);
  const ticker = TICKER_FOR[node.id];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2" style={{ background: t.color, boxShadow: `0 0 8px ${t.color}` }} />
          <span className="nx-label" style={{ color: t.color }}>
            {t.label}
          </span>
          <span className="ml-auto text-[9px] text-faint">{node.id}</span>
        </div>
        <div className="mt-1.5 font-display text-[19px] font-medium leading-tight text-ink">{node.name}</div>
        <div className="mt-1 text-[10px] leading-relaxed text-dim">{node.desc}</div>
        <div className="mt-2.5 grid grid-cols-3 gap-px bg-line">
          <div className="bg-bg-1 p-1.5">
            <div className="nx-label !text-[8px]">{node.valueLabel}</div>
            <div className="text-[13px] text-ink">{fmtBn(node.value)}</div>
          </div>
          <div className="bg-bg-1 p-1.5">
            <div className="nx-label !text-[8px]">Centrality</div>
            <div className="text-[13px] text-a1">{(CENTRALITY[node.id] * 100).toFixed(0)}</div>
          </div>
          <div className="bg-bg-1 p-1.5">
            <div className="nx-label !text-[8px]">Systemic score</div>
            <div className="text-[13px] text-warn">{systemic.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {q && (
          <div className="flex items-center gap-2 border border-line bg-bg/50 px-2 py-1.5">
            <span className="text-[10px] text-dim">{node.sym}</span>
            <span className="text-[13px] text-ink">{fmtPrice(q.price)}</span>
            <span className={`text-[10.5px] ${signClass(q.changePct)}`}>{fmtPct(q.changePct)}</span>
            <SourceTag source={q.source} className="ml-auto" />
          </div>
        )}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="nx-label">1Y Performance vs S&P 500</span>
            <SourceTag source="SIM" />
          </div>
          <div className="h-[110px]">
            <LineChart
              series={[
                { id: "spx", label: "S&P 500", data: spx, color: "var(--text-faint)", width: 1 },
                { id: "n", label: node.short, data: perf, color: t.color, area: true, width: 1.4 },
              ]}
              yFormat={(v) => `${v.toFixed(0)}%`}
              refLines={[{ y: 0 }]}
              margin={{ t: 6, r: 6, b: 16, l: 30 }}
              xFormat={(v) => new Date(v).toLocaleDateString("en-US", { month: "short" })}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="nx-label">Key Indicators</span>
            <SourceTag source="REF" />
          </div>
          <div className="divide-y divide-line border border-line">
            {node.m.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between px-2 py-1">
                <span className="text-[9.5px] text-dim">{k}</span>
                <span className="text-[10.5px] text-ink">{v}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[9.5px] text-dim">Home region</span>
              <button className="text-[10.5px] text-a1 hover:underline" onClick={() => onSelect(node.region)}>
                {NODE_MAP[node.region]?.name}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button className="nx-btn !justify-center !py-1.5" data-active={shockActive} onClick={onShock} title="Propagate a unit stress shock from this entity through the network">
            ⚡ {shockActive ? "Shock running" : "Run contagion"}
          </button>
          <button className="nx-btn !justify-center !py-1.5" data-active={isolate} onClick={() => setIsolate(!isolate)}>
            ◎ {isolate ? "Show all" : "Isolate links"}
          </button>
          {ticker && COMPANY_MAP[ticker] && (
            <Link
              href="/company"
              onClick={() => setUI({ focusCompany: ticker })}
              className="nx-btn col-span-2 !justify-center !py-1.5"
            >
              Open {ticker} in Company Intelligence →
            </Link>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="nx-label">Relationships · {links.length}</span>
            <span className="flex gap-1.5">
              {EDGE_TYPES.filter((e) => byType[e.id]).map((e) => (
                <span key={e.id} className="text-[8.5px]" style={{ color: e.color }} title={e.label}>
                  {byType[e.id]}
                  {e.label[0]}
                </span>
              ))}
            </span>
          </div>
          <div className="space-y-px">
            {links.map(({ node: n, edge, dir }) => (
              <button key={edge.s + edge.t + edge.type} onClick={() => onSelect(n.id)} className="group grid w-full grid-cols-[10px_1fr_70px] items-center gap-2 px-1 py-[3px] text-left hover:bg-a1/5">
                <span className="text-[9px]" style={{ color: EDGE_TYPE_MAP[edge.type].color }}>
                  {dir === "out" ? "→" : "←"}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] text-ink/85 group-hover:text-ink">{n.name}</span>
                  <span className="block truncate text-[8.5px] text-faint">
                    {EDGE_TYPE_MAP[edge.type].label} · {edge.label}
                  </span>
                </span>
                <Meter value={edge.w} segments={10} color={EDGE_TYPE_MAP[edge.type].color} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
