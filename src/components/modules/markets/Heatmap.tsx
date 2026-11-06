"use client";
import { useMemo } from "react";
import * as d3 from "d3";
import { EQUITY_SYMBOLS, INSTRUMENT_MAP, SECTORS, SECTOR_NAME, type SectorId } from "@/lib/data/universe";
import { useMarket } from "@/lib/store/market";
import { horizonReturn, type Horizon } from "@/lib/sim/analytics";
import { useSize } from "../../charts/useSize";
import { useTip } from "../../ui/Tooltip";
import { fmtBn, fmtPct, fmtPrice } from "@/lib/format";

export function heatColor(r: number, scale = 0.03) {
  const k = Math.max(-1, Math.min(1, r / scale));
  if (k >= 0) return `rgba(${Math.round(8 + 20 * k)}, ${Math.round(60 + 170 * k)}, ${Math.round(70 + 90 * k)}, ${0.35 + 0.55 * k})`;
  return `rgba(${Math.round(70 + 185 * -k)}, ${Math.round(30 + 20 * -k)}, ${Math.round(48 + 40 * -k)}, ${0.35 + 0.55 * -k})`;
}

export function Heatmap({ horizon, onPick, selected }: { horizon: Horizon; onPick?: (s: string) => void; selected?: string }) {
  const [ref, { w, h }] = useSize();
  const quotes = useMarket((s) => s.quotes);
  const tip = useTip();
  const scale = { "1D": 0.025, "5D": 0.05, "1M": 0.1, "3M": 0.18, "1Y": 0.35 }[horizon];

  const layout = useMemo(() => {
    if (!w || !h) return null;
    type Leaf = { name: string; value: number; sector: SectorId };
    const root = d3
      .hierarchy<{ name: string; children?: unknown[] } | Leaf>({
        name: "root",
        children: SECTORS.map((s) => ({
          name: s.id,
          children: EQUITY_SYMBOLS.filter((sym) => INSTRUMENT_MAP[sym].sector === s.id).map((sym) => ({ name: sym, value: INSTRUMENT_MAP[sym].mcap ?? 1, sector: s.id })),
        })),
      } as never)
      .sum((d) => (d as Leaf).value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3.treemap<any>().size([w, h]).paddingOuter(1).paddingTop(13).paddingInner(1).tile(d3.treemapSquarify.ratio(1.2))(root as never);
    return root as unknown as d3.HierarchyRectangularNode<{ name: string; sector?: SectorId }>;
  }, [w, h]);

  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden">
      {layout?.children?.map((sec) => (
        <div key={sec.data.name} className="absolute border border-line-2/60" style={{ left: sec.x0, top: sec.y0, width: sec.x1 - sec.x0, height: sec.y1 - sec.y0 }}>
          <div className="truncate px-1 text-[8px] leading-[12px] tracking-[0.14em] text-dim">{SECTOR_NAME[sec.data.name as SectorId]?.toUpperCase()}</div>
        </div>
      ))}
      {layout?.leaves().map((leaf) => {
        const sym = leaf.data.name;
        const q = quotes[sym];
        const r = horizon === "1D" ? q?.changePct ?? 0 : horizonReturn(sym, q?.price, horizon);
        const cw = leaf.x1 - leaf.x0;
        const ch = leaf.y1 - leaf.y0;
        const inst = INSTRUMENT_MAP[sym];
        return (
          <button
            key={sym}
            onClick={() => onPick?.(sym)}
            onMouseMove={(e) =>
              tip.show(
                e.clientX,
                e.clientY,
                <div>
                  <div className="flex gap-3">
                    <span className="text-ink">{sym}</span>
                    <span className="text-dim">{inst.name}</span>
                  </div>
                  <div className="text-[9px] text-faint">{SECTOR_NAME[inst.sector!]}</div>
                  <div className="mt-1 flex gap-3">
                    <span>{fmtPrice(q?.price)}</span>
                    <span className={r >= 0 ? "text-pos" : "text-neg"}>
                      {fmtPct(r)} {horizon}
                    </span>
                  </div>
                  <div className="text-faint">Mkt cap (illustr.) {fmtBn(inst.mcap)} · SIM</div>
                </div>,
              )
            }
            onMouseLeave={() => tip.hide()}
            className="absolute flex flex-col items-center justify-center overflow-hidden transition-[background-color] duration-700 hover:z-10 hover:outline hover:outline-1 hover:outline-white/60"
            style={{
              left: leaf.x0,
              top: leaf.y0,
              width: cw,
              height: ch,
              background: heatColor(r, scale),
              outline: selected === sym ? "1px solid var(--a1)" : undefined,
            }}
          >
            {cw > 26 && ch > 14 && <span className="leading-none text-white/90" style={{ fontSize: Math.max(8, Math.min(15, Math.sqrt(cw * ch) / 5.5)) }}>{sym}</span>}
            {cw > 34 && ch > 26 && <span className="mt-0.5 text-[8.5px] leading-none text-white/70">{fmtPct(r, 1)}</span>}
          </button>
        );
      })}
    </div>
  );
}
