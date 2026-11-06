/** Deterministic PRNG utilities so simulated data is stable across reloads. */

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = {
  next: () => number;
  normal: () => number;
  range: (a: number, b: number) => number;
  int: (a: number, b: number) => number;
  pick: <T>(arr: readonly T[]) => T;
  studentT: (dof: number) => number;
};

export function createRng(seed: number | string): Rng {
  const next = mulberry32(typeof seed === "string" ? hashString(seed) : seed);
  let spare: number | null = null;
  const normal = () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = next();
    while (v === 0) v = next();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
  // Student-t via normal / sqrt(chi2/dof), rescaled to unit variance.
  const studentT = (dof: number) => {
    let chi = 0;
    for (let i = 0; i < dof; i++) {
      const z = normal();
      chi += z * z;
    }
    const t = normal() / Math.sqrt(chi / dof);
    return dof > 2 ? t * Math.sqrt((dof - 2) / dof) : t;
  };
  return {
    next,
    normal,
    range: (a, b) => a + (b - a) * next(),
    int: (a, b) => Math.floor(a + (b - a + 1) * next()),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    studentT,
  };
}
