"use client";
import type { ReactNode } from "react";
import { create } from "zustand";

type TipState = { x: number; y: number; content: ReactNode | null; show: (x: number, y: number, c: ReactNode) => void; hide: () => void };

export const useTip = create<TipState>((set) => ({
  x: 0,
  y: 0,
  content: null,
  show: (x, y, content) => set({ x, y, content }),
  hide: () => set({ content: null }),
}));

export function TooltipLayer() {
  const { x, y, content } = useTip();
  if (!content) return null;
  const w = typeof window !== "undefined" ? window.innerWidth : 1600;
  const h = typeof window !== "undefined" ? window.innerHeight : 900;
  const left = x + 300 > w ? x - 290 : x + 14;
  const top = y + 140 > h ? y - 120 : y + 14;
  return (
    <div className="nx-tooltip" style={{ left, top }}>
      {content}
    </div>
  );
}
