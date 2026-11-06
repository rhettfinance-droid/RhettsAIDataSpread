"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MonteCarloTab } from "./MonteCarlo";
import { FrontierTab } from "./Frontier";
import { CompoundTab, CorrelationTab, DCFTab, ScenarioTab } from "./Labs";

const TABS = [
  { id: "mc", code: "MC", label: "Monte Carlo", desc: "Thousands of wealth paths" },
  { id: "ef", code: "EF", label: "Efficient Frontier", desc: "Mean–variance optimization" },
  { id: "dcf", code: "DCF", label: "DCF Valuation", desc: "Intrinsic value + sensitivity" },
  { id: "sc", code: "SC", label: "Stress Scenarios", desc: "Historical & hypothetical shocks" },
  { id: "cr", code: "CR", label: "Correlation Lab", desc: "Diversification mechanics" },
  { id: "ci", code: "CI", label: "Compounding", desc: "Time value of money" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function QuantModule() {
  const [tab, setTab] = useState<TabId>("mc");
  const [ticker, setTicker] = useState<string | undefined>();
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as TabId);
    const tk = p.get("ticker");
    if (tk) setTicker(tk.toUpperCase());
  }, []);
  return (
    <div className="flex h-full flex-col gap-2 p-2">
      <div className="nx-panel flex shrink-0 items-stretch overflow-x-auto">
        <div className="flex items-center border-r border-line px-3">
          <span className="nx-label !text-ink">/ Quant Lab</span>
        </div>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`relative flex min-w-[130px] flex-col justify-center border-r border-line px-3 py-1.5 text-left transition ${tab === t.id ? "bg-a1/[0.07]" : "hover:bg-white/[0.02]"}`}>
            {tab === t.id && <motion.span layoutId="quant-tab" className="absolute inset-x-0 bottom-0 h-[2px] bg-a1 shadow-[0_0_10px_var(--a1)]" />}
            <span className="flex items-center gap-1.5">
              <span className="text-[9px] text-a1">{t.code}</span>
              <span className={`text-[10.5px] ${tab === t.id ? "text-ink" : "text-dim"}`}>{t.label}</span>
            </span>
            <span className="text-[8.5px] text-faint">{t.desc}</span>
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={tab} className="absolute inset-0" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.22 }}>
            {tab === "mc" && <MonteCarloTab />}
            {tab === "ef" && <FrontierTab />}
            {tab === "dcf" && <DCFTab initialTicker={ticker} />}
            {tab === "sc" && <ScenarioTab />}
            {tab === "cr" && <CorrelationTab />}
            {tab === "ci" && <CompoundTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
