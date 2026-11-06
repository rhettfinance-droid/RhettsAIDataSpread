import { forceCenter, forceLink, forceManyBody, forceSimulation } from "d3-force-3d";
import { EDGES, NODES, type NodeType } from "@/lib/data/network";
import { createRng } from "@/lib/rng";

export type LayoutMode = "force" | "orbital" | "geo" | "strata";

export const LAYOUTS: { id: LayoutMode; label: string; desc: string }[] = [
  { id: "force", label: "Force", desc: "Force-directed: tightly connected institutions cluster together" },
  { id: "orbital", label: "Orbital", desc: "Concentric shells by entity class, like a gyroscope of the system" },
  { id: "geo", label: "Geo", desc: "Entities projected onto a sphere at their real-world location" },
  { id: "strata", label: "Strata", desc: "Layered hierarchy: policy → markets → institutions → real economy" },
];

const TYPE_ORDER: NodeType[] = ["central_bank", "currency", "bond", "bank", "exchange", "investor", "corporate", "commodity", "region"];

export const ORBIT: Record<NodeType, { r: number; tiltX: number; tiltZ: number }> = {
  region: { r: 12, tiltX: 0.0, tiltZ: 0.0 },
  central_bank: { r: 22, tiltX: 0.5, tiltZ: 0.2 },
  currency: { r: 30, tiltX: -0.35, tiltZ: 0.4 },
  bond: { r: 38, tiltX: 0.25, tiltZ: -0.45 },
  bank: { r: 46, tiltX: -0.15, tiltZ: -0.2 },
  exchange: { r: 53, tiltX: 0.6, tiltZ: 0.05 },
  investor: { r: 60, tiltX: -0.5, tiltZ: 0.3 },
  corporate: { r: 68, tiltX: 0.12, tiltZ: 0.15 },
  commodity: { r: 76, tiltX: -0.25, tiltZ: -0.35 },
};

export const STRATA_Y: Record<NodeType, number> = {
  central_bank: 44,
  currency: 32,
  bond: 20,
  bank: 8,
  exchange: -4,
  investor: -4,
  corporate: -18,
  commodity: -32,
  region: -46,
};

export const GEO_R = 52;

function rotate(x: number, y: number, z: number, ax: number, az: number): [number, number, number] {
  // rotate around X then Z
  const cy = Math.cos(ax);
  const sy = Math.sin(ax);
  const y1 = y * cy - z * sy;
  const z1 = y * sy + z * cy;
  const cz = Math.cos(az);
  const sz = Math.sin(az);
  return [x * cz - y1 * sz, x * sz + y1 * cz, z1];
}

export function latLonToVec(lat: number, lon: number, r: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta)];
}

let forceCache: Float32Array | null = null;

function forceLayout(): Float32Array {
  if (forceCache) return forceCache;
  const rng = createRng("force-layout");
  const nodes = NODES.map((n) => ({ id: n.id, x: rng.range(-40, 40), y: rng.range(-40, 40), z: rng.range(-40, 40) }));
  const links = EDGES.map((e) => ({ source: e.s, target: e.t, w: e.w }));
  const sim = forceSimulation(nodes, 3)
    .force(
      "link",
      forceLink(links)
        .id((d: { id: string }) => d.id)
        .distance((l: { w: number }) => 34 - l.w * 14)
        .strength((l: { w: number }) => 0.15 + l.w * 0.35),
    )
    .force("charge", forceManyBody().strength(-150))
    .force("center", forceCenter(0, 0, 0))
    .stop();
  for (let i = 0; i < 320; i++) sim.tick();
  // normalize radius
  let maxR = 0;
  for (const n of nodes) maxR = Math.max(maxR, Math.hypot(n.x, n.y, n.z));
  const k = 70 / (maxR || 1);
  const out = new Float32Array(NODES.length * 3);
  nodes.forEach((n, i) => {
    out[i * 3] = n.x * k;
    out[i * 3 + 1] = n.y * k * 0.8;
    out[i * 3 + 2] = n.z * k;
  });
  forceCache = out;
  return out;
}

export function computeLayout(mode: LayoutMode): Float32Array {
  if (mode === "force") return forceLayout();
  const out = new Float32Array(NODES.length * 3);
  const rng = createRng("layout-" + mode);
  if (mode === "orbital") {
    const byType: Record<string, number[]> = {};
    NODES.forEach((n, i) => (byType[n.type] ??= []).push(i));
    for (const t of TYPE_ORDER) {
      const idx = byType[t] ?? [];
      const o = ORBIT[t];
      idx.forEach((ni, k) => {
        const a = (k / idx.length) * Math.PI * 2 + TYPE_ORDER.indexOf(t) * 0.7;
        const [x, y, z] = rotate(Math.cos(a) * o.r, 0, Math.sin(a) * o.r, o.tiltX, o.tiltZ);
        out[ni * 3] = x;
        out[ni * 3 + 1] = y;
        out[ni * 3 + 2] = z;
      });
    }
    return out;
  }
  if (mode === "geo") {
    const alt: Record<NodeType, number> = {
      region: 1.0,
      central_bank: 1.16,
      bond: 1.12,
      currency: 1.2,
      bank: 1.08,
      exchange: 1.05,
      investor: 1.1,
      corporate: 1.04,
      commodity: 1.06,
    };
    NODES.forEach((n, i) => {
      const jl = rng.range(-2.2, 2.2);
      const jo = rng.range(-2.2, 2.2);
      const [x, y, z] = latLonToVec(n.lat + jl, n.lon + jo, GEO_R * alt[n.type]);
      out[i * 3] = x;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = z;
    });
    return out;
  }
  // strata
  const counters: Record<string, number> = {};
  const totals: Record<string, number> = {};
  NODES.forEach((n) => (totals[n.type] = (totals[n.type] ?? 0) + 1));
  NODES.forEach((n, i) => {
    const k = (counters[n.type] = (counters[n.type] ?? 0) + 1) - 1;
    const tot = totals[n.type];
    // angle derived from longitude so geography is preserved around the ring
    const lonA = ((n.lon + 180) / 360) * Math.PI * 2;
    const spread = (k / tot) * Math.PI * 2;
    const a = lonA * 0.55 + spread * 0.45;
    const r = n.type === "region" ? 30 : 22 + (k % 3) * 9 + rng.range(-2, 2);
    out[i * 3] = Math.cos(a) * r * 1.35;
    out[i * 3 + 1] = STRATA_Y[n.type] + rng.range(-1.5, 1.5) + (n.type === "investor" ? 0 : n.type === "exchange" ? 0 : 0);
    out[i * 3 + 2] = Math.sin(a) * r * 1.35;
    if (n.type === "investor") {
      out[i * 3] *= 0.62;
      out[i * 3 + 2] *= 0.62;
    }
  });
  return out;
}
