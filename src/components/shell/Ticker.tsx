"use client";
import { memo } from "react";
import { useMarket } from "@/lib/store/market";
import { INSTRUMENT_MAP, TICKER_SYMBOLS } from "@/lib/data/universe";
import { fmtPct, fmtPrice } from "@/lib/format";

const Item = memo(function Item({ sym }: { sym: string }) {
  const q = useMarket((s) => s.quotes[sym]);
  const inst = INSTRUMENT_MAP[sym];
  if (!q || !inst) return null;
  const up = q.changePct >= 0;
  const isRate = inst.kind === "level";
  return (
    <span className="flex items-center gap-1.5 px-3.5">
      <span className="text-ink/80">{sym}</span>
      <span key={q.ts} className={q.dir > 0 ? "nx-flash-up" : q.dir < 0 ? "nx-flash-down" : ""}>
        {isRate ? q.price.toFixed(3) + "%" : fmtPrice(q.price)}
      </span>
      <span className={up ? "text-pos" : "text-neg"}>
        {up ? "▲" : "▼"} {isRate ? `${(q.change * 100).toFixed(1)}bp` : fmtPct(q.changePct)}
      </span>
      {q.source === "LIVE" && <span className="text-[8px] text-pos">●</span>}
    </span>
  );
});

export function Ticker() {
  const list = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS];
  return (
    <footer className="relative z-20 flex h-[24px] shrink-0 items-center overflow-hidden border-t border-line bg-bg-1/90 text-[10px]">
      <div className="z-10 flex h-full shrink-0 items-center gap-1.5 border-r border-line bg-bg-1 px-2.5 text-[8.5px] tracking-[0.18em] text-warn">
        <span className="h-1.5 w-1.5 rounded-full bg-warn nx-blink" /> SIM TAPE
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="nx-ticker-track flex w-max">
          {list.map((s, i) => (
            <Item key={s + i} sym={s} />
          ))}
        </div>
      </div>
      <div className="z-10 hidden h-full shrink-0 items-center border-l border-line bg-bg-1 px-2.5 text-[8.5px] tracking-[0.14em] text-faint md:flex">
        SIMULATED PRICES · NOT INVESTMENT ADVICE
      </div>
    </footer>
  );
}
