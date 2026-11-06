"use client";
import { useEffect, useRef } from "react";
import { MarketEngine } from "@/lib/sim/engine";
import { useMarket } from "@/lib/store/market";
import { useUI } from "@/lib/store/ui";
import { EQUITY_SYMBOLS } from "@/lib/data/universe";

/** Drives the simulated market feed and overlays live quotes when a provider key is configured server-side. */
export function SimEngine() {
  const engineRef = useRef<MarketEngine | null>(null);
  const running = useMarket((s) => s.running);

  useEffect(() => {
    if (!engineRef.current) engineRef.current = new MarketEngine();
    const eng = engineRef.current;
    const push = () => {
      const prev = useMarket.getState().quotes;
      const snap = eng.snapshot(prev);
      useMarket.setState({ quotes: snap.quotes, spark: snap.spark, tick: eng.tickCount });
    };
    push();
    if (!running) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      eng.step(1);
      push();
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // data-source status + live overlay
  useEffect(() => {
    let alive = true;
    let poll: number | undefined;
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => {
        if (!alive) return;
        useUI.getState().set({ dataStatus: { finnhub: !!s.finnhub, fred: !!s.fred, sec: !!s.sec, checked: true } });
        if (s.finnhub) {
          const load = async () => {
            try {
              const r = await fetch(`/api/quotes?symbols=${EQUITY_SYMBOLS.slice(0, 40).join(",")}`);
              const j = await r.json();
              if (!j.quotes || !engineRef.current) return;
              const live: string[] = [];
              for (const q of j.quotes as { symbol: string; price: number; prevClose: number; high: number; low: number }[]) {
                if (q.price > 0 && q.prevClose > 0) {
                  engineRef.current.setLive(q.symbol, q);
                  live.push(q.symbol);
                }
              }
              useMarket.setState({ liveSymbols: live });
            } catch {
              /* keep simulated feed */
            }
          };
          load();
          poll = window.setInterval(load, 30000);
        }
      })
      .catch(() => useUI.getState().set({ dataStatus: { finnhub: false, fred: false, sec: false, checked: true } }));
    return () => {
      alive = false;
      if (poll) window.clearInterval(poll);
    };
  }, []);

  return null;
}
