"use client";
import { AnimatePresence, motion } from "framer-motion";
import { THEMES, useSettings, type ThemeId } from "@/lib/store/settings";
import { useUI } from "@/lib/store/ui";
import { useMarket } from "@/lib/store/market";
import { Slider, Toggle } from "../ui/Controls";
import { SIM_SPEED } from "@/lib/sim/engine";

export function SettingsDrawer() {
  const open = useUI((s) => s.settingsOpen);
  const status = useUI((s) => s.dataStatus);
  const setUI = useUI((s) => s.set);
  const st = useSettings();
  const running = useMarket((s) => s.running);
  const live = useMarket((s) => s.liveSymbols);

  const sources = [
    { id: "SIM", name: "NEXUS Market Engine", on: true, desc: `Multi-factor simulation, ×${SIM_SPEED} intraday clock. Always on; labeled SIM.` },
    { id: "FINNHUB", name: "Finnhub quotes", on: status.finnhub, desc: status.finnhub ? `Live US equity quotes (${live.length} symbols)` : "Set FINNHUB_API_KEY in .env.local" },
    { id: "FRED", name: "FRED macro series", on: status.fred, desc: status.fred ? "Live macro series in Macro module" : "Set FRED_API_KEY in .env.local" },
    { id: "SEC", name: "SEC EDGAR XBRL", on: status.sec, desc: status.sec ? "Search any US filer in Company module" : "Set SEC_USER_AGENT in .env.local" },
    { id: "REF", name: "Reference datasets", on: true, desc: "Bundled approximate macro, company & country data; labeled REF." },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[170] bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setUI({ settingsOpen: false })} />
          <motion.aside
            className="nx-panel fixed bottom-0 right-0 top-0 z-[171] flex w-[340px] flex-col bg-bg-1/95"
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="flex h-[38px] items-center border-b border-line px-3">
              <span className="nx-label !text-ink">/ System Configuration</span>
              <button className="ml-auto text-faint hover:text-a1" onClick={() => setUI({ settingsOpen: false })} aria-label="Close settings">✕</button>
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-3">
              <section>
                <div className="nx-label mb-2">Interface Theme</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(THEMES) as ThemeId[]).map((t) => (
                    <button key={t} onClick={() => st.set({ theme: t })} className="nx-btn !justify-start !py-2" data-active={st.theme === t}>
                      <span className="flex gap-0.5">
                        {[THEMES[t].a1, THEMES[t].a2, THEMES[t].a3].map((c) => (
                          <span key={c} className="h-2.5 w-1.5" style={{ background: c, boxShadow: `0 0 5px ${c}` }} />
                        ))}
                      </span>
                      {THEMES[t].name}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <div className="nx-label mb-1">Rendering</div>
                <Toggle label="CRT scanlines" value={st.scanlines} onChange={(v) => st.set({ scanlines: v })} />
                <Toggle label="3D bloom / glow" value={st.bloom} onChange={(v) => st.set({ bloom: v })} />
                <Toggle label="Reduced motion" value={st.motion === "reduced"} onChange={(v) => st.set({ motion: v ? "reduced" : "full" })} />
                <Toggle label="Student mode (formula hints)" value={st.studentMode} onChange={(v) => st.set({ studentMode: v })} />
                <div className="mt-2">
                  <Slider label="Particle density" value={st.particles} min={0.2} max={1.5} step={0.1} onChange={(v) => st.set({ particles: v })} format={(v) => `${Math.round(v * 100)}%`} />
                </div>
              </section>
              <section>
                <div className="nx-label mb-1">Simulation</div>
                <Toggle label="Simulated feed running" value={running} onChange={(v) => useMarket.getState().set({ running: v })} />
              </section>
              <section>
                <div className="nx-label mb-2">Data Sources</div>
                <div className="space-y-1.5">
                  {sources.map((s) => (
                    <div key={s.id} className="border border-line p-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${s.on ? "bg-pos shadow-[0_0_6px_var(--pos)]" : "bg-faint"}`} />
                        <span className="text-[10.5px] text-ink">{s.name}</span>
                        <span className={`ml-auto text-[8.5px] tracking-[0.14em] ${s.on ? "text-pos" : "text-faint"}`}>{s.on ? "ACTIVE" : "OFF"}</span>
                      </div>
                      <div className="mt-0.5 text-[9.5px] text-dim">{s.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[9.5px] leading-relaxed text-faint">
                  API keys are read only by server route handlers and never shipped to the browser. Copy <span className="text-dim">.env.example</span> to <span className="text-dim">.env.local</span> and restart.
                </p>
              </section>
              <section className="border-t border-line pt-3 text-[9.5px] leading-relaxed text-faint">
                NEXUS is an educational analytics environment. Simulated prices, reference datasets and model outputs are illustrative and are not investment advice.
              </section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
