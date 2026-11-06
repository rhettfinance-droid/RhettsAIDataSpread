"use client";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CENTRALITY,
  EDGES,
  EDGE_TYPE_MAP,
  NODES,
  NODE_TYPE_MAP,
  propagateShock,
  type EdgeType,
  type NodeType,
} from "@/lib/data/network";
import { computeLayout, GEO_R, ORBIT, STRATA_Y, type LayoutMode } from "./layouts";
import { useSettings } from "@/lib/store/settings";
import { useMarket } from "@/lib/store/market";

export type ColorMode = "type" | "performance";

export type NetworkSceneProps = {
  mode: LayoutMode;
  colorMode: ColorMode;
  nodeTypes: Set<NodeType>;
  edgeTypes: Set<EdgeType>;
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  shock: { source: string; t0: number } | null;
  isolate?: boolean;
  compact?: boolean;
  autoRotate?: boolean;
};

const N = NODES.length;
const SEG = 14;
const INDEX: Record<string, number> = Object.fromEntries(NODES.map((n, i) => [n.id, i]));
const NODE_SIZE = NODES.map((n) => {
  const s = 0.55 + Math.max(0, Math.log10(Math.max(n.value, 10)) - 1.5) * 0.62;
  return n.type === "region" ? s * 1.25 : s;
});

const ADJ: Set<number>[] = (() => {
  const a = NODES.map(() => new Set<number>());
  for (const e of EDGES) {
    a[INDEX[e.s]].add(INDEX[e.t]);
    a[INDEX[e.t]].add(INDEX[e.s]);
  }
  return a;
})();

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute vec3 aStart;
attribute vec3 aCtrl;
attribute vec3 aEnd;
attribute float aSeed;
attribute float aSpeed;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float t = fract(aSeed + uTime * aSpeed);
  vec3 p = mix(mix(aStart, aCtrl, t), mix(aCtrl, aEnd, t), t);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float fade = smoothstep(0.0, 0.1, t) * smoothstep(1.0, 0.82, t);
  gl_PointSize = uSize * uPixelRatio * (0.5 + 0.9 * fade) * (90.0 / max(1.0, -mv.z));
  vColor = aColor;
  vAlpha = aAlpha * fade;
}`;

const PARTICLE_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float a = pow(smoothstep(0.5, 0.0, d), 1.8);
  if (a * vAlpha < 0.01) discard;
  gl_FragColor = vec4(vColor * a * vAlpha * 1.4, a * vAlpha);
}`;

const HALO_VERT = /* glsl */ `
uniform float uPixelRatio;
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio * (260.0 / max(1.0, -mv.z));
  vColor = aColor;
}`;

