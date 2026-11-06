"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import * as d3 from "d3";
import { AnimatePresence, motion } from "framer-motion";
import { Panel } from "../ui/Panel";
import { Toggle } from "../ui/Controls";
import { HBars } from "../charts/Bars";
import { CENTERS, COMMODITY_COLORS, COUNTRIES, GEO_METRICS, PRODUCERS, ROUTES, type MetricKey } from "@/lib/data/geo";
import type { GlobeLayers } from "./GlobeScene";
import { fmtPct } from "@/lib/format";

const GlobeScene = dynamic(() => import("./GlobeScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center nx-label">rendering planet…</div>,
});

const COUNTRY_CENTROIDS: Record<string, [number, number]> = {
  "840": [39, -98], "156": [35, 104], "276": [51, 10], "392": [36, 138], "356": [22, 79], "826": [54, -2], "250": [46.5, 2.5], "380": [42.8, 12.5], "124": [57, -100], "076": [-10, -52],
  "643": [60, 95], "410": [36.5, 127.8], "036": [-25, 134], "484": [23.6, -102.5], "724": [40.2, -3.7], "360": [-2, 118], "528": [52.2, 5.3], "682": [24, 45], "792": [39, 35], "756": [46.8, 8.2],
  "616": [52, 19], "032": [-35, -64], "752": [62, 15], "376": [31.4, 35], "784": [24, 54], "764": [15, 101], "578": [62, 9], "704": [16, 107], "608": [12.5, 122], "458": [4, 102], "710": [-29, 24],
  "818": [26.8, 30.8], "152": [-30, -71], "566": [9, 8],
};

function Gradient({ metric }: { metric: MetricKey }) {
  const m = GEO_METRICS.find((x) => x.id === metric)!;
  const stops = m.diverging ? ["#ff3d64", "#3a4a63", "#22f5a0"] : ["#1b2b6b", "#3d7bff", "#35e7ff", "#ffd166", "#ff3d64"];
  return (
    <div>
      <div className="h-[6px] w-full" style={{ background: `linear-gradient(90deg, ${stops.join(",")})` }} />
      <div className="mt-0.5 flex justify-between text-[8.5px] text-faint">
        <span>
          {m.domain[0]}
          {m.unit}
        </span>
        <span>{m.label}</span>
        <span>
          {m.domain[1]}
          {m.unit}+
        </span>
      </div>
    </div>
  );
}

