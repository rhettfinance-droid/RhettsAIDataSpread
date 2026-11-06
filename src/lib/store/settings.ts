"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId = "spectral" | "magenta" | "phosphor" | "arctic";

export const THEMES: Record<ThemeId, { name: string; a1: string; a2: string; a3: string; a4: string }> = {
  spectral: { name: "Spectral", a1: "#35e7ff", a2: "#3dff9a", a3: "#9a6bff", a4: "#3d7bff" },
  magenta: { name: "Magenta Desk", a1: "#ff2e88", a2: "#ff8ad0", a3: "#b14dff", a4: "#ff5470" },
  phosphor: { name: "Phosphor", a1: "#39ff6a", a2: "#c4ff3a", a3: "#2de2a6", a4: "#17c26a" },
  arctic: { name: "Arctic", a1: "#9fd4ff", a2: "#e8f4ff", a3: "#7aa2ff", a4: "#4f7dff" },
};

type SettingsState = {
  theme: ThemeId;
  scanlines: boolean;
  particles: number; // 0..1 density multiplier
  motion: "full" | "reduced";
  bloom: boolean;
  studentMode: boolean;
  bootSeen: boolean;
  set: (p: Partial<Omit<SettingsState, "set">>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "spectral",
      scanlines: true,
      particles: 1,
      motion: "full",
      bloom: true,
      studentMode: true,
      bootSeen: false,
      set: (p) => set(p),
    }),
    { name: "nexus-settings-v1" },
  ),
);

export function usePalette() {
  const theme = useSettings((s) => s.theme);
  return THEMES[theme];
}