const HALO_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float core = smoothstep(0.5, 0.0, d);
  float ring = smoothstep(0.03, 0.0, abs(d - 0.36)) * 0.35;
  float a = pow(core, 2.6) * 0.55 + ring;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, a);
}`;

const STAR_VERT = /* glsl */ `
uniform float uPixelRatio;
attribute float aSize;
varying float vA;
void main(){
  vec4 mv = modelViewMatrix * vec4(position,1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uPixelRatio;
  vA = aSize / 2.2;
}`;
const STAR_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * 0.5 * vA;
  gl_FragColor = vec4(uColor * a, a);
}`;

function bezierCtrl(ax: number, ay: number, az: number, bx: number, by: number, bz: number, out: number[]) {
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const mz = (az + bz) / 2;
  const len = Math.hypot(bx - ax, by - ay, bz - az);
  let ml = Math.hypot(mx, my, mz);
  let nx = mx;
  let ny = my;
  let nz = mz;
  if (ml < 1e-3) {
    nx = 0;
    ny = 1;
    nz = 0;
    ml = 1;
  }
  const k = (len * 0.2) / ml;
  out[0] = mx + nx * k;
  out[1] = my + ny * k;
  out[2] = mz + nz * k;
}

const tmpColor = new THREE.Color();
const tmpColor2 = new THREE.Color();
const SHOCK_HOT = new THREE.Color("#ff2d55");
const SHOCK_WARM = new THREE.Color("#ffb547");
const POS_C = new THREE.Color("#22f5a0");
const NEG_C = new THREE.Color("#ff3d64");
const NEUTRAL_C = new THREE.Color("#5b6678");

const TYPE_COLORS = NODES.map((n) => new THREE.Color(NODE_TYPE_MAP[n.type].color));
const EDGE_COLORS: Record<EdgeType, THREE.Color> = Object.fromEntries(
  Object.entries(EDGE_TYPE_MAP).map(([k, v]) => [k, new THREE.Color(v.color)]),
) as Record<EdgeType, THREE.Color>;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function Graph(props: NetworkSceneProps & { controls: MutableRefObject<OrbitControlsImpl | null>; posRef: MutableRefObject<Float32Array | null>; visRef: MutableRefObject<Uint8Array | null> }) {
  const { mode, colorMode, nodeTypes, edgeTypes, selected, hovered, onSelect, onHover, shock, isolate, compact, controls, posRef, visRef } = props;
  const density = useSettings((s) => s.particles);
  const quotes = useMarket((s) => (colorMode === "performance" ? s.quotes : null));
  const { gl } = useThree();
  const pr = gl.getPixelRatio();

  // ── layout state
  const target = useMemo(() => computeLayout(mode), [mode]);
  const cur = useRef<Float32Array>(new Float32Array(target));
  posRef.current = cur.current;
  const from = useRef<Float32Array>(new Float32Array(target));
  const trans = useRef<{ t0: number; active: boolean }>({ t0: 0, active: false });
  const firstMode = useRef(true);
  useEffect(() => {
    if (firstMode.current) {
      firstMode.current = false;
      return;
    }
    from.current = new Float32Array(cur.current);
    trans.current = { t0: -1, active: true };
  }, [target]);

  // ── visibility
  const visibleNodes = useMemo(() => {
    const v = new Uint8Array(N);
    const sel = selected ? INDEX[selected] : -1;
    NODES.forEach((n, i) => {
      let on = nodeTypes.has(n.type);
      if (isolate && sel >= 0) on = on && (i === sel || ADJ[sel].has(i));
      v[i] = on ? 1 : 0;
    });
    return v;
  }, [nodeTypes, isolate, selected]);
  visRef.current = visibleNodes;

  const visibleEdges = useMemo(
    () => EDGES.map((e) => edgeTypes.has(e.type) && visibleNodes[INDEX[e.s]] === 1 && visibleNodes[INDEX[e.t]] === 1),
    [edgeTypes, visibleNodes],
  );

  const shockData = useMemo(() => (shock ? propagateShock(shock.source) : null), [shock]);

  // ── geometries
  const nodeMesh = useRef<THREE.InstancedMesh>(null);
  const pickMesh = useRef<THREE.InstancedMesh>(null);
  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  const edgeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(EDGES.length * SEG * 2 * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(EDGES.length * SEG * 2 * 3), 3));
    return g;
  }, []);

  const particles = useMemo(() => {
    const list: { e: number; seed: number; speed: number; rev: boolean }[] = [];
    let s = 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    EDGES.forEach((e, ei) => {
      const count = Math.max(1, Math.round((1.5 + e.w * 7) * density));
      for (let k = 0; k < count; k++) {
        list.push({
          e: ei,
          seed: rnd(),
          speed: (0.05 + rnd() * 0.07) * (e.type === "correlation" ? 0.7 : 1),
          rev: e.type === "correlation" ? k % 2 === 1 : false,
        });
      }
    });
    const P = list.length;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    g.setAttribute("aCtrl", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    g.setAttribute("aEnd", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(Float32Array.from(list.map((p) => p.seed)), 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(Float32Array.from(list.map((p) => p.speed)), 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(P * 3), 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(P), 1));
    return { list, g };
  }, [density]);

  const particleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSize: { value: compact ? 2.2 : 2.6 }, uPixelRatio: { value: pr } },
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [pr, compact],
  );
  const haloMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: pr } },
        vertexShader: HALO_VERT,
        fragmentShader: HALO_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [pr],
  );

  const dirty = useRef(true);
  useEffect(() => {
    dirty.current = true;
  }, [visibleNodes, visibleEdges, selected, hovered, colorMode, quotes, shockData, particles]);

  const ctrl = useMemo(() => [0, 0, 0], []);
  const shockStart = useRef<{ key: number; t: number }>({ key: -1, t: 0 });
  const focusTarget = useRef(new THREE.Vector3());
  const mat4 = useMemo(() => new THREE.Matrix4(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const scl = useMemo(() => new THREE.Vector3(), []);
  const posV = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    particleMat.uniforms.uTime.value = t;

    // layout transition
    let moved = false;
    if (trans.current.active) {
      if (trans.current.t0 < 0) trans.current.t0 = t;
      const p = Math.min(1, (t - trans.current.t0) / 1.5);
      const e = easeInOut(p);
      const burst = 1 + 0.22 * Math.sin(Math.PI * p);
      const c = cur.current;
      const f = from.current;
      for (let i = 0; i < c.length; i++) c[i] = (f[i] + (target[i] - f[i]) * e) * burst;
      if (p >= 1) trans.current.active = false;
      moved = true;
    }

    const shockActive = !!shock && !!shockData;
    // shock clock starts on the first frame after a shock is triggered
    if (shockActive && shockStart.current.key !== shock!.t0) shockStart.current = { key: shock!.t0, t };
    const se = shockActive ? t - shockStart.current.t : 0;

    if (!moved && !dirty.current && !shockActive) {
      // only camera focus easing
      easeFocus(dt);
      return;
    }
    dirty.current = false;

    const c = cur.current;
    const selI = selected ? INDEX[selected] : -1;
    const hovI = hovered ? INDEX[hovered] : -1;
    const focusI = hovI >= 0 ? hovI : selI;

    // shock activation per node
    const act = new Float32Array(N);
    if (shockActive) {
      for (const [id, imp] of Object.entries(shockData!.impact)) {
        const i = INDEX[id];
        const h = shockData!.hop[id] ?? 0;
        act[i] = Math.max(0, Math.min(1, (se - h * 0.6) / 0.5)) * imp;
      }
    }

    // nodes
    const hp = haloGeo.getAttribute("position") as THREE.BufferAttribute;
    const hs = haloGeo.getAttribute("aSize") as THREE.BufferAttribute;
    const hc = haloGeo.getAttribute("aColor") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const vis = visibleNodes[i] === 1;
      let base = TYPE_COLORS[i];
      if (colorMode === "performance") {
        const sym = NODES[i].sym;
        const q = sym && quotes ? quotes[sym] : undefined;
        if (q) {
          const k = Math.min(1, Math.abs(q.changePct) / 0.02);
          base = tmpColor2.copy(NEUTRAL_C).lerp(q.changePct >= 0 ? POS_C : NEG_C, 0.35 + 0.65 * k);
        } else base = NEUTRAL_C;
      }
      tmpColor.copy(base);
      let size = NODE_SIZE[i];
      let dim = 1;
      if (focusI >= 0 && !shockActive) {
        const linked = i === focusI || ADJ[focusI].has(i);
        dim = linked ? 1 : 0.18;
        if (i === focusI) size *= 1.35;
      }
      if (shockActive) {
        const a = act[i];
        if (a > 0) {
          const hot = tmpColor2.copy(SHOCK_WARM).lerp(SHOCK_HOT, Math.min(1, a * 1.4));
          tmpColor.lerp(hot, Math.min(1, 0.35 + a));
          const pulse = 1 + 0.25 * Math.sin(t * 6 + i) * a;
          size *= 1 + a * 0.7 * pulse;
        } else dim = 0.22;
      }
      tmpColor.multiplyScalar(dim);
      const s = vis ? size * 0.5 : 0;
      posV.set(c[i * 3], c[i * 3 + 1], c[i * 3 + 2]);
      scl.set(s, s, s);
      mat4.compose(posV, quat, scl);
      nodeMesh.current?.setMatrixAt(i, mat4);
      nodeMesh.current?.setColorAt(i, tmpColor);
      const ps = vis ? Math.max(s * 1.8, 2.4) : 0;
      scl.set(ps, ps, ps);
      mat4.compose(posV, quat, scl);
      pickMesh.current?.setMatrixAt(i, mat4);
      hp.setXYZ(i, c[i * 3], c[i * 3 + 1], c[i * 3 + 2]);
      let halo = vis ? size * 1.25 * (0.7 + CENTRALITY[NODES[i].id] * 0.8) : 0;
      if (shockActive && act[i] > 0) {
        const since = se - (shockData!.hop[NODES[i].id] ?? 0) * 0.6;
        const ripple = since > 0 && since < 1.4 ? Math.sin((since / 1.4) * Math.PI) : 0;
        halo *= 1 + ripple * 2.2 + act[i];
      }
      if (i === selI) halo *= 1.6;
      hs.setX(i, halo);
      hc.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
    }
    if (nodeMesh.current) {
      nodeMesh.current.instanceMatrix.needsUpdate = true;
      if (nodeMesh.current.instanceColor) nodeMesh.current.instanceColor.needsUpdate = true;
    }
    if (pickMesh.current) {
      pickMesh.current.instanceMatrix.needsUpdate = true;
      pickMesh.current.computeBoundingSphere();
    }
    hp.needsUpdate = true;
    hs.needsUpdate = true;
    hc.needsUpdate = true;

    // edges
    const ep = edgeGeo.getAttribute("position") as THREE.BufferAttribute;
    const ec = edgeGeo.getAttribute("color") as THREE.BufferAttribute;
    const epa = ep.array as Float32Array;
    const eca = ec.array as Float32Array;
    const ctrlCache = new Float32Array(EDGES.length * 3);
    EDGES.forEach((e, ei) => {
      const a = INDEX[e.s];
      const b = INDEX[e.t];
      const ax = c[a * 3];
      const ay = c[a * 3 + 1];
      const az = c[a * 3 + 2];
      const bx = c[b * 3];
      const by = c[b * 3 + 1];
      const bz = c[b * 3 + 2];
      bezierCtrl(ax, ay, az, bx, by, bz, ctrl);
      ctrlCache[ei * 3] = ctrl[0];
      ctrlCache[ei * 3 + 1] = ctrl[1];
      ctrlCache[ei * 3 + 2] = ctrl[2];
      const vis = visibleEdges[ei];
      let intensity = vis ? 0.16 + e.w * 0.3 : 0;
      let col = EDGE_COLORS[e.type];
      if (vis && focusI >= 0 && !shockActive) intensity = a === focusI || b === focusI ? 0.85 : 0.025;
      if (vis && shockActive) {
        const s2 = Math.min(act[a], act[b]);
        if (s2 > 0) {
          col = SHOCK_HOT;
          intensity = 0.25 + s2 * 0.9;
        } else intensity = 0.03;
      }
      let o = ei * SEG * 6;
      for (let k = 0; k < SEG; k++) {
        for (let q = 0; q < 2; q++) {
          const tt = (k + q) / SEG;
          const u = 1 - tt;
          epa[o] = u * u * ax + 2 * u * tt * ctrl[0] + tt * tt * bx;
          epa[o + 1] = u * u * ay + 2 * u * tt * ctrl[1] + tt * tt * by;
          epa[o + 2] = u * u * az + 2 * u * tt * ctrl[2] + tt * tt * bz;
          const grad = intensity * (0.3 + 0.7 * tt);
          eca[o] = col.r * grad;
          eca[o + 1] = col.g * grad;
          eca[o + 2] = col.b * grad;
          o += 3;
        }
      }
    });
    ep.needsUpdate = true;
    ec.needsUpdate = true;

    // particles
    const g = particles.g;
    const as = g.getAttribute("aStart") as THREE.BufferAttribute;
    const ac = g.getAttribute("aCtrl") as THREE.BufferAttribute;
    const ae = g.getAttribute("aEnd") as THREE.BufferAttribute;
    const acol = g.getAttribute("aColor") as THREE.BufferAttribute;
    const aal = g.getAttribute("aAlpha") as THREE.BufferAttribute;
    particles.list.forEach((p, pi) => {
      const e = EDGES[p.e];
      const a = INDEX[p.rev ? e.t : e.s];
      const b = INDEX[p.rev ? e.s : e.t];
      as.setXYZ(pi, c[a * 3], c[a * 3 + 1], c[a * 3 + 2]);
      ac.setXYZ(pi, ctrlCache[p.e * 3], ctrlCache[p.e * 3 + 1], ctrlCache[p.e * 3 + 2]);
      ae.setXYZ(pi, c[b * 3], c[b * 3 + 1], c[b * 3 + 2]);
      const vis = visibleEdges[p.e];
      let alpha = vis ? 0.55 + e.w * 0.45 : 0;
      let col = EDGE_COLORS[e.type];
      const ia = INDEX[e.s];
      const ib = INDEX[e.t];
      if (vis && focusI >= 0 && !shockActive) alpha = ia === focusI || ib === focusI ? 1.2 : 0.05;
      if (vis && shockActive) {
        const s2 = Math.min(act[ia], act[ib]);
        if (s2 > 0) {
          col = SHOCK_HOT;
          alpha = 0.6 + s2;
        } else alpha = 0.04;
      }
      acol.setXYZ(pi, col.r, col.g, col.b);
      aal.setX(pi, alpha);
    });
    as.needsUpdate = true;
    ac.needsUpdate = true;
    ae.needsUpdate = true;
    acol.needsUpdate = true;
    aal.needsUpdate = true;

    easeFocus(dt);
  });

  function easeFocus(dt: number) {
    const ctl = controls.current;
    if (!ctl) return;
    const selI = selected ? INDEX[selected] : -1;
    if (selI >= 0) focusTarget.current.set(cur.current[selI * 3], cur.current[selI * 3 + 1], cur.current[selI * 3 + 2]).multiplyScalar(0.6);
    else focusTarget.current.set(0, 0, 0);
    ctl.target.lerp(focusTarget.current, Math.min(1, dt * 2.5));
  }

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const id = e.instanceId !== undefined ? NODES[e.instanceId]?.id : null;
    if (id && visibleNodes[e.instanceId!] === 1) {
      if (id !== hovered) onHover(id);
      document.body.style.cursor = "pointer";
    }
  };
  const onOut = () => {
    onHover(null);
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined && visibleNodes[e.instanceId] === 1) onSelect(NODES[e.instanceId].id);
  };

  return (
    <group>
      <lineSegments geometry={edgeGeo} frustumCulled={false}>
        <lineBasicMaterial vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </lineSegments>
      <points geometry={particles.g} material={particleMat} frustumCulled={false} />
      <points geometry={haloGeo} material={haloMat} frustumCulled={false} />
      <instancedMesh ref={nodeMesh} args={[undefined, undefined, N]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pickMesh} args={[undefined, undefined, N]} onPointerMove={onMove} onPointerOut={onOut} onClick={onClick}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
      </instancedMesh>
    </group>
  );
}

