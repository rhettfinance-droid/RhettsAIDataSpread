import { createRng } from "../rng";

// ───────────────────────── Monte Carlo ─────────────────────────

export type MCInput = {
  initial: number;
  contribution: number; // per year, paid monthly
  mu: number; // expected annual arithmetic return
  sigma: number; // annual volatility
  years: number;
  paths: number;
  fatTails: boolean;
  inflation: number;
  target: number;
  seed: number;
};

export type MCResult = {
  times: number[]; // years at each snapshot
  bands: Record<"p5" | "p10" | "p25" | "p50" | "p75" | "p90" | "p95", number[]>;
  samples: Float32Array[]; // a subset of full paths for drawing
  terminal: Float64Array; // sorted
  probTarget: number;
  probLoss: number;
  mean: number;
  contributed: number;
  medianCagr: number;
  ms: number;
};

/** Geometric Brownian motion (optionally Student-t shocks, dof 4) on a monthly grid. */
export function monteCarlo(inp: MCInput): MCResult {
  const t0 = performance.now();
  const rng = createRng(inp.seed);
  const months = Math.round(inp.years * 12);
  const step = Math.max(1, Math.floor(months / 120)); // ≤120 snapshots
  const snaps: number[] = [];
  for (let m = 0; m <= months; m += step) snaps.push(m);
  if (snaps[snaps.length - 1] !== months) snaps.push(months);
  const S = snaps.length;
  const P = inp.paths;
  const grid = new Float32Array(S * P);
  const drift = (inp.mu - inp.inflation - 0.5 * inp.sigma * inp.sigma) / 12;
  const vol = inp.sigma / Math.sqrt(12);
  const c = inp.contribution / 12;
  const sampleN = Math.min(160, P);
  const samples: Float32Array[] = [];
  for (let p = 0; p < P; p++) {
    let v = inp.initial;
    let si = 0;
    const keep = p < sampleN ? new Float32Array(S) : null;
    for (let m = 0; m <= months; m++) {
      if (m === snaps[si]) {
        grid[si * P + p] = v;
        if (keep) keep[si] = v;
        si++;
      }
      if (m === months) break;
      const z = inp.fatTails ? rng.studentT(4) : rng.normal();
      v = v * Math.exp(drift + vol * z) + c;
    }
    if (keep) samples.push(keep);
  }
  const pct = (arr: Float32Array, q: number) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(q * (arr.length - 1))))];
  const bands = { p5: [] as number[], p10: [] as number[], p25: [] as number[], p50: [] as number[], p75: [] as number[], p90: [] as number[], p95: [] as number[] };
  for (let s = 0; s < S; s++) {
    const col = grid.slice(s * P, (s + 1) * P).sort();
    bands.p5.push(pct(col, 0.05));
    bands.p10.push(pct(col, 0.1));
    bands.p25.push(pct(col, 0.25));
    bands.p50.push(pct(col, 0.5));
    bands.p75.push(pct(col, 0.75));
    bands.p90.push(pct(col, 0.9));
    bands.p95.push(pct(col, 0.95));
  }
  const terminal = Float64Array.from(grid.slice((S - 1) * P, S * P)).sort();
  const contributed = inp.initial + inp.contribution * inp.years;
  let hit = 0;
  let loss = 0;
  let sum = 0;
  for (const v of terminal) {
    if (v >= inp.target) hit++;
    if (v < contributed) loss++;
    sum += v;
  }
  const med = terminal[Math.floor(terminal.length / 2)];
  return {
    times: snaps.map((m) => m / 12),
    bands,
    samples,
    terminal,
    probTarget: hit / P,
    probLoss: loss / P,
    mean: sum / P,
    contributed,
    medianCagr: inp.contribution === 0 && inp.initial > 0 ? (med / inp.initial) ** (1 / inp.years) - 1 : NaN,
    ms: performance.now() - t0,
  };
}

// ───────────────────────── Mean-variance optimization ─────────────────────────

export type AssetCMA = { id: string; label: string; mu: number; sigma: number; color: string };

/** Illustrative long-run capital market assumptions (nominal, annual). */
export const CMA: AssetCMA[] = [
  { id: "useq", label: "US Equity", mu: 0.07, sigma: 0.16, color: "#35e7ff" },
  { id: "intl", label: "Intl Dev Equity", mu: 0.075, sigma: 0.17, color: "#3d7bff" },
  { id: "em", label: "EM Equity", mu: 0.085, sigma: 0.22, color: "#9a6bff" },
  { id: "ust", label: "US Treasuries", mu: 0.042, sigma: 0.06, color: "#e8f0ff" },
  { id: "ig", label: "IG Credit", mu: 0.048, sigma: 0.07, color: "#9fd4ff" },
  { id: "hy", label: "High Yield", mu: 0.06, sigma: 0.1, color: "#ffd166" },
  { id: "re", label: "Real Estate", mu: 0.065, sigma: 0.18, color: "#ff8ad0" },
  { id: "cmd", label: "Commodities", mu: 0.045, sigma: 0.18, color: "#ff9f43" },
  { id: "gold", label: "Gold", mu: 0.04, sigma: 0.15, color: "#ffb547" },
];

