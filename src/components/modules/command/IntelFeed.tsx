"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMarket } from "@/lib/store/market";
import { INSTRUMENT_MAP, INSTRUMENTS } from "@/lib/data/universe";
import { createRng } from "@/lib/rng";
import { fmtCompact, fmtPct, fmtPrice } from "@/lib/format";

type Ev = { id: number; t: string; tag: string; text: string; color: string };

const TAG_COLOR: Record<string, string> = {
  PX: "var(--a1)",
  VOL: "var(--a3)",
  FLOW: "var(--a2)",
  RATES: "#4d8bff",
  FX: "#ff8ad0",
  RISK: "var(--neg)",
  CMDTY: "#ff9f43",
  SYS: "var(--text-dim)",
};

/** Event stream synthesized from the simulated tape (labeled SIM). */
export function IntelFeed({ max = 80 }: { max?: number }) {
  const [events, setEvents] = useState<Ev[]>(() => [{ id: 0, t: new Date().toISOString().slice(11, 19), tag: "SYS", text: "intelligence stream online · source: NEXUS sim engine", color: TAG_COLOR.SYS }]);
  const last = useRef<Record<string, number>>({});
  const extremes = useRef<Record<string, { hi: number; lo: number }>>({});
  const rng = useRef(createRng(Date.now() >>> 0));
  const counter = useRef(0);

  useEffect(() => {
    const push = (tag: string, text: string) => {
      const now = new Date();
      const id = ++counter.current;
      const ev = { id, t: now.toISOString().slice(11, 19), tag, text, color: TAG_COLOR[tag] ?? "var(--text)" };
      setEvents((e) => [ev, ...e].slice(0, max));
    };
    const unsub = useMarket.subscribe((s, prev) => {
      if (s.tick === prev.tick) return;
      const r = rng.current;
      for (const inst of INSTRUMENTS) {
        const q = s.quotes[inst.symbol];
        if (!q) continue;
        const ref = last.current[inst.symbol];
        if (ref === undefined) {
          last.current[inst.symbol] = q.price;
          extremes.current[inst.symbol] = { hi: q.high, lo: q.low };
          continue;
        }
        const ex = extremes.current[inst.symbol];
        const move = inst.kind === "level" ? (q.price - ref) * 100 : q.price / ref - 1;
        const thr = inst.kind === "level" ? 1.5 : (inst.vol / Math.sqrt(252)) * 0.45;
        if (Math.abs(move) > thr) {
          last.current[inst.symbol] = q.price;
          const tag = inst.cls === "rate" ? "RATES" : inst.cls === "fx" ? "FX" : inst.cls === "commodity" ? "CMDTY" : inst.cls === "vol" ? "VOL" : "PX";
          push(tag, `${inst.symbol} ${move > 0 ? "▲" : "▼"} ${inst.kind === "level" ? `${move.toFixed(1)}bp` : fmtPct(move)} impulse → ${inst.kind === "level" ? q.price.toFixed(3) + "%" : fmtPrice(q.price)}`);
        }
        if (q.price > ex.hi * 1.0005 && inst.cls !== "rate") {
          ex.hi = q.price;
          if (r.next() < 0.25) push("PX", `${inst.symbol} prints new session high ${fmtPrice(q.price)}`);
        } else if (q.price < ex.lo * 0.9995 && inst.cls !== "rate") {
          ex.lo = q.price;
          if (r.next() < 0.25) push("PX", `${inst.symbol} breaks session low ${fmtPrice(q.price)}`);
        }
      }
      if (r.next() < 0.18) {
        const eq = INSTRUMENTS.filter((i) => i.cls === "equity");
        const i = r.pick(eq);
        const q = s.quotes[i.symbol];
        const shares = Math.round(r.range(0.2, 3) * 1e6);
        push("FLOW", `block ${r.next() < 0.5 ? "BUY" : "SELL"} ${i.symbol} ${fmtCompact(shares)} sh @ ${fmtPrice(q?.price)} · notional ${fmtCompact((q?.price ?? 0) * shares, "$")}`);
      }
      const vix = s.quotes["VIX"];
      if (vix && r.next() < 0.03) push(vix.price > 20 ? "RISK" : "VOL", `VIX ${vix.price.toFixed(2)} · regime ${vix.price > 25 ? "STRESS" : vix.price > 20 ? "ELEVATED" : "CALM"}`);
      if (r.next() < 0.02) {
        const s10 = s.quotes["US10Y"];
        const s2 = s.quotes["US02Y"];
        if (s10 && s2) push("RATES", `2s10s spread ${((s10.price - s2.price) * 100).toFixed(1)}bp · curve ${s10.price > s2.price ? "positive" : "inverted"}`);
      }
      void INSTRUMENT_MAP;
    });
    return unsub;
  }, [max]);

  return (
    <div className="h-full overflow-hidden px-2 py-1 text-[9.5px]">
      <AnimatePresence initial={false}>
        {events.map((e) => (
          <motion.div
            key={e.id}
            layout="position"
            initial={{ opacity: 0, x: -10, backgroundColor: "rgba(53,231,255,0.12)" }}
            animate={{ opacity: 1, x: 0, backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-[52px_40px_1fr] gap-1.5 border-b border-line/50 py-[3px]"
          >
            <span className="text-faint">{e.t}</span>
            <span style={{ color: e.color }}>{e.tag}</span>
            <span className="truncate text-ink/80">{e.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
