"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { NavRail } from "./NavRail";
import { TopBar } from "./TopBar";
import { Ticker } from "./Ticker";
import { SimEngine } from "./SimEngine";
import { CommandPalette } from "./CommandPalette";
import { SettingsDrawer } from "./SettingsDrawer";
import { BootSequence } from "./BootSequence";
import { TooltipLayer } from "../ui/Tooltip";
import { useSettings } from "@/lib/store/settings";
import { useUI } from "@/lib/store/ui";
import { MODULES } from "@/lib/modules";

function Toast() {
  const toast = useUI((s) => s.toast);
  const set = useUI((s) => s.set);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => set({ toast: null }), 2600);
    return () => clearTimeout(id);
  }, [toast, set]);
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="nx-panel fixed bottom-9 right-4 z-[190] px-3 py-2 text-[10.5px] text-ink"
        >
          <span className="mr-2 text-a1">◆</span>
          {toast.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const theme = useSettings((s) => s.theme);
  const scanlines = useSettings((s) => s.scanlines);
  const router = useRouter();
  // Module content is driven by client-side simulation state, so it mounts after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.closest?.("input,textarea,select,[contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (useUI.getState().paletteOpen) return;
      // number keys jump to the module with that code (00–08)
      if (/^[0-9]$/.test(e.key)) {
        const m = MODULES.find((x) => Number(x.code) === Number(e.key));
        if (m) router.push(m.path);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return (
    <div className={scanlines ? "nx-scanlines" : ""}>
      <div className="nx-backdrop" />
      <div className="nx-vignette" />
      <SimEngine />
      <div className="relative z-10 flex h-screen w-screen overflow-hidden">
        <NavRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="relative min-h-0 flex-1 overflow-hidden">
            {mounted ? children : <div className="flex h-full items-center justify-center nx-label">establishing secure session…</div>}
          </main>
          <Ticker />
        </div>
      </div>
      <CommandPalette />
      <SettingsDrawer />
      <TooltipLayer />
      <Toast />
      <BootSequence />
    </div>
  );
}
