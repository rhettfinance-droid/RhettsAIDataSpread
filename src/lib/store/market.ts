"use client";
import { create } from "zustand";
import type { Quote } from "../sim/engine";

type MarketState = {
  quotes: Record<string, Quote>;
  spark: Record<string, number[]>;
  tick: number;
  running: boolean;
  liveSymbols: string[];
  set: (p: Partial<MarketState>) => void;
};

export const useMarket = create<MarketState>((set) => ({
  quotes: {},
  spark: {},
  tick: 0,
  running: true,
  liveSymbols: [],
  set: (p) => set(p),
}));

export function useQuote(symbol: string): Quote | undefined {
  return useMarket((s) => s.quotes[symbol]);
}

export function useSpark(symbol: string): number[] | undefined {
  return useMarket((s) => s.spark[symbol]);
}