export const CMA_CORR: number[][] = [
  [1.0, 0.85, 0.75, -0.1, 0.25, 0.65, 0.7, 0.3, 0.05],
  [0.85, 1.0, 0.82, -0.05, 0.3, 0.65, 0.65, 0.35, 0.15],
  [0.75, 0.82, 1.0, -0.05, 0.3, 0.65, 0.6, 0.45, 0.2],
  [-0.1, -0.05, -0.05, 1.0, 0.75, 0.1, 0.15, -0.1, 0.3],
  [0.25, 0.3, 0.3, 0.75, 1.0, 0.55, 0.4, 0.05, 0.25],
  [0.65, 0.65, 0.65, 0.1, 0.55, 1.0, 0.6, 0.35, 0.1],
  [0.7, 0.65, 0.6, 0.15, 0.4, 0.6, 1.0, 0.25, 0.1],
  [0.3, 0.35, 0.45, -0.1, 0.05, 0.35, 0.25, 1.0, 0.35],
  [0.05, 0.15, 0.2, 0.3, 0.25, 0.1, 0.1, 0.35, 1.0],
];

export function covFrom(sigma: number[], corr: number[][]): number[][] {
  return sigma.map((si, i) => sigma.map((sj, j) => si * sj * corr[i][j]));
}

export function portStats(w: number[], mu: number[], cov: number[][]) {
  let m = 0;
  let v = 0;
  for (let i = 0; i < w.length; i++) {
    m += w[i] * mu[i];
    for (let j = 0; j < w.length; j++) v += w[i] * w[j] * cov[i][j];
  }
  return { mu: m, sigma: Math.sqrt(Math.max(0, v)) };
}

/** Euclidean projection onto the probability simplex (Duchi et al.). */
export function projectSimplex(v: number[], cap = 1): number[] {
  const u = [...v].sort((a, b) => b - a);
  let css = 0;
  let rho = 0;
  let theta = 0;
  for (let i = 0; i < u.length; i++) {
    css += u[i];
    const t = (css - 1) / (i + 1);
    if (u[i] - t > 0) {
      rho = i;
      theta = t;
    }
  }
  void rho;
  let w = v.map((x) => Math.max(0, x - theta));
  if (cap < 1) {
    // iterative capping (weights ≤ cap)
    for (let k = 0; k < 20; k++) {
      const over = w.map((x) => Math.max(0, x - cap));
      const excess = over.reduce((a, b) => a + b, 0);
      if (excess < 1e-9) break;
      w = w.map((x) => Math.min(x, cap));
      const free = w.map((x) => (x < cap - 1e-9 ? 1 : 0) as number);
      const nf = free.reduce((a, b) => a + b, 0) || 1;
      w = w.map((x, i) => x + (free[i] ? excess / nf : 0));
    }
  }
  return w;
}

/** Long-only mean–variance optimum for a given risk-aversion λ: max w'μ − λ/2·w'Σw. */
export function optimize(mu: number[], cov: number[][], lambda: number, cap = 1): number[] {
  const n = mu.length;
  let w = new Array(n).fill(1 / n);
  // step size from the Lipschitz constant (trace bound)
  const L = lambda * cov.reduce((s, row, i) => s + Math.abs(row[i]), 0) + 1e-6;
  const eta = 1 / L;
  for (let it = 0; it < 600; it++) {
    const g = mu.map((m, i) => m - lambda * cov[i].reduce((s, c, j) => s + c * w[j], 0));
    w = projectSimplex(
      w.map((x, i) => x + eta * g[i]),
      cap,
    );
  }
  return w;
}

export function frontier(mu: number[], cov: number[][], rf: number, cap = 1) {
  const pts: { w: number[]; mu: number; sigma: number; sharpe: number }[] = [];
  for (let k = 0; k <= 48; k++) {
    const lambda = Math.exp(Math.log(0.4) + (k / 48) * (Math.log(400) - Math.log(0.4)));
    const w = optimize(mu, cov, lambda, cap);
    const s = portStats(w, mu, cov);
    pts.push({ w, ...s, sharpe: (s.mu - rf) / (s.sigma || 1) });
  }
  pts.sort((a, b) => a.sigma - b.sigma);
  // keep efficient upper envelope
  const eff: typeof pts = [];
  let best = -Infinity;
  for (const p of pts) {
    if (p.mu > best + 1e-6) {
      eff.push(p);
      best = p.mu;
    }
  }
  const maxSharpe = eff.reduce((a, b) => (b.sharpe > a.sharpe ? b : a), eff[0]);
  const minVar = eff[0];
  return { eff, maxSharpe, minVar };
}

export function randomPortfolios(mu: number[], cov: number[][], rf: number, n = 3000, seed = 7) {
  const rng = createRng(seed);
  const out: { mu: number; sigma: number; sharpe: number }[] = [];
  for (let k = 0; k < n; k++) {
    // Dirichlet(α) with α < 1 for sparse, spread-out portfolios
    const g = mu.map(() => (-Math.log(Math.max(1e-12, rng.next()))) ** 1.6);
    const s = g.reduce((a, b) => a + b, 0);
    const w = g.map((x) => x / s);
    const st = portStats(w, mu, cov);
    out.push({ ...st, sharpe: (st.mu - rf) / (st.sigma || 1) });
  }
  return out;
}