function Starfield({ count = 1600 }: { count?: number }) {
  const { gl } = useThree();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < count; i++) {
      const r = 140 + rnd() * 260;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      p[i * 3] = r * Math.sin(ph) * Math.cos(th);
      p[i * 3 + 1] = r * Math.cos(ph);
      p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      s[i] = 0.6 + rnd() * 1.6;
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(s, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uPixelRatio: { value: gl.getPixelRatio() }, uColor: { value: new THREE.Color("#8fb4ff") } },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [gl],
  );
  const ref = useRef<THREE.Points>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.004;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}

function ringPoints(r: number, ax = 0, az = 0, y = 0, n = 160): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const e = new THREE.Euler(ax, 0, az, "XZY");
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).applyEuler(e));
  }
  return pts;
}

function GuideLine({ points, color, opacity }: { points: THREE.Vector3[]; color: string; opacity: number }) {
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </line>
  );
}

const STRATA_LABELS: [string, number][] = [
  ["POLICY · CENTRAL BANKS", STRATA_Y.central_bank],
  ["CURRENCIES", STRATA_Y.currency],
  ["SOVEREIGN & CREDIT", STRATA_Y.bond],
  ["BANKING SYSTEM", STRATA_Y.bank],
  ["MARKETS · CAPITAL ALLOCATORS", STRATA_Y.exchange],
  ["CORPORATES", STRATA_Y.corporate],
  ["COMMODITIES", STRATA_Y.commodity],
  ["REAL ECONOMY · REGIONS", STRATA_Y.region],
];

