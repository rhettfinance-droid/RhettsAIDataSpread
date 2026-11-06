"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as d3 from "d3";
import { feature, mesh } from "topojson-client";
import type { FeatureCollection, MultiLineString, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import { CENTERS, COMMODITY_COLORS, COUNTRIES, GEO_METRICS, PRODUCERS, ROUTES, type MetricKey } from "@/lib/data/geo";
import { useSettings } from "@/lib/store/settings";

export type GlobeLayers = { centers: boolean; routes: boolean; commodities: boolean; borders: boolean };

export type GlobeProps = {
  layers: GlobeLayers;
  metric: MetricKey | "none";
  selected: string | null; // country id
  hovered: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  focus: { lat: number; lon: number; key: number } | null;
  selectedCenter: string | null;
  onCenter: (id: string) => void;
};

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const FC = feature(topo, topo.objects.countries) as unknown as FeatureCollection<Geometry, { name: string }>;
export const COUNTRY_FEATURES = FC.features.map((f) => ({ id: String(f.id), name: f.properties.name }));

export function latLon(lat: number, lon: number, r = 1): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function toLatLon(p: THREE.Vector3): [number, number] {
  const r = p.length();
  const lat = 90 - (Math.acos(p.y / r) * 180) / Math.PI;
  let lon = (Math.atan2(p.z, -p.x) * 180) / Math.PI - 180;
  if (lon < -180) lon += 360;
  return [lat, lon];
}

// ── raster lookup: lat/lon → country index, built once on the client
let raster: { data: Uint8ClampedArray; W: number; H: number } | null = null;
function getRaster() {
  if (raster) return raster;
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const proj = d3
    .geoEquirectangular()
    .scale(W / (2 * Math.PI))
    .translate([W / 2, H / 2]);
  const path = d3.geoPath(proj, ctx);
  FC.features.forEach((f, i) => {
    const k = i + 1;
    ctx.fillStyle = `rgb(${k & 255},${(k >> 8) & 255},7)`;
    ctx.beginPath();
    path(f);
    ctx.fill();
  });
  raster = { data: ctx.getImageData(0, 0, W, H).data, W, H };
  return raster;
}

export function countryAt(lat: number, lon: number): number {
  const r = getRaster();
  const x = Math.min(r.W - 1, Math.max(0, Math.floor(((lon + 180) / 360) * r.W)));
  const y = Math.min(r.H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * r.H)));
  const o = (y * r.W + x) * 4;
  if (r.data[o + 3] !== 255 || r.data[o + 2] !== 7) return -1;
  return r.data[o] + r.data[o + 1] * 256 - 1;
}

