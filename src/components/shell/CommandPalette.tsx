"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MODULES } from "@/lib/modules";
import { NODES, NODE_TYPE_MAP } from "@/lib/data/network";
import { COMPANIES } from "@/lib/data/companies";
import { INSTRUMENTS } from "@/lib/data/universe";
import { useUI } from "@/lib/store/ui";
import { THEMES, useSettings, type ThemeId } from "@/lib/store/settings";
import { usePortfolio } from "@/lib/store/portfolio";
import { useMarket } from "@/lib/store/market";
import { Icon } from "../ui/Icon";

type Cmd = { id: string; group: string; label: string; hint?: string; keywords: string; run: () => void; color?: string };

function score(q: string, text: string): number {
  if (!q) return 1;
  const t = text.toLowerCase();
  const s = q.toLowerCase();
  if (t.startsWith(s)) return 3;
  if (t.includes(" " + s)) return 2.5;
  if (t.includes(s)) return 2;
  // subsequence fuzzy match
  let i = 0;
  for (const ch of t) if (ch === s[i]) i++;
  return i === s.length ? 1 : 0;
}

export function CommandPalette() {
  const open = useUI((s) => s.paletteOpen);
  const setUI = useUI((s) => s.set);
  const notify = useUI((s) => s.notify);
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Cmd[]>(() => {
    const close = () => setUI({ paletteOpen: false });
    const cmds: Cmd[] = [];
    for (const m of MODULES)
      cmds.push({ id: "m:" + m.id, group: "Modules", label: `${m.code} · ${m.title}`, hint: m.description, keywords: `${m.label} ${m.title} ${m.description}`, run: () => (router.push(m.path), close()) });
    for (const n of NODES)
      cmds.push({
        id: "n:" + n.id,
        group: "Network Entities",
        label: n.name,
        hint: NODE_TYPE_MAP[n.type].label,
        color: NODE_TYPE_MAP[n.type].color,
        keywords: `${n.name} ${n.short} ${n.type}`,
        run: () => {
          setUI({ focusEntity: n.id, paletteOpen: false });
          router.push("/network");
        },
      });
    for (const c of COMPANIES)
      cmds.push({
        id: "c:" + c.ticker,
        group: "Company Intelligence",
        label: `${c.ticker} — ${c.name}`,
        hint: c.industry,
        keywords: `${c.ticker} ${c.name} ${c.sector}`,
        run: () => {
          setUI({ focusCompany: c.ticker, paletteOpen: false });
          router.push("/company");
        },
      });
    for (const i of INSTRUMENTS)
      cmds.push({
        id: "i:" + i.symbol,
        group: "Instruments",
        label: `${i.symbol} — ${i.name}`,
        hint: "Add to portfolio",
        keywords: `${i.symbol} ${i.name}`,
        run: () => {
          usePortfolio.getState().add(i.symbol);
          notify(`${i.symbol} added to portfolio (hypothetical)`);
          close();
        },
      });
    (Object.keys(THEMES) as ThemeId[]).forEach((t) =>
      cmds.push({ id: "t:" + t, group: "System", label: `Theme → ${THEMES[t].name}`, keywords: `theme color ${THEMES[t].name}`, color: THEMES[t].a1, run: () => (useSettings.getState().set({ theme: t }), close()) }),
    );
    cmds.push(
      { id: "s:scan", group: "System", label: "Toggle CRT scanlines", keywords: "scanlines crt effect", run: () => (useSettings.getState().set({ scanlines: !useSettings.getState().scanlines }), close()) },
      { id: "s:bloom", group: "System", label: "Toggle 3D bloom glow", keywords: "bloom glow webgl", run: () => (useSettings.getState().set({ bloom: !useSettings.getState().bloom }), close()) },
      { id: "s:pause", group: "System", label: "Pause / resume simulated feed", keywords: "pause resume feed sim", run: () => (useMarket.getState().set({ running: !useMarket.getState().running }), close()) },
      {
        id: "s:fs",
        group: "System",
        label: "Toggle browser full-screen",
        keywords: "fullscreen full screen",
        run: () => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen?.();
          close();
        },
      },
      { id: "s:reset", group: "System", label: "Reset portfolio to demo allocation", keywords: "reset portfolio demo", run: () => (usePortfolio.getState().reset(), notify("Portfolio reset to demo allocation"), close()) },
      { id: "s:boot", group: "System", label: "Replay boot sequence", keywords: "boot intro replay", run: () => (sessionStorage.removeItem("nexus-booted"), location.reload()) },
      { id: "s:settings", group: "System", label: "Open settings & data sources", keywords: "settings preferences api keys data", run: () => setUI({ paletteOpen: false, settingsOpen: true }) },
    );
    return cmds;
  }, [router, setUI, notify]);

  const results = useMemo(() => {
    const scored = commands.map((c) => ({ c, s: Math.max(score(q, c.label) * 1.2, score(q, c.keywords)) })).filter((x) => x.s > 0);
    if (!q) return scored.filter((x) => x.c.group === "Modules" || x.c.group === "System").map((x) => x.c);
    return scored
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.c);
  }, [commands, q]);

  useEffect(() => setSel(0), [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input,textarea,select");
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setUI({ paletteOpen: !useUI.getState().paletteOpen });
      } else if (e.key === "/" && !typing && !useUI.getState().paletteOpen) {
        e.preventDefault();
        setUI({ paletteOpen: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setUI]);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(results.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter") {
      results[sel]?.run();
    } else if (e.key === "Escape") {
      setUI({ paletteOpen: false });
    }
  };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[180] flex items-start justify-center bg-black/60 pt-[12vh] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setUI({ paletteOpen: false })}>
          <motion.div
            className="nx-panel w-[640px] max-w-[92vw] bg-bg-1/95 shadow-[0_30px_120px_rgba(0,0,0,0.9)]"
            initial={{ y: -12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
              <Icon d="M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM11 11l3.5 3.5" size={14} className="text-a1" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKey}
                placeholder="Search modules, institutions, companies, tickers, commands…"
                className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint"
              />
              <span className="text-[9px] text-faint">ESC</span>
            </div>
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1">
              {results.length === 0 && <div className="px-3 py-6 text-center text-dim">No matches for “{q}”</div>}
              {results.map((r, i) => {
                const header = r.group !== lastGroup ? r.group : null;
                lastGroup = r.group;
                return (
                  <div key={r.id}>
                    {header && <div className="nx-label px-3 pb-1 pt-2 !text-[8.5px] !text-faint">{header}</div>}
                    <button
                      data-idx={i}
                      onMouseEnter={() => setSel(i)}
                      onClick={() => r.run()}
                      className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left ${i === sel ? "bg-a1/10 text-ink" : "text-ink/75"}`}
                    >
                      <span className="h-1.5 w-1.5 shrink-0" style={{ background: r.color ?? "var(--line-3)", boxShadow: r.color ? `0 0 6px ${r.color}` : undefined }} />
                      <span className="truncate text-[11.5px]">{r.label}</span>
                      {r.hint && <span className="ml-auto truncate pl-4 text-[9.5px] text-faint">{r.hint}</span>}
                      {i === sel && <span className="text-[9px] text-a1">↵</span>}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 border-t border-line px-3 py-1.5 text-[9px] text-faint">
              <span>↑↓ navigate</span>
              <span>↵ execute</span>
              <span>0–8 jump to module</span>
              <span className="ml-auto">{results.length} results</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