function Guides({ mode, accent }: { mode: LayoutMode; accent: string }) {
  const rings = useMemo(() => {
    if (mode === "orbital") return Object.values(ORBIT).map((o) => ringPoints(o.r, o.tiltX, o.tiltZ));
    if (mode === "strata") return STRATA_LABELS.map(([, y]) => ringPoints(56, 0, 0, y, 200));
    if (mode === "geo") {
      const out: THREE.Vector3[][] = [];
      for (let lat = -60; lat <= 60; lat += 30) {
        const r = GEO_R * Math.cos((lat * Math.PI) / 180) * 0.995;
        out.push(ringPoints(r, 0, 0, GEO_R * Math.sin((lat * Math.PI) / 180) * 0.995, 120));
      }
      for (let lon = 0; lon < 180; lon += 30) {
        const e = new THREE.Euler(0, (lon * Math.PI) / 180, Math.PI / 2);
        out.push(ringPoints(GEO_R * 0.995, 0, 0, 0, 160).map((p) => p.applyEuler(e)));
      }
      return out;
    }
    return [];
  }, [mode]);
  return (
    <group>
      {rings.map((r, i) => (
        <GuideLine key={mode + i} points={r} color={accent} opacity={mode === "geo" ? 0.1 : 0.13} />
      ))}
      {mode === "geo" && (
        <mesh>
          <sphereGeometry args={[GEO_R * 0.97, 48, 48]} />
          <meshBasicMaterial color="#03060d" transparent opacity={0.82} />
        </mesh>
      )}
    </group>
  );
}

