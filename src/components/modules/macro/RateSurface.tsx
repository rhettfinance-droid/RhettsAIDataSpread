"use client";
import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { CURVE_YEARS, modeledCurve, YEARS } from "@/lib/data/macro";
import { useSettings } from "@/lib/store/settings";

const X_SPAN = 46;
const Z_SPAN = 70;
const Y_SCALE = 3.1;

const xOf = (m: number) => (Math.log(m * 12) / Math.log(360)) * X_SPAN - X_SPAN / 2;
const zOf = (i: number) => (i / (YEARS.length - 1)) * Z_SPAN - Z_SPAN / 2;

const RAMP = ["#3d4bff", "#7a5cff", "#35e7ff", "#3dff9a", "#ffd166", "#ff9f43", "#ff3d64"].map((c) => new THREE.Color(c));
function ramp(v: number, out: THREE.Color) {
  const t = Math.max(0, Math.min(0.9999, v / 9)) * (RAMP.length - 1);
  const i = Math.floor(t);
  return out.copy(RAMP[i]).lerp(RAMP[i + 1], t - i);
}

function Surface({ year, onHover }: { year: number | null; onHover: (y: number | null, tenor: number | null, v: number | null) => void }) {
  const data = useMemo(() => YEARS.map((y) => modeledCurve(y)), []);
  const { mesh, lines } = useMemo(() => {
    const nx = CURVE_YEARS.length;
    const nz = YEARS.length;
    const pos = new Float32Array(nx * nz * 3);
    const col = new Float32Array(nx * nz * 3);
    const c = new THREE.Color();
    for (let zi = 0; zi < nz; zi++)
      for (let xi = 0; xi < nx; xi++) {
        const k = zi * nx + xi;
        const v = data[zi][xi];
        pos[k * 3] = xOf(CURVE_YEARS[xi]);
        pos[k * 3 + 1] = v * Y_SCALE;
        pos[k * 3 + 2] = zOf(zi);
        ramp(v, c);
        col[k * 3] = c.r;
        col[k * 3 + 1] = c.g;
        col[k * 3 + 2] = c.b;
      }
    const idx: number[] = [];
    for (let zi = 0; zi < nz - 1; zi++)
      for (let xi = 0; xi < nx - 1; xi++) {
        const a = zi * nx + xi;
        const b = a + 1;
        const d = a + nx;
        const e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    // grid lines
    const lp: number[] = [];
    const lc: number[] = [];
    const push = (k1: number, k2: number) => {
      lp.push(pos[k1 * 3], pos[k1 * 3 + 1], pos[k1 * 3 + 2], pos[k2 * 3], pos[k2 * 3 + 1], pos[k2 * 3 + 2]);
      lc.push(col[k1 * 3], col[k1 * 3 + 1], col[k1 * 3 + 2], col[k2 * 3], col[k2 * 3 + 1], col[k2 * 3 + 2]);
    };
    for (let zi = 0; zi < nz; zi++) for (let xi = 0; xi < nx - 1; xi++) push(zi * nx + xi, zi * nx + xi + 1);
    for (let xi = 0; xi < nx; xi++) for (let zi = 0; zi < nz - 1; zi++) push(zi * nx + xi, (zi + 1) * nx + xi);
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    lg.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
    return { mesh: g, lines: lg };
  }, [data]);

  const hl = useMemo(() => {
    if (year === null) return null;
    const zi = YEARS.indexOf(year);
    if (zi < 0) return null;
    const pts = CURVE_YEARS.map((m, xi) => new THREE.Vector3(xOf(m), data[zi][xi] * Y_SCALE + 0.15, zOf(zi)));
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [year, data]);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = e.point;
    const zi = Math.round(((p.z + Z_SPAN / 2) / Z_SPAN) * (YEARS.length - 1));
    let best = 0;
    let bd = Infinity;
    CURVE_YEARS.forEach((m, xi) => {
      const d = Math.abs(xOf(m) - p.x);
      if (d < bd) {
        bd = d;
        best = xi;
      }
    });
    const y = YEARS[Math.max(0, Math.min(YEARS.length - 1, zi))];
    onHover(y, best, data[YEARS.indexOf(y)][best]);
  };

  return (
    <group>
      <mesh geometry={mesh} onPointerMove={onMove} onPointerOut={() => onHover(null, null, null)}>
        <meshBasicMaterial vertexColors transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={lines}>
        <lineBasicMaterial vertexColors transparent opacity={0.85} toneMapped={false} />
      </lineSegments>
      {hl && (
        <line>
          <primitive object={hl} attach="geometry" />
          <lineBasicMaterial color="#ffffff" toneMapped={false} />
        </line>
      )}
      {/* floor grid */}
      <gridHelper args={[80, 16, "#1a2433", "#0e151f"]} position={[0, -0.2, 0]} />
    </group>
  );
}

function Spin() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.04;
  });
  return <group ref={ref} />;
}

export default function RateSurface({ year, onHover }: { year: number | null; onHover: (y: number | null, tenor: number | null, v: number | null) => void }) {
  const bloom = useSettings((s) => s.bloom);
  return (
    <Canvas flat dpr={[1, 1.75]} camera={{ position: [62, 46, 62], fov: 36 }} gl={{ antialias: true, alpha: true }}>
      <Surface year={year} onHover={onHover} />
      <Spin />
      <OrbitControls enableDamping autoRotate autoRotateSpeed={0.3} target={[0, 9, 0]} minDistance={40} maxDistance={180} />
      {bloom && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.8} luminanceThreshold={0.15} radius={0.6} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
