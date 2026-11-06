"use client";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  CENTRALITY,
  EDGES,
  EDGE_TYPES,
  NODES,
  NODE_MAP,
  NODE_TYPES,
  NODE_TYPE_MAP,
  propagateShock,
  type EdgeType,
  type NodeType,
} from "@/lib/data/network";
import { LAYOUTS, type LayoutMode } from "./layouts";
import type { ColorMode } from "./NetworkScene";
import { IntelPanel } from "./IntelPanel";
import { Panel } from "../ui/Panel";
import { Segmented, Toggle } from "../ui/Controls";
import { HBars } from "../charts/Bars";
import { useUI } from "@/lib/store/ui";
import { fmtBn } from "@/lib/format";

const NetworkScene = dynamic(() => import("./NetworkScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center nx-label">initializing webgl…</div>,
});

export const SYSTEMIC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  for (const n of NODES) {
    const { impact } = propagateShock(n.id);
    out[n.id] = Object.entries(impact).reduce((s, [id, v]) => (id === n.id ? s : s + v), 0);
  }
  return out;
})();

export function NetworkModule() {
  const [mode, setMode] = useState<LayoutMode>("force");
  const [colorMode, setColorMode] = useState<ColorMode>("type");
  const [nodeTypes, setNodeTypes] = useState<Set<NodeType>>(() => new Set(NODE_TYPES.map((t) => t.id)));
  const [edgeTypes, setEdgeTypes] = useState<Set<EdgeType>>(() => new Set(EDGE_TYPES.map((t) => t.id)));
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [shock, setShock] = useState<{ source: string; t0: number } | null>(null);
  const [isolate, setIsolate] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [query, setQuery] = useState("");
  const focusEntity = useUI((s) => s.focusEntity);
  const setUI = useUI((s) => s.set);

  useEffect(() => {
    if (focusEntity && NODE_MAP[focusEntity]) {
      setSelected(focusEntity);
      setUI({ focusEntity: null });
    }
  }, [focusEntity, setUI]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.("input")) return;
      if (e.key === "Escape") {
        setSelected(null);
        setShock(null);
        setIsolate(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = <T,>(set: Set<T>, v: T) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    return n;
  };

  const counts = useMemo(() => {
    const nt: Record<string, number> = {};
    NODES.forEach((n) => (nt[n.type] = (nt[n.type] ?? 0) + 1));
    const et: Record<string, number> = {};
    EDGES.forEach((e) => (et[e.type] = (et[e.type] ?? 0) + 1));
    return { nt, et };
  }, []);

  const visibleCount = useMemo(() => {
    const vn = NODES.filter((n) => nodeTypes.has(n.type));
    const ids = new Set(vn.map((n) => n.id));
    const ve = EDGES.filter((e) => edgeTypes.has(e.type) && ids.has(e.s) && ids.has(e.t));
    return { n: vn.length, e: ve.length };
  }, [nodeTypes, edgeTypes]);

  const matches = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return NODES.filter((n) => n.name.toLowerCase().includes(q) || n.short.toLowerCase().includes(q)).slice(0, 8);
  }, [query]);

  const shockResult = useMemo(() => (shock ? propagateShock(shock.source) : null), [shock]);
  const node = selected ? NODE_MAP[selected] : null;
  const hov = hovered ? NODE_MAP[hovered] : null;

  const systemicTop = useMemo(
    () =>
      Object.entries(SYSTEMIC)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    [],
  );
  const centralTop = useMemo(
    () =>
      Object.entries(CENTRALITY)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    [],
  );

  const runShock = (id: string) => {
    setShock({ source: id, t0: Date.now() });
    setSelected(id);
    setIsolate(false);
  };

  return (
    <div className="grid h-full grid-cols-[236px_minmax(0,1fr)_330px] gap-2 p-2">
      {/* ── controls */}
      <Panel title="Network Control" code="01.A" className="min-h-0" bodyClassName="overflow-y-auto p-2.5 space-y-4">
        <div className="relative">
          <input className="nx-input w-full" placeholder="Find entity…" value={query} onChange={(e) => setQuery(e.target.value)} />
          {matches.length > 0 && (
            <div className="absolute inset-x-0 top-full z-20 border border-line-2 bg-bg-1">
              {matches.map((m) => (
                <button
                  key={m.id}
                  className="flex w-full items-center gap-2 px-2 py-1 text-left text-[10px] hover:bg-a1/10"
                  onClick={() => {
                    setSelected(m.id);
                    setQuery("");
                  }}
                >
                  <span className="h-1.5 w-1.5" style={{ background: NODE_TYPE_MAP[m.type].color }} />
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="nx-label mb-1.5">Layout</div>
          <Segmented wrap value={mode} onChange={setMode} options={LAYOUTS.map((l) => ({ value: l.id, label: l.label, title: l.desc }))} />
          <div className="mt-1 text-[9px] leading-snug text-faint">{LAYOUTS.find((l) => l.id === mode)?.desc}</div>
        </div>
        <div>
          <div className="nx-label mb-1.5">Node color</div>
          <Segmented
            value={colorMode}
            onChange={setColorMode}
            options={[
              { value: "type", label: "Entity class" },
              { value: "performance", label: "Day move", title: "Green/red by simulated daily change of the linked instrument" },
            ]}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="nx-label">Entities</span>
            <button className="text-[8.5px] text-faint hover:text-a1" onClick={() => setNodeTypes(new Set(nodeTypes.size === NODE_TYPES.length ? [] : NODE_TYPES.map((t) => t.id)))}>
              {nodeTypes.size === NODE_TYPES.length ? "NONE" : "ALL"}
            </button>
          </div>
          <div className="space-y-px">
            {NODE_TYPES.map((t) => {
              const on = nodeTypes.has(t.id);
              return (
                <button key={t.id} onClick={() => setNodeTypes(toggle(nodeTypes, t.id))} className={`flex w-full items-center gap-2 px-1 py-[3px] text-left ${on ? "" : "opacity-35"}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: t.color, boxShadow: on ? `0 0 6px ${t.color}` : undefined }} />
                  <span className="text-[10px] text-ink/85">{t.plural}</span>
                  <span className="ml-auto text-[9px] text-faint">{counts.nt[t.id]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="nx-label mb-1.5">Relationships</div>
          <div className="space-y-px">
            {EDGE_TYPES.map((t) => {
              const on = edgeTypes.has(t.id);
              return (
                <button key={t.id} onClick={() => setEdgeTypes(toggle(edgeTypes, t.id))} className={`flex w-full items-center gap-2 px-1 py-[3px] text-left ${on ? "" : "opacity-35"}`} title={t.desc}>
                  <span className="h-[2px] w-3.5" style={{ background: t.color, boxShadow: on ? `0 0 6px ${t.color}` : undefined }} />
                  <span className="text-[10px] text-ink/85">{t.label}</span>
                  <span className="ml-auto text-[9px] text-faint">{counts.et[t.id]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Toggle label="Auto-orbit camera" value={autoRotate} onChange={setAutoRotate} />
          <Toggle label="Isolate selection" value={isolate} onChange={setIsolate} />
        </div>
        <div className="border-t border-line pt-2 text-[9px] leading-relaxed text-faint">
          Drag to orbit · scroll to zoom · right-drag to pan · click a node for intelligence · ESC to reset. Sizes are approximate reference values; link weights are analyst estimates.
        </div>
      </Panel>

      {/* ── scene */}
      <section className="nx-panel relative min-h-0 overflow-hidden">
        <NetworkScene
          mode={mode}
          colorMode={colorMode}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          selected={selected}
          hovered={hovered}
          onSelect={(id) => {
            setSelected(id);
            if (!id) setIsolate(false);
          }}
          onHover={setHovered}
          shock={shock}
          isolate={isolate}
          autoRotate={autoRotate}
        />
        <div className="pointer-events-none absolute left-3 top-2.5">
          <div className="nx-label !text-ink/90">/ Global Capital Network</div>
          <div className="mt-0.5 text-[9px] tracking-[0.14em] text-faint">
            {visibleCount.n} ENTITIES · {visibleCount.e} LINKS · LAYOUT {mode.toUpperCase()} · {colorMode === "type" ? "CLASS" : "DAY MOVE (SIM)"}
          </div>
        </div>
        <div className="absolute right-3 top-2.5 flex gap-1">
          <Segmented value={mode} onChange={setMode} options={LAYOUTS.map((l) => ({ value: l.id, label: l.label, title: l.desc }))} />
        </div>
        <div className="pointer-events-none absolute bottom-2.5 left-3 flex flex-wrap gap-3">
          {EDGE_TYPES.filter((e) => edgeTypes.has(e.id)).map((e) => (
            <span key={e.id} className="flex items-center gap-1.5 text-[8.5px] tracking-[0.12em] text-dim">
              <span className="h-[2px] w-3" style={{ background: e.color, boxShadow: `0 0 5px ${e.color}` }} />
              {e.label.toUpperCase()}
            </span>
          ))}
        </div>
        <AnimatePresence>
          {hov && hov.id !== selected && (
            <motion.div
              key={hov.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="nx-panel pointer-events-none absolute bottom-9 left-1/2 w-[300px] -translate-x-1/2 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5" style={{ background: NODE_TYPE_MAP[hov.type].color }} />
                <span className="text-[11px] text-ink">{hov.name}</span>
                <span className="ml-auto text-[9px] text-dim">{NODE_TYPE_MAP[hov.type].label}</span>
              </div>
              <div className="mt-0.5 text-[9.5px] text-dim">
                {hov.valueLabel}: <span className="text-ink">{fmtBn(hov.value)}</span> · click for intelligence
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {shock && shockResult && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-12 w-[420px] -translate-x-1/2 border border-neg/50 bg-[rgba(30,4,10,0.82)] px-3 py-2 shadow-[0_0_40px_rgba(255,45,85,0.25)] backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neg nx-blink" />
                <span className="nx-label !text-neg">Contagion simulation</span>
                <button className="ml-auto text-[9px] text-dim hover:text-ink" onClick={() => setShock(null)}>
                  CLEAR ✕
                </button>
              </div>
              <div className="mt-1 text-[11px] text-ink">
                Shock origin: <span className="text-neg">{NODE_MAP[shock.source].name}</span> · reach {Object.keys(shockResult.impact).length - 1} entities · systemic score{" "}
                <span className="text-warn">{SYSTEMIC[shock.source].toFixed(1)}</span>
              </div>
              <div className="mt-1 text-[9px] text-faint">
                Unit stress diffuses along all links with damping ∝ link weight (illustrative network model, not a forecast).
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ── intelligence */}
      <Panel title={node ? "Entity Intelligence" : "Network Intelligence"} code="01.B" source={node ? undefined : "MODEL"} className="min-h-0" bodyClassName="overflow-hidden" expandId="net-intel">
        {node ? (
          <IntelPanel
            node={node}
            onSelect={setSelected}
            onShock={() => (shock?.source === node.id ? setShock(null) : runShock(node.id))}
            shockActive={shock?.source === node.id}
            isolate={isolate}
            setIsolate={setIsolate}
            systemic={SYSTEMIC[node.id]}
          />
        ) : (
          <div className="h-full space-y-4 overflow-y-auto p-3">
            {shock && shockResult ? (
              <div>
                <div className="nx-label mb-2 !text-neg">Most impacted entities</div>
                <HBars
                  items={Object.entries(shockResult.impact)
                    .filter(([id]) => id !== shock.source)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 14)
                    .map(([id, v]) => ({ label: NODE_MAP[id].short, value: v * 100, color: "var(--neg)", onClick: () => setSelected(id) }))}
                  format={(v) => `−${v.toFixed(0)}`}
                />
              </div>
            ) : null}
            <div>
              <div className="nx-label mb-1">Systemic importance</div>
              <div className="mb-2 text-[9px] text-faint">Total stress transmitted if the entity is shocked — click ⚡ to simulate</div>
              <div className="space-y-px">
                {systemicTop.map(([id, v], i) => (
                  <div key={id} className="flex items-center gap-2">
                    <span className="w-4 text-[9px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <button className="min-w-0 flex-1 truncate text-left text-[10px] text-ink/85 hover:text-a1" onClick={() => setSelected(id)}>
                      <span className="mr-1.5 inline-block h-1.5 w-1.5" style={{ background: NODE_TYPE_MAP[NODE_MAP[id].type].color }} />
                      {NODE_MAP[id].name}
                    </button>
                    <span className="text-[10px] text-warn">{v.toFixed(1)}</span>
                    <button className="nx-btn !px-1.5 !py-0" onClick={() => runShock(id)} title="Run contagion from this entity">
                      ⚡
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="nx-label mb-2">Weighted degree centrality</div>
              <HBars items={centralTop.map(([id, v]) => ({ label: NODE_MAP[id].short, value: v * 100, color: NODE_TYPE_MAP[NODE_MAP[id].type].color, onClick: () => setSelected(id) }))} format={(v) => v.toFixed(0)} />
            </div>
            <div>
              <div className="nx-label mb-2">Link composition</div>
              <HBars items={EDGE_TYPES.map((t) => ({ label: t.label, value: counts.et[t.id], color: t.color }))} format={(v) => v.toFixed(0)} />
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
