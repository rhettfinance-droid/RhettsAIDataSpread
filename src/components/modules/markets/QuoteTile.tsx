"use client";
import { memo } from "react";
import { useQuote, useSpark } from "@/lib/store/market";
import { INSTRUMENT_MAP } from "@/lib/data/universe";
import { fmtPct, fmtPrice } from "@/lib/format";
import { Spark } from "../../ui/Spark";
import clsx from "../../ui/clsx";

export const QuoteTile = memo(function QuoteTile({ symbol, active, onClick, compact }: { symbol: string; active?: boolean; onClick?: () => void; compact?: boolean }) {
  const q = useQuote(symbol);
  const spark = useSpark(symbol);
  const inst = INSTRUMENT_MAP[symbol];
  if (!inst) return null;
  const isRate = inst.kind === "level";
  const up = (q?.changePct ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      className={clsx(
        "group relative flex min-w-0 flex-col justify-between overflow-hidden border px-2 py-1.5 text-left transition",
        active ? "border-a1/60 bg-a1/[0.06]" : "border-line bg-bg-1/60 hover:border-line-3",
      )}
    >
      <div className="flex items-center gap-1">
        <span className="text-[10px] tracking-[0.08em] text-ink/90">{symbol}</span>
        {q?.source === "LIVE" ? <span className="text-[7px] text-pos">LIVE</span> : null}
        <span className={clsx("ml-auto text-[9.5px]", up ? "text-pos" : "text-neg")}>{isRate ? `${((q?.change ?? 0) * 100).toFixed(1)}bp` : fmtPct(q?.changePct)}</span>
      </div>
      {!compact && <div className="truncate text-[8.5px] text-faint">{inst.name}</div>}
      <div className="flex items-end justify-between gap-1">
        <span key={q?.ts} className={clsx("text-[14px] leading-tight text-ink", q?.dir === 1 ? "nx-flash-up" : q?.dir === -1 ? "nx-flash-down" : "")}>
          {q ? (isRate ? q.price.toFixed(3) + "%" : fmtPrice(q.price)) : "—"}
        </span>
        <Spark data={spark} width={54} height={18} baseline={q?.prevClose} />
      </div>
    </button>
  );
});
