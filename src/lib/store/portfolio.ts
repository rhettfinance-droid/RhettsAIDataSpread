"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Holding = { symbol: string; weight: number };

export const DEMO_HOLDINGS: Holding[] = [
  { symbol: "AAPL", weight: 0.09 },
  { symbol: "MSFT", weight: 0.09 },
  { symbol: "NVDA", weight: 0.07 },
  { symbol: "AMZN", weight: 0.06 },
  { symbol: "JPM", weight: 0.06 },
  { symbol: "LLY", weight: 0.05 },
  { symbol: "XOM", weight: 0.05 },
  { symbol: "COST", weight: 0.04 },
  { symbol: "CAT", weight: 0.04 },
  { symbol: "NEE", weight: 0.03 },
  { symbol: "EFA", weight: 0.08 },
  { symbol: "EEM", weight: 0.04 },
  { symbol: "IEF", weight: 0.15 },
  { symbol: "AGG", weight: 0.03 },
  { symbol: "GOLD", weight: 0.06 },
  { symbol: "VNQ", weight: 0.03 },
  { symbol: "BTC", weight: 0.03 },
];

type PortfolioState = {
  holdings: Holding[];
  mode: "demo" | "custom";
  name: string;
  setHoldings: (h: Holding[], mode?: "demo" | "custom") => void;
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  setWeight: (symbol: string, w: number) => void;
  normalize: () => void;
  reset: () => void;
};

export const usePortfolio = create<PortfolioState>()(
  persist(
    (set, get) => ({
      holdings: DEMO_HOLDINGS,
      mode: "demo",
      name: "NEXUS Demo Allocation",
      setHoldings: (h, mode = "custom") => set({ holdings: h, mode }),
      add: (symbol) => {
        if (get().holdings.some((h) => h.symbol === symbol)) return;
        set({ holdings: [...get().holdings, { symbol, weight: 0.05 }], mode: "custom" });
      },
      remove: (symbol) => set({ holdings: get().holdings.filter((h) => h.symbol !== symbol), mode: "custom" }),
      setWeight: (symbol, w) =>
        set({ holdings: get().holdings.map((h) => (h.symbol === symbol ? { ...h, weight: Math.max(0, w) } : h)), mode: "custom" }),
      normalize: () => {
        const tot = get().holdings.reduce((s, h) => s + h.weight, 0) || 1;
        set({ holdings: get().holdings.map((h) => ({ ...h, weight: h.weight / tot })) });
      },
      reset: () => set({ holdings: DEMO_HOLDINGS, mode: "demo", name: "NEXUS Demo Allocation" }),
    }),
    { name: "nexus-portfolio-v2" },
  ),
);
