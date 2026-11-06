"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const LINES = [
  "NEXUS/OS 4.0.40 — global financial intelligence kernel",
  "mounting market engine ........................ factor model [17 factors]",
  "loading instrument universe .................... 105 instruments",
  "building capital network graph ................. 98 entities / 330+ links",
  "calibrating correlation surface ................ OK",
  "loading reference datasets ..................... macro · statements · countries",
  "probing external data sources .................. server-side keys only",
  "warming WebGL pipeline ......................... bloom · instancing · shaders",
  "SIMULATION MODE ENGAGED — all simulated values are labeled SIM",
  "system ready.",
];

export function BootSequence() {
  const [show, setShow] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("nexus-booted")) return;
      sessionStorage.setItem("nexus-booted", "1");
    } catch {
      return;
    }
    setShow(true);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setN(i);
      if (i >= LINES.length + 3) {
        clearInterval(id);
        setShow(false);
      }
    }, 190);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[300] flex cursor-pointer items-center justify-center bg-[#010204]"
          exit={{ opacity: 0, filter: "blur(8px)", scale: 1.03 }}
          transition={{ duration: 0.7 }}
          onClick={() => setShow(false)}
        >
          <div className="w-[640px] max-w-[90vw]">
            <div className="mb-6 flex items-center gap-4">
              <svg viewBox="0 0 32 32" width="44" height="44" className="drop-shadow-[0_0_12px_var(--a1)]">
                <g fill="none" stroke="var(--a1)" strokeWidth="1.1">
                  <path d="M16 2 29 9.5v13L16 30 3 22.5v-13z" opacity="0.5" />
                  <path d="M9 22V10l14 12V10" />
                </g>
              </svg>
              <div>
                <div className="font-display text-[28px] font-semibold tracking-[0.5em] text-ink nx-glow-text">NEXUS</div>
                <div className="text-[9px] tracking-[0.3em] text-dim">GLOBAL FINANCIAL INTELLIGENCE SYSTEM</div>
              </div>
            </div>
            <div className="space-y-0.5 text-[10.5px]">
              {LINES.slice(0, n).map((l, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={i === LINES.length - 2 ? "text-warn" : i === LINES.length - 1 ? "text-a1" : "text-dim"}>
                  <span className="text-faint">[{(i * 0.137).toFixed(3)}]</span> {l}
                </motion.div>
              ))}
            </div>
            <div className="mt-5 h-[2px] w-full bg-line">
              <motion.div className="h-full bg-a1 shadow-[0_0_10px_var(--a1)]" animate={{ width: `${Math.min(100, (n / LINES.length) * 100)}%` }} />
            </div>
            <div className="mt-2 text-right text-[8.5px] tracking-[0.2em] text-faint">CLICK TO SKIP</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
