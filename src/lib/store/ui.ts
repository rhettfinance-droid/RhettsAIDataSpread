"use client";
import { create } from "zustand";

export type DataStatus = {
  finnhub: boolean;
  fred: boolean;
  sec: boolean;
  checked: boolean;
};

type UIState = {
  paletteOpen: boolean;
  settingsOpen: boolean;
  fullscreenId: string | null;
  focusEntity: string | null; // network node id requested from command palette
  focusCompany: string | null; // ticker requested for company module
  dataStatus: DataStatus;
  toast: { id: number; text: string } | null;
  set: (p: Partial<Omit<UIState, "set">>) => void;
  notify: (text: string) => void;
};

export const useUI = create<UIState>((set) => ({
  paletteOpen: false,
  settingsOpen: false,
  fullscreenId: null,
  focusEntity: null,
  focusCompany: null,
  dataStatus: { finnhub: false, fred: false, sec: false, checked: false },
  toast: null,
  set: (p) => set(p),
  notify: (text) => set({ toast: { id: Date.now(), text } }),
}));