export function GlobeModule() {
  const [layers, setLayers] = useState<GlobeLayers>({ centers: true, routes: true, commodities: true, borders: true });
  const [metric, setMetric] = useState<MetricKey | "none">("none");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; key: number } | null>(null);
  const [center, setCenter] = useState<string | null>(null);
  const [rankBy, setRankBy] = useState<MetricKey>("gdp");

  const sel = selected ? COUNTRIES[selected] : null;
  const hov = hovered ? COUNTRIES[hovered] : null;
  const ranked = useMemo(() => {
    const m = GEO_METRICS.find((x) => x.id === rankBy)!;
    return Object.values(COUNTRIES)
      .map((c) => ({ c, v: m.get(c) }))
      .sort((a, b) => b.v - a.v);
  }, [rankBy]);
  const median = (k: MetricKey) => d3.median(Object.values(COUNTRIES).map((c) => GEO_METRICS.find((m) => m.id === k)!.get(c))) ?? 0;

  const selectCountry = (id: string | null) => {
    setSelected(id);
    setCenter(null);
    if (id && COUNTRY_CENTROIDS[id]) setFocus({ lat: COUNTRY_CENTROIDS[id][0], lon: COUNTRY_CENTROIDS[id][1], key: Date.now() });
  };

  const centerObj = center ? CENTERS.find((c) => c.id === center) : null;

  return (
    <div className="grid h-full grid-cols-[240px_minmax(0,1fr)_330px] gap-2 p-2">
      <Panel title="Map Layers" code="08.A" source="REF" bodyClassName="overflow-y-auto p-2.5 space-y-4">
        <div>
          <Toggle label="Financial centers" value={layers.centers} onChange={(v) => setLayers({ ...layers, centers: v })} />
          <Toggle label="Trade corridors" value={layers.routes} onChange={(v) => setLayers({ ...layers, routes: v })} />
          <Toggle label="Commodity producers" value={layers.commodities} onChange={(v) => setLayers({ ...layers, commodities: v })} />
          <Toggle label="Borders & coastlines" value={layers.borders} onChange={(v) => setLayers({ ...layers, borders: v })} />
        </div>
        <div>
          <div className="nx-label mb-1.5">Choropleth</div>
          <div className="grid grid-cols-2 gap-px">
            <button className="nx-btn !justify-center" data-active={metric === "none"} onClick={() => setMetric("none")}>
              Off
            </button>
            {GEO_METRICS.map((m) => (
              <button key={m.id} className="nx-btn !justify-center !px-1" data-active={metric === m.id} onClick={() => setMetric(m.id)} title={m.label}>
                {m.label.replace("Gov. debt / GDP", "Debt/GDP").replace("Real GDP growth", "GDP growth")}
              </button>
            ))}
          </div>
          {metric !== "none" && (
            <div className="mt-2">
              <Gradient metric={metric} />
            </div>
          )}
        </div>
        <div>
          <div className="nx-label mb-1.5">Financial centers</div>
          <div className="space-y-px">
            {CENTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCenter(c.id);
                  setSelected(null);
                  setFocus({ lat: c.lat, lon: c.lon, key: Date.now() });
                }}
                className={`flex w-full items-center gap-2 px-1 py-[2px] text-left text-[9.5px] ${center === c.id ? "bg-a1/10 text-ink" : "text-dim hover:text-ink"}`}
              >
                <span className="w-3 text-[8px] text-a1">{c.tier === 1 ? "▲" : c.tier === 2 ? "△" : "·"}</span>
                {c.name}
                <span className="ml-auto text-[8px] text-faint">{c.kind.includes("cb") ? "CB" : ""}</span>
              </button>
            ))}
          </div>
        </div>
        {layers.commodities && (
          <div>
            <div className="nx-label mb-1.5">Commodities</div>
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(COMMODITY_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1.5 text-[9px] text-dim">
                  <span className="h-2 w-2 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }} />
                  {k}
                </span>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <section className="nx-panel relative min-h-0 overflow-hidden">
        <GlobeScene layers={layers} metric={metric} selected={selected} hovered={hovered} onHover={setHovered} onSelect={selectCountry} focus={focus} selectedCenter={center} onCenter={setCenter} />
        <div className="pointer-events-none absolute left-3 top-2.5">
          <div className="nx-label !text-ink/90">/ Global Economic Map</div>
          <div className="mt-0.5 text-[9px] tracking-[0.14em] text-faint">
            {CENTERS.length} CENTERS · {ROUTES.length} TRADE CORRIDORS · {PRODUCERS.length} PRODUCER SITES · {Object.keys(COUNTRIES).length} ECONOMIES
          </div>
        </div>
        <AnimatePresence>
          {hov && hov.id !== selected && (
            <motion.div key={hov.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="nx-panel pointer-events-none absolute bottom-3 left-1/2 w-[320px] -translate-x-1/2 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[12px] text-ink">{hov.name}</span>
                <span className="text-[9px] text-dim">{hov.region}</span>
                <span className="ml-auto text-[9px] text-a1">click to inspect</span>
              </div>
              <div className="mt-1 grid grid-cols-4 gap-2 text-[9.5px]">
                <span className="text-dim">
                  GDP <span className="text-ink">${hov.gdp}T</span>
                </span>
                <span className="text-dim">
                  g <span className="text-ink">{hov.growth}%</span>
                </span>
                <span className="text-dim">
                  CPI <span className="text-ink">{hov.inflation}%</span>
                </span>
                <span className="text-dim">
                  rate <span className="text-ink">{hov.rate}%</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="pointer-events-none absolute bottom-2.5 left-3 text-[8.5px] tracking-[0.12em] text-faint">DRAG TO ROTATE · SCROLL TO ZOOM · CLICK A COUNTRY</div>
      </section>

      <Panel title={sel ? "Country Intelligence" : centerObj ? "Financial Center" : "Global Economies"} code="08.B" source="REF" bodyClassName="overflow-y-auto">
        {sel ? (
          <div className="space-y-3 p-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-[20px] text-ink">{sel.name}</span>
                <span className="text-[10px] text-dim">{sel.iso}</span>
              </div>
              <div className="text-[9.5px] text-faint">
                {sel.region} · {sel.ccy} · {sel.cb}
              </div>
              <div className="text-[9.5px] text-faint">Main exchange: {sel.exchange}</div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-line">
              {[
                ["GDP", `$${sel.gdp}T`],
                ["Real growth", `${sel.growth}%`],
                ["Inflation", `${sel.inflation}%`],
                ["Policy rate", `${sel.rate}%`],
                ["Real rate", `${(sel.rate - sel.inflation).toFixed(1)}pp`],
                ["Unemployment", `${sel.unemp}%`],
              ].map(([k, v]) => (
                <div key={k} className="bg-bg-1 p-1.5">
                  <div className="nx-label !text-[7.5px]">{k}</div>
                  <div className="text-[13px] text-ink">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="nx-label mb-1.5">vs median of covered economies</div>
              <div className="space-y-1.5">
                {GEO_METRICS.filter((m) => m.id !== "gdp").map((m) => {
                  const v = m.get(sel);
                  const md = median(m.id);
                  const span = Math.max(Math.abs(m.domain[1] - m.domain[0]), 1);
                  const x = (val: number) => Math.max(0, Math.min(100, ((val - m.domain[0]) / span) * 100));
                  return (
                    <div key={m.id}>
                      <div className="flex justify-between text-[9px]">
                        <span className="text-dim">{m.label}</span>
                        <span className="text-ink">
                          {v.toFixed(1)}
                          {m.unit === "$T" ? "T" : m.unit === "pp" ? "pp" : "%"} <span className="text-faint">· med {md.toFixed(1)}</span>
                        </span>
                      </div>
                      <div className="relative mt-0.5 h-[6px] bg-line/50">
                        <span className="absolute inset-y-[-2px] w-px bg-warn" style={{ left: `${x(md)}%` }} />
                        <span className="absolute inset-y-0 left-0 bg-a1/70 shadow-[0_0_6px_var(--a1)]" style={{ width: `${x(v)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="nx-label mb-1.5">Debt / GDP</div>
              <div className="flex items-end gap-2">
                <span className={`font-display text-[22px] ${sel.debt > 100 ? "text-warn" : "text-ink"}`}>{sel.debt}%</span>
                <span className="pb-1 text-[9px] text-faint">{sel.debt > 100 ? "above 100% — elevated fiscal sensitivity to rates" : "moderate public leverage"}</span>
              </div>
            </div>
            <div>
              <div className="nx-label mb-1.5">Trade corridors</div>
              {ROUTES.filter((r) => r.label.toLowerCase().includes(sel.name.split(" ")[0].toLowerCase()) || (sel.region === "Europe" && r.label.includes("EU")))
                .slice(0, 6)
                .map((r) => (
                  <div key={r.label} className="flex justify-between text-[9.5px]">
                    <span className="text-dim">{r.label}</span>
                    <span className="text-warn">${r.v}B</span>
                  </div>
                ))}
            </div>
            <div className="text-[8.5px] text-faint">Approximate 2024 reference values (policy rates ~end-2024). Verify with national sources.</div>
          </div>
        ) : centerObj ? (
          <div className="space-y-3 p-3">
            <div className="font-display text-[20px] text-ink">{centerObj.name}</div>
            <div className="text-[10px] leading-relaxed text-dim">{centerObj.note}</div>
            {centerObj.exchange && (
              <div className="flex justify-between border-b border-line/60 pb-1 text-[10px]">
                <span className="text-dim">Exchange(s)</span>
                <span className="text-ink">{centerObj.exchange}</span>
              </div>
            )}
            {centerObj.cb && (
              <div className="flex justify-between border-b border-line/60 pb-1 text-[10px]">
                <span className="text-dim">Central bank / policy</span>
                <span className="text-right text-ink">{centerObj.cb}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-line/60 pb-1 text-[10px]">
              <span className="text-dim">Tier</span>
              <span className="text-a1">{centerObj.tier === 1 ? "Global" : centerObj.tier === 2 ? "International" : "Regional"}</span>
            </div>
            <div className="text-[10px] text-dim">
              Coordinates {centerObj.lat.toFixed(2)}, {centerObj.lon.toFixed(2)}
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="nx-label">Ranking</span>
                <select className="nx-input !py-0 !text-[9.5px]" value={rankBy} onChange={(e) => setRankBy(e.target.value as MetricKey)}>
                  {GEO_METRICS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-px">
                {ranked.slice(0, 16).map(({ c, v }, i) => (
                  <button key={c.id} onClick={() => selectCountry(c.id)} className="grid w-full grid-cols-[18px_1fr_56px] items-center gap-2 px-1 py-[2px] text-left hover:bg-a1/5">
                    <span className="text-[8.5px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span className="truncate text-[10px] text-ink/85">{c.name}</span>
                    <span className="text-right text-[10px] text-a1">
                      {rankBy === "gdp" ? `$${v.toFixed(2)}T` : `${v.toFixed(1)}${rankBy === "realRate" ? "pp" : "%"}`}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="nx-label mb-1.5">Largest trade corridors ($B goods)</div>
              <HBars items={[...ROUTES].sort((a, b) => b.v - a.v).slice(0, 8).map((r) => ({ label: r.label, value: r.v, color: "#ffb547" }))} format={(v) => v.toFixed(0)} />
            </div>
            <div className="text-[8.5px] leading-relaxed text-faint">
              Real policy rate = policy rate − CPI inflation. Global median real rate {fmtPct(median("realRate") / 100, 1)}.
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