// ───────────────────────── DCF ─────────────────────────

export type DCFInput = {
  baseFcf: number; // $B, year 0
  growth: number; // years 1–5
  terminalGrowth: number;
  wacc: number;
  years: number; // explicit forecast horizon (fade from growth to terminal over years 6..N)
  netDebt: number; // $B
  shares: number; // B
};

export function dcf(inp: DCFInput) {
  const rows: { year: number; growth: number; fcf: number; df: number; pv: number }[] = [];
  let fcf = inp.baseFcf;
  for (let t = 1; t <= inp.years; t++) {
    const g = t <= 5 ? inp.growth : inp.growth + ((inp.terminalGrowth - inp.growth) * (t - 5)) / Math.max(1, inp.years - 5);
    fcf *= 1 + g;
    const df = 1 / (1 + inp.wacc) ** t;
    rows.push({ year: t, growth: g, fcf, df, pv: fcf * df });
  }
  const last = rows[rows.length - 1];
  const valid = inp.wacc > inp.terminalGrowth + 0.0025;
  const tv = valid ? (last.fcf * (1 + inp.terminalGrowth)) / (inp.wacc - inp.terminalGrowth) : NaN;
  const pvTv = tv * last.df;
  const pvFcf = rows.reduce((s, r) => s + r.pv, 0);
  const ev = pvFcf + pvTv;
  const equity = ev - inp.netDebt;
  return { rows, tv, pvTv, pvFcf, ev, equity, perShare: equity / inp.shares, tvShare: pvTv / ev, valid };
}

export function capmWacc(o: { rf: number; beta: number; erp: number; costDebt: number; tax: number; debtWeight: number }) {
  const ke = o.rf + o.beta * o.erp;
  const kd = o.costDebt * (1 - o.tax);
  return { ke, kd, wacc: (1 - o.debtWeight) * ke + o.debtWeight * kd };
}

// ───────────────────────── stress scenarios ─────────────────────────

export type Bucket = "useq" | "intl" | "em" | "ust" | "ig" | "hy" | "re" | "cmd" | "gold" | "crypto";

export const BUCKET_LABEL: Record<Bucket, string> = {
  useq: "US Equity",
  intl: "Intl Dev Equity",
  em: "EM Equity",
  ust: "Treasuries",
  ig: "IG Credit",
  hy: "High Yield",
  re: "Real Estate",
  cmd: "Commodities",
  gold: "Gold",
  crypto: "Crypto",
};

/** Approximate peak-to-trough moves for each sleeve (illustrative). */
export const SCENARIOS: { id: string; label: string; period: string; shocks: Record<Bucket, number>; note: string }[] = [
  { id: "gfc", label: "Global Financial Crisis", period: "Oct 2007 – Mar 2009", shocks: { useq: -0.51, intl: -0.57, em: -0.61, ust: 0.14, ig: -0.05, hy: -0.33, re: -0.68, cmd: -0.55, gold: 0.05, crypto: -0.75 }, note: "Credit & housing bust; correlations go to one except Treasuries" },
  { id: "covid", label: "COVID Crash", period: "Feb – Mar 2020", shocks: { useq: -0.34, intl: -0.33, em: -0.31, ust: 0.07, ig: -0.12, hy: -0.21, re: -0.42, cmd: -0.32, gold: -0.03, crypto: -0.5 }, note: "Fastest bear market on record, then massive policy response" },
  { id: "rates22", label: "2022 Rate Shock", period: "Jan – Oct 2022", shocks: { useq: -0.25, intl: -0.28, em: -0.33, ust: -0.17, ig: -0.21, hy: -0.15, re: -0.32, cmd: 0.18, gold: -0.18, crypto: -0.74 }, note: "Stocks AND bonds fell — the 60/40 failure mode" },
  { id: "dotcom", label: "Dot-com Unwind", period: "Mar 2000 – Oct 2002", shocks: { useq: -0.49, intl: -0.48, em: -0.42, ust: 0.22, ig: 0.15, hy: -0.08, re: 0.25, cmd: 0.05, gold: 0.12, crypto: -0.8 }, note: "Valuation collapse concentrated in growth/tech" },
  { id: "stag", label: "Stagflation (hypothetical)", period: "Model scenario", shocks: { useq: -0.3, intl: -0.32, em: -0.35, ust: -0.12, ig: -0.15, hy: -0.2, re: -0.25, cmd: 0.3, gold: 0.25, crypto: -0.6 }, note: "Supply shock: inflation up, growth down, real assets outperform" },
  { id: "ai", label: "AI Capex Boom (hypothetical)", period: "Model scenario", shocks: { useq: 0.28, intl: 0.12, em: 0.15, ust: -0.03, ig: 0.02, hy: 0.06, re: 0.05, cmd: 0.1, gold: 0.0, crypto: 0.4 }, note: "Upside case driven by productivity and semis" },
];