const DOT_VERT = /* glsl */ `
uniform float uPixelRatio;
uniform float uScale;
attribute vec3 aColor;
attribute float aSize;
varying vec3 vColor;
varying float vFacing;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vec3 n = normalize(normalMatrix * normalize(position));
  vFacing = clamp(dot(n, normalize(-mv.xyz)), 0.0, 1.0);
  gl_PointSize = aSize * uPixelRatio * uScale / max(0.5, -mv.z);
  vColor = aColor;
}`;
const DOT_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vFacing;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.2, d);
  gl_FragColor = vec4(vColor * (0.35 + 0.65 * vFacing), a);
}`;

const ATMO_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const ATMO_FRAG = /* glsl */ `
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vV;
void main(){
  float f = pow(1.0 - abs(dot(vN, vV)), 5.0);
  gl_FragColor = vec4(uColor * f * 0.75, f * 0.6);
}`;

const ARC_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute vec3 aA;
attribute vec3 aB;
attribute float aOmega;
attribute float aH;
attribute float aSeed;
attribute float aSpeed;
varying float vT;
void main(){
  float t = fract(aSeed + uTime * aSpeed);
  vT = t;
  float so = sin(aOmega);
  vec3 dir = so < 1e-4 ? aA : (sin((1.0 - t) * aOmega) * aA + sin(t * aOmega) * aB) / so;
  vec3 p = normalize(dir) * (1.0 + aH * sin(3.14159265 * t));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uPixelRatio * 7.0 / max(0.5, -mv.z);
}`;
const ARC_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vT;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * sin(3.14159265 * vT);
  gl_FragColor = vec4(uColor * a * 1.6, a);
}`;

const RING_VERT = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
attribute float aPhase;
attribute float aTier;
varying float vP;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  vP = fract(uTime * 0.45 + aPhase);
  gl_PointSize = uPixelRatio * (10.0 + 34.0 * vP) * (1.35 - aTier * 0.18) / max(0.5, -mv.z);
}`;
const RING_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vP;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float ring = smoothstep(0.06, 0.0, abs(d - 0.42)) * (1.0 - vP);
  float core = smoothstep(0.12, 0.0, d) * 0.9;
  float a = ring + core;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * a * 1.5, a);
}`;

function metricColor(metric: MetricKey, v: number, out: THREE.Color) {
  const m = GEO_METRICS.find((x) => x.id === metric)!;
  const t = Math.max(0, Math.min(1, (v - m.domain[0]) / (m.domain[1] - m.domain[0])));
  const c = m.diverging ? d3.interpolateRgbBasis(["#ff3d64", "#3a4a63", "#22f5a0"])(t) : d3.interpolateRgbBasis(["#1b2b6b", "#3d7bff", "#35e7ff", "#ffd166", "#ff3d64"])(t);
  return out.set(c);
}

function Globe(props: GlobeProps & { accent: string; controls: MutableRefObject<OrbitControlsImpl | null>; registry: MutableRefObject<Map<string, { el: HTMLElement | null; pos: THREE.Vector3 }>> }) {
  const { layers, metric, selected, hovered, onHover, onSelect, accent, focus, controls, registry, selectedCenter } = props;
  const { gl, camera, size } = useThree();
  const pr = gl.getPixelRatio();

  // dots
  const dots = useMemo(() => {
    const N = 42000;
    const pos: number[] = [];
    const cidx: number[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
      const [lat, lon] = toLatLon(v);
      if (lat < -60) continue;
      const k = countryAt(lat, lon);
      if (k < 0) continue;
      pos.push(v.x * 1.001, v.y * 1.001, v.z * 1.001);
      cidx.push(k);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(new Float32Array(cidx.length * 3), 3));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(new Float32Array(cidx.length).fill(1), 1));
    return { g, cidx };
  }, []);
  const dotMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: pr }, uScale: { value: size.height * 0.0105 } },
        vertexShader: DOT_VERT,
        fragmentShader: DOT_FRAG,
        transparent: true,
        depthWrite: false,
      }),
    [pr, size.height],
  );

  useEffect(() => {
    const col = dots.g.getAttribute("aColor") as THREE.BufferAttribute;
    const sz = dots.g.getAttribute("aSize") as THREE.BufferAttribute;
    const base = new THREE.Color("#2a7d93");
    const dim = new THREE.Color("#18283a");
    const hi = new THREE.Color(accent);
    const c = new THREE.Color();
    const selI = selected ? COUNTRY_FEATURES.findIndex((f) => f.id === selected) : -1;
    const hovI = hovered ? COUNTRY_FEATURES.findIndex((f) => f.id === hovered) : -1;
    dots.cidx.forEach((k, i) => {
      const id = COUNTRY_FEATURES[k]?.id;
      const ref = COUNTRIES[id];
      if (metric !== "none") {
        if (ref) metricColor(metric, GEO_METRICS.find((m) => m.id === metric)!.get(ref), c);
        else c.copy(dim);
      } else c.copy(ref ? base : dim);
      let s = 1;
      if (k === selI) {
        c.lerp(hi, metric === "none" ? 0.85 : 0.35).multiplyScalar(1.5);
        s = 1.35;
      } else if (k === hovI) {
        c.lerp(hi, 0.5).multiplyScalar(1.25);
        s = 1.2;
      }
      col.setXYZ(i, c.r, c.g, c.b);
      sz.setX(i, s);
    });
    col.needsUpdate = true;
    sz.needsUpdate = true;
  }, [dots, metric, selected, hovered, accent]);

  // borders & coasts
  const lines = useMemo(() => {
    const toGeo = (ml: MultiLineString, r: number) => {
      const pts: number[] = [];
      for (const line of ml.coordinates)
        for (let i = 1; i < line.length; i++) {
          const a = latLon(line[i - 1][1], line[i - 1][0], r);
          const b = latLon(line[i][1], line[i][0], r);
          pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
      return g;
    };
    const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b) as unknown as MultiLineString;
    const coast = mesh(topo, topo.objects.countries, (a, b) => a === b) as unknown as MultiLineString;
    return { borders: toGeo(borders, 1.0015), coast: toGeo(coast, 1.0015) };
  }, []);

  const selBorder = useMemo(() => {
    if (!selected) return null;
    const f = FC.features.find((x) => String(x.id) === selected);
    if (!f) return null;
    const ml = mesh(topo, { type: "GeometryCollection", geometries: [topo.objects.countries.geometries.find((g) => String(g.id) === selected)!] } as never) as unknown as MultiLineString;
    const pts: number[] = [];
    for (const line of ml.coordinates)
      for (let i = 1; i < line.length; i++) {
        const a = latLon(line[i - 1][1], line[i - 1][0], 1.004);
        const b = latLon(line[i][1], line[i][0], 1.004);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [selected]);

  // atmosphere
  const atmoMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color(accent) } },
        vertexShader: ATMO_VERT,
        fragmentShader: ATMO_FRAG,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [accent],
  );

  // trade arcs
  const arcs = useMemo(() => {
    const maxV = Math.max(...ROUTES.map((r) => r.v));
    const linePts: number[] = [];
    const lineCol: number[] = [];
    const pA: number[] = [];
    const pB: number[] = [];
    const pO: number[] = [];
    const pH: number[] = [];
    const pS: number[] = [];
    const pSp: number[] = [];
    let s = 3;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const col = new THREE.Color("#ff9f43");
    for (const r of ROUTES) {
      const A = latLon(r.a[0], r.a[1]).normalize();
      const B = latLon(r.b[0], r.b[1]).normalize();
      const om = A.angleTo(B);
      const h = 0.06 + 0.32 * (om / Math.PI);
      const seg = 64;
      let prev: THREE.Vector3 | null = null;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const dir = om < 1e-4 ? A.clone() : A.clone().multiplyScalar(Math.sin((1 - t) * om) / Math.sin(om)).add(B.clone().multiplyScalar(Math.sin(t * om) / Math.sin(om)));
        const p = dir.normalize().multiplyScalar(1 + h * Math.sin(Math.PI * t));
        if (prev) {
          linePts.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const k = 0.12 + 0.28 * (r.v / maxV);
          lineCol.push(col.r * k, col.g * k, col.b * k, col.r * k, col.g * k, col.b * k);
        }
        prev = p;
      }
      const n = Math.max(2, Math.round((r.v / maxV) * 26));
      for (let k = 0; k < n; k++) {
        pA.push(A.x, A.y, A.z);
        pB.push(B.x, B.y, B.z);
        pO.push(om);
        pH.push(h);
        pS.push(rnd());
        pSp.push((0.12 + rnd() * 0.1) / Math.max(0.4, om));
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(linePts, 3));
    lg.setAttribute("color", new THREE.Float32BufferAttribute(lineCol, 3));
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(pS.length * 3), 3));
    pg.setAttribute("aA", new THREE.Float32BufferAttribute(pA, 3));
    pg.setAttribute("aB", new THREE.Float32BufferAttribute(pB, 3));
    pg.setAttribute("aOmega", new THREE.Float32BufferAttribute(pO, 1));
    pg.setAttribute("aH", new THREE.Float32BufferAttribute(pH, 1));
    pg.setAttribute("aSeed", new THREE.Float32BufferAttribute(pS, 1));
    pg.setAttribute("aSpeed", new THREE.Float32BufferAttribute(pSp, 1));
    return { lg, pg };
  }, []);
  const arcMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pr }, uColor: { value: new THREE.Color("#ffb547") } },
        vertexShader: ARC_VERT,
        fragmentShader: ARC_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [pr],
  );

  // centers: beams + pulse rings
  const centers = useMemo(() => {
    const beam: number[] = [];
    const ring: number[] = [];
    const phase: number[] = [];
    const tier: number[] = [];
    CENTERS.forEach((c, i) => {
      const p = latLon(c.lat, c.lon, 1.002);
      const h = c.tier === 1 ? 0.16 : c.tier === 2 ? 0.1 : 0.06;
      const q = latLon(c.lat, c.lon, 1.002 + h);
      beam.push(p.x, p.y, p.z, q.x, q.y, q.z);
      ring.push(p.x, p.y, p.z);
      phase.push((i * 0.137) % 1);
      tier.push(c.tier);
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute("position", new THREE.Float32BufferAttribute(beam, 3));
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.Float32BufferAttribute(ring, 3));
    rg.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    rg.setAttribute("aTier", new THREE.Float32BufferAttribute(tier, 1));
    return { bg, rg };
  }, []);
  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPixelRatio: { value: pr }, uColor: { value: new THREE.Color(accent) } },
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [pr, accent],
  );

  // commodity producers
  const prod = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const sz: number[] = [];
    const c = new THREE.Color();
    for (const p of PRODUCERS) {
      const v = latLon(p.lat, p.lon, 1.006);
      pos.push(v.x, v.y, v.z);
      c.set(COMMODITY_COLORS[p.commodity]);
      col.push(c.r, c.g, c.b);
      sz.push(3 + p.share * 16);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(sz, 1));
    return g;
  }, []);
  const prodMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: pr }, uScale: { value: size.height * 0.0105 } },
        vertexShader: DOT_VERT,
        fragmentShader: /* glsl */ `
          varying vec3 vColor; varying float vFacing;
          void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5,0.0,d); float ring = smoothstep(0.05,0.0,abs(d-0.38));
          if (a + ring < 0.02) discard; gl_FragColor = vec4(vColor * (pow(a,2.0)*1.6 + ring), (pow(a,2.0) + ring) * vFacing); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [pr, size.height],
  );

  // fly-to
  const fly = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  useEffect(() => {
    if (!focus) return;
    const dist = camera.position.length();
    fly.current = { from: camera.position.clone().normalize(), to: latLon(focus.lat, focus.lon).normalize(), t: 0 };
    void dist;
  }, [focus, camera]);

  const v3 = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    arcMat.uniforms.uTime.value = t;
    ringMat.uniforms.uTime.value = t;
    if (fly.current) {
      const f = fly.current;
      f.t = Math.min(1, f.t + dt / 1.6);
      const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - (-2 * f.t + 2) ** 3 / 2;
      const dist = camera.position.length();
      const target = Math.max(2.4, Math.min(dist, 3.4));
      const om = f.from.angleTo(f.to);
      const dir = om < 1e-4 ? f.to.clone() : f.from.clone().multiplyScalar(Math.sin((1 - e) * om) / Math.sin(om)).add(f.to.clone().multiplyScalar(Math.sin(e * om) / Math.sin(om)));
      camera.position.copy(dir.normalize().multiplyScalar(dist + (target - dist) * e));
      controls.current?.update();
      if (f.t >= 1) fly.current = null;
    }
    // project labels
    const camDir = v3.copy(camera.position).normalize();
    for (const [, entry] of registry.current) {
      const el = entry.el;
      if (!el) continue;
      const facing = entry.pos.clone().normalize().dot(camDir);
      if (facing < 0.18) {
        el.style.visibility = "hidden";
        continue;
      }
      const p = entry.pos.clone().project(camera);
      el.style.visibility = "visible";
      el.style.opacity = String(Math.min(1, (facing - 0.18) * 3));
      el.style.transform = `translate3d(${((p.x * 0.5 + 0.5) * size.width).toFixed(1)}px, ${((-p.y * 0.5 + 0.5) * size.height).toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  });

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const [lat, lon] = toLatLon(e.point);
    const k = countryAt(lat, lon);
    const id = k >= 0 ? COUNTRY_FEATURES[k].id : null;
    if (id !== hovered) onHover(id);
    document.body.style.cursor = id ? "pointer" : "";
  };

  return (
    <group>
      <mesh onPointerMove={onMove} onPointerOut={() => onHover(null)} onClick={(e) => {
        e.stopPropagation();
        const [lat, lon] = toLatLon(e.point);
        const k = countryAt(lat, lon);
        onSelect(k >= 0 ? COUNTRY_FEATURES[k].id : null);
      }}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshBasicMaterial color="#020710" />
      </mesh>
      <mesh scale={1.1} material={atmoMat}>
        <sphereGeometry args={[1, 64, 64]} />
      </mesh>
      <points geometry={dots.g} material={dotMat} />
      {layers.borders && (
        <>
          <lineSegments geometry={lines.coast}>
            <lineBasicMaterial color={accent} transparent opacity={0.28} depthWrite={false} />
          </lineSegments>
          <lineSegments geometry={lines.borders}>
            <lineBasicMaterial color={accent} transparent opacity={0.12} depthWrite={false} />
          </lineSegments>
        </>
      )}
      {selBorder && (
        <lineSegments geometry={selBorder}>
          <lineBasicMaterial color="#ffffff" toneMapped={false} />
        </lineSegments>
      )}
      {layers.routes && (
        <>
          <lineSegments geometry={arcs.lg}>
            <lineBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </lineSegments>
          <points geometry={arcs.pg} material={arcMat} frustumCulled={false} />
        </>
      )}
      {layers.centers && (
        <>
          <lineSegments geometry={centers.bg}>
            <lineBasicMaterial color={accent} toneMapped={false} />
          </lineSegments>
          <points geometry={centers.rg} material={ringMat} frustumCulled={false} />
        </>
      )}
      {layers.commodities && <points geometry={prod} material={prodMat} />}
      {selectedCenter && (() => {
        const c = CENTERS.find((x) => x.id === selectedCenter);
        if (!c) return null;
        const p = latLon(c.lat, c.lon, 1.003);
        return (
          <mesh position={p} onClick={() => props.onCenter(c.id)}>
            <sphereGeometry args={[0.012, 12, 12]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        );
      })()}
    </group>
  );
}

export default function GlobeScene(props: GlobeProps) {
  const bloom = useSettings((s) => s.bloom);
  const theme = useSettings((s) => s.theme);
  const accent = { spectral: "#35e7ff", magenta: "#ff2e88", phosphor: "#39ff6a", arctic: "#9fd4ff" }[theme];
  const controls = useRef<OrbitControlsImpl | null>(null);
  const registry = useRef<Map<string, { el: HTMLElement | null; pos: THREE.Vector3 }>>(new Map());
  const reg = (key: string, pos: THREE.Vector3) => (el: HTMLElement | null) => {
    if (el) registry.current.set(key, { el, pos });
    else registry.current.delete(key);
  };
  const hold = !!props.hovered;
  return (
    <div className="absolute inset-0 overflow-hidden">
      <Canvas flat dpr={[1, 1.75]} camera={{ position: latLon(28, -40, 4.1).toArray(), fov: 38, near: 0.05, far: 100 }} gl={{ antialias: true, alpha: true }} onPointerMissed={() => props.onSelect(null)}>
        <Globe {...props} accent={accent} controls={controls} registry={registry} />
        <OrbitControls ref={controls as never} enablePan={false} enableDamping dampingFactor={0.07} minDistance={1.45} maxDistance={6} rotateSpeed={0.5} zoomSpeed={0.7} autoRotate={!hold} autoRotateSpeed={0.35} />
        {bloom && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.18} radius={0.65} />
          </EffectComposer>
        )}
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        {props.layers.centers &&
          CENTERS.filter((c) => c.tier <= 2 || c.id === props.selectedCenter).map((c) => (
            <div
              key={c.id}
              ref={reg("c:" + c.id, latLon(c.lat, c.lon, 1.002 + (c.tier === 1 ? 0.17 : 0.11)))}
              className="absolute left-0 top-0 whitespace-nowrap font-mono text-[8.5px] tracking-[0.14em]"
              style={{ visibility: "hidden", color: c.id === props.selectedCenter ? "#fff" : accent, textShadow: "0 0 6px #000, 0 0 2px #000" }}
            >
              {c.kind.includes("cb") && !c.kind.includes("center") ? "◆ " : ""}
              {c.name.toUpperCase()}
            </div>
          ))}
      </div>
    </div>
  );
}