type ProjEntry = { el: HTMLElement | null; pos: () => [number, number, number] | null };

/** Projects registered 3D anchor points to screen space each frame and moves plain DOM labels (no extra React roots). */
function Projector({ registry }: { registry: MutableRefObject<Map<string, ProjEntry>> }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    for (const entry of registry.current.values()) {
      const el = entry.el;
      if (!el) continue;
      const p = entry.pos();
      if (!p) {
        el.style.visibility = "hidden";
        continue;
      }
      v.set(p[0], p[1], p[2]).project(camera);
      if (v.z > 1 || v.z < -1) {
        el.style.visibility = "hidden";
        continue;
      }
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.visibility = "visible";
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      el.style.opacity = String(Math.max(0.25, Math.min(1, 1.6 - (v.z * 0.5 + 0.5) * 1.1)) * Number(el.dataset.alpha ?? 1));
    }
  });
  return null;
}

function AutoRotate({ controls, enabled, hold }: { controls: MutableRefObject<OrbitControlsImpl | null>; enabled: boolean; hold: boolean }) {
  useFrame(() => {
    if (controls.current) {
      controls.current.autoRotate = enabled && !hold;
      controls.current.update();
    }
  });
  return null;
}

export default function NetworkScene(props: NetworkSceneProps) {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const bloom = useSettings((s) => s.bloom);
  const accent = useSettings((s) => s.theme);
  const accentHex = { spectral: "#35e7ff", magenta: "#ff2e88", phosphor: "#39ff6a", arctic: "#9fd4ff" }[accent];
  const down = useRef<[number, number]>([0, 0]);
  const posRef = useRef<Float32Array | null>(null);
  const visRef = useRef<Uint8Array | null>(null);
  const registry = useRef<Map<string, ProjEntry>>(new Map());
  const { selected, hovered, shock, compact, mode } = props;

  const shockData = useMemo(() => (shock ? propagateShock(shock.source) : null), [shock]);
  const labelIdx = useMemo(() => {
    const pri = NODES.map((n, i) => ({ i, c: CENTRALITY[n.id] + (n.type === "region" ? 1 : n.type === "central_bank" ? 0.6 : 0) })).sort((a, b) => b.c - a.c);
    const set = new Set(pri.slice(0, compact ? 12 : 28).map((p) => p.i));
    if (selected) set.add(INDEX[selected]);
    if (hovered) set.add(INDEX[hovered]);
    if (selected && !compact) ADJ[INDEX[selected]].forEach((i) => set.add(i));
    if (shockData)
      Object.entries(shockData.impact)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([id]) => set.add(INDEX[id]));
    return [...set];
  }, [compact, selected, hovered, shockData]);

  const register = (key: string, pos: ProjEntry["pos"]) => (el: HTMLElement | null) => {
    if (el) registry.current.set(key, { el, pos });
    else registry.current.delete(key);
  };

  return (
    <div className="absolute inset-0 overflow-hidden" onPointerDown={(e) => (down.current = [e.clientX, e.clientY])}>
      <Canvas
        flat
        dpr={[1, 1.75]}
        camera={{ position: compact ? [0, 38, 150] : [0, 46, 170], fov: 42, near: 0.5, far: 2000 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onPointerMissed={(e) => {
          if (Math.hypot(e.clientX - down.current[0], e.clientY - down.current[1]) < 5) props.onSelect(null);
        }}
      >
        <fog attach="fog" args={["#020306", 180, 420]} />
        <Starfield count={compact ? 900 : 1600} />
        <Guides mode={mode} accent={accentHex} />
        <Graph {...props} controls={controls} posRef={posRef} visRef={visRef} />
        <Projector registry={registry} />
        <OrbitControls
          ref={controls as never}
          enableDamping
          dampingFactor={0.08}
          minDistance={30}
          maxDistance={360}
          autoRotateSpeed={0.35}
          enablePan
          zoomSpeed={0.8}
        />
        <AutoRotate controls={controls} enabled={props.autoRotate ?? true} hold={!!hovered} />
        {bloom && (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.06} luminanceSmoothing={0.35} radius={0.75} />
          </EffectComposer>
        )}
      </Canvas>
      <div className="pointer-events-none absolute inset-0">
        {mode === "strata" &&
          STRATA_LABELS.map(([label, y]) => (
            <div
              key={label}
              ref={register("strata:" + label, () => [58, y, 0])}
              className="absolute left-0 top-0 whitespace-nowrap font-mono text-[8px] tracking-[0.22em]"
              style={{ color: accentHex, visibility: "hidden" }}
              data-alpha="0.6"
            >
              ── {label}
            </div>
          ))}
        {labelIdx.map((i) => {
          const n = NODES[i];
          const isSel = n.id === selected;
          const isHov = n.id === hovered;
          const linked = selected ? ADJ[INDEX[selected]].has(i) : false;
          const imp = shockData?.impact[n.id];
          const alpha = selected && !isSel && !isHov && !linked ? 0.3 : 0.95;
          return (
            <div
              key={n.id}
              ref={register("n:" + n.id, () => {
                const c = posRef.current;
                if (!c || visRef.current?.[i] !== 1) return null;
                return [c[i * 3], c[i * 3 + 1] + NODE_SIZE[i] * 0.5 + 1.2, c[i * 3 + 2]];
              })}
              data-alpha={alpha}
              className="absolute left-0 top-0 whitespace-nowrap font-mono leading-none"
              style={{
                visibility: "hidden",
                fontSize: isSel || isHov ? 10.5 : n.type === "region" ? 9.5 : 8.5,
                letterSpacing: "0.12em",
                color: isSel ? "#fff" : NODE_TYPE_MAP[n.type].color,
                textShadow: "0 0 8px rgba(0,0,0,0.95), 0 0 2px #000",
              }}
            >
              {isSel && <span style={{ color: "var(--a1)" }}>◆ </span>}
              {n.short}
              {imp !== undefined && shock && <span style={{ color: "#ff3d64" }}> −{Math.round(imp * 100)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
