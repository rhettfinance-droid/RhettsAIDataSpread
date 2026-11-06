/**
 * NEXUS market simulation engine.
 *
 * A multi-factor model: every instrument's return is a mix of shared,
 * standardized factor shocks (market, growth, rates, commodities, USD,
 * crypto, sector) plus an idiosyncratic shock. Loadings are correlations to
 * factors, so the implied correlation between i and j is Σ_k b_ik·b_jk.
 *
 * Output is SIMULATED and is always labeled as such in the UI.
 */
import { createRng, hashString } from "../rng";
import { FACTORS, INSTRUMENTS, INSTRUMENT_MAP, type Instrument } from "../data/universe";

export type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type Quote = {
  symbol: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  dir: 1 | -1 | 0;
  source: "SIM" | "LIVE";
  ts: number;
};

export const HISTORY_DAYS = 520;
export const SPARK_LEN = 96;
/** simulated seconds per real second for the intraday clock */
export const SIM_SPEED = 20;
const TRADING_SECONDS_PER_YEAR = 252 * 6.5 * 3600;

function factorVector(rng: ReturnType<typeof createRng>) {
  return FACTORS.map(() => rng.normal());
}

function loadingArray(inst: Instrument): number[] {
  return FACTORS.map((f) => inst.loadings[f] ?? 0);
}

const LOADINGS: Record<string, number[]> = Object.fromEntries(INSTRUMENTS.map((i) => [i.symbol, loadingArray(i)]));
const IDIO: Record<string, number> = Object.fromEntries(
  INSTRUMENTS.map((i) => {
    const ss = LOADINGS[i.symbol].reduce((s, b) => s + b * b, 0);
    return [i.symbol, Math.sqrt(Math.max(0.02, 1 - ss))];
  }),
);

/** Model-implied correlation between two instruments (from factor loadings). */
export function impliedCorrelation(a: string, b: string): number {
  if (a === b) return 1;
  const la = LOADINGS[a];
  const lb = LOADINGS[b];
  if (!la || !lb) return 0;
  let s = 0;
  for (let k = 0; k < la.length; k++) s += la[k] * lb[k];
  return s;
}

function shock(symbol: string, f: number[], z: number): number {
  const l = LOADINGS[symbol];
  let s = 0;
  for (let k = 0; k < l.length; k++) s += l[k] * f[k];
  return s + IDIO[symbol] * z;
}

function businessDaysBack(n: number, end = new Date()): number[] {
  const out: number[] = [];
  const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // last completed session = previous business day
  d.setUTCDate(d.getUTCDate() - 1);
  while (out.length < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(Math.floor(d.getTime() / 1000));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out.reverse();
}

function dailySigma(inst: Instrument) {
  return inst.vol / Math.sqrt(252);
}

let historyCache: Record<string, Bar[]> | null = null;
let historyKey = "";

/** Generates (and caches per calendar day) correlated daily OHLCV history for every instrument. */
export function getAllHistory(): Record<string, Bar[]> {
  const today = new Date().toISOString().slice(0, 10);
  if (historyCache && historyKey === today) return historyCache;
  const times = businessDaysBack(HISTORY_DAYS);
  // Shared factor path with embedded volatility regimes. We pick the first seed whose
  // market-factor path is "ordinary" (a modest up-trend with a mid-period correction)
  // so the simulated tape doesn't open on a crash or a melt-up.
  let factorPath: number[][] = [];
  for (let attempt = 0; attempt < 64; attempt++) {
    const rng = createRng(hashString("nexus-history-v1:" + attempt));
    const path: number[][] = [];
    for (let t = 0; t < HISTORY_DAYS; t++) {
      const f = factorVector(rng);
      const regime = 1 + 0.9 * Math.exp(-(((t - 140) / 18) ** 2)) + 0.6 * Math.exp(-(((t - 390) / 12) ** 2));
      path.push(f.map((x, k) => (k === 0 || k === 1 ? x * regime : x)));
    }
    factorPath = path;
    let total = 0;
    let lastYear = 0;
    let minRun = 0;
    let run = 0;
    for (let t = 0; t < HISTORY_DAYS; t++) {
      total += path[t][0];
      if (t >= HISTORY_DAYS - 252) lastYear += path[t][0];
      run = Math.min(0, run + path[t][0]);
      minRun = Math.min(minRun, run);
    }
    if (total > 0 && total < 22 && lastYear > -2 && lastYear < 14 && minRun < -8) break;
  }
  const out: Record<string, Bar[]> = {};
  for (const inst of INSTRUMENTS) {
    const r = createRng(hashString("hist:" + inst.symbol));
    const sd = dailySigma(inst);
    const bars: Bar[] = [];
    let x = inst.kind === "level" ? inst.ref : 0; // log-space accumulator for log kinds
    const raw: number[] = [];
    const vix: number[] = [];
    let lv = Math.log(inst.ref);
    for (let t = 0; t < HISTORY_DAYS; t++) {
      const e = shock(inst.symbol, factorPath[t], r.normal());
      if (inst.kind === "level") {
        x += sd * e + (inst.ref - x) * 0.004;
        raw.push(x);
      } else if (inst.kind === "vix") {
        const regime = 1 + 1.6 * Math.exp(-(((t - 140) / 14) ** 2)) + 1.0 * Math.exp(-(((t - 390) / 10) ** 2));
        lv += 0.06 * (Math.log(inst.ref * regime) - lv) + sd * 0.55 * e;
        vix.push(Math.exp(lv));
      } else {
        x += (inst.drift ?? 0.04) / 252 - 0.5 * sd * sd + sd * e;
        raw.push(x);
      }
    }
    let closes: number[];
    if (inst.kind === "level") {
      const shift = inst.ref - raw[raw.length - 1];
      closes = raw.map((v) => v + shift);
    } else if (inst.kind === "vix") {
      const k = inst.ref / vix[vix.length - 1];
      closes = vix.map((v) => v * k);
    } else {
      const last = raw[raw.length - 1];
      closes = raw.map((v) => inst.ref * Math.exp(v - last));
    }
    const baseVol = inst.mcap ? Math.max(2e6, (inst.mcap * 1e9) / inst.ref / 180) : inst.cls === "crypto" ? 3e4 : 1e6;
    for (let t = 0; t < HISTORY_DAYS; t++) {
      const c = closes[t];
      const p = t > 0 ? closes[t - 1] : c;
      const gap = inst.kind === "level" ? r.normal() * sd * 0.15 : 1 + r.normal() * sd * 0.18;
      const o = inst.kind === "level" ? p + gap : p * gap;
      const span = Math.abs(r.normal()) * sd * 0.6 + sd * 0.25;
      const hi = inst.kind === "level" ? Math.max(o, c) + span * 0.5 : Math.max(o, c) * (1 + span * 0.5);
      const lo = inst.kind === "level" ? Math.min(o, c) - span * 0.5 : Math.min(o, c) * (1 - span * 0.5);
      const move = inst.kind === "level" ? Math.abs(c - p) / (sd || 1) : Math.abs(Math.log(c / p)) / (sd || 1);
      const volume = baseVol * (0.65 + 0.45 * move) * Math.exp(r.normal() * 0.25);
      bars.push({ time: times[t], open: o, high: hi, low: lo, close: c, volume });
    }
    out[inst.symbol] = bars;
  }
  historyCache = out;
  historyKey = today;
  return out;
}

export function getHistory(symbol: string): Bar[] {
  return getAllHistory()[symbol] ?? [];
}

/** Daily closes for a symbol (or a synthetic series for unknown ids). */
export function getCloses(symbol: string, n = HISTORY_DAYS): number[] {
  const h = getHistory(symbol);
  return h.slice(-n).map((b) => b.close);
}

/** Synthetic performance series for entities that are not tradable instruments. */
export function syntheticSeries(id: string, n = 260, vol = 0.18, drift = 0.06, start = 100): number[] {
  const r = createRng(hashString("syn:" + id));
  const out: number[] = [start];
  const sd = vol / Math.sqrt(252);
  for (let i = 1; i < n; i++) out.push(out[i - 1] * Math.exp(drift / 252 - 0.5 * sd * sd + sd * r.normal()));
  return out;
}

// ───────────────────────── live intraday engine ─────────────────────────

type LiveState = {
  anchor: number; // prev close (log kinds: log of it; level: value)
  x: number; // current state in model space
  hi: number;
  lo: number;
  vol: number;
  spark: number[];
  live?: { price: number; prevClose: number; high: number; low: number; ts: number };
};

export class MarketEngine {
  private state: Record<string, LiveState> = {};
  private rng = createRng(Date.now() >>> 0);
  public tickCount = 0;

  constructor() {
    const hist = getAllHistory();
    // initial "today" move drawn from the stationary distribution with factor structure
    const f = factorVector(this.rng);
    for (const inst of INSTRUMENTS) {
      const bars = hist[inst.symbol];
      const close = bars[bars.length - 1].close;
      const sd = dailySigma(inst) * 0.7;
      const e = shock(inst.symbol, f, this.rng.normal());
      const anchor = inst.kind === "level" ? close : Math.log(close);
      const x = inst.kind === "level" ? close + sd * e : anchor + sd * e * (inst.kind === "vix" ? 0.6 : 1);
      // Brownian bridge from the close to the opening state, for intraday sparklines
      const spark: number[] = [];
      let b = 0;
      const steps = SPARK_LEN;
      const path: number[] = [];
      for (let i = 0; i < steps; i++) {
        b += this.rng.normal();
        path.push(b);
      }
      const end = path[steps - 1];
      for (let i = 0; i < steps; i++) {
        const tt = (i + 1) / steps;
        const bridge = (path[i] - tt * end) * sd * 0.18;
        const v = anchor + (x - anchor) * tt + bridge;
        spark.push(inst.kind === "level" ? v : Math.exp(v));
      }
      const px = inst.kind === "level" ? x : Math.exp(x);
      this.state[inst.symbol] = {
        anchor,
        x,
        hi: Math.max(px, ...spark),
        lo: Math.min(px, ...spark),
        vol: bars[bars.length - 1].volume * 0.42,
        spark,
      };
    }
  }

  /** Advance the simulation by one real-time step (≈1s). */
  step(seconds = 1) {
    const dt = (seconds * SIM_SPEED) / TRADING_SECONDS_PER_YEAR;
    const sq = Math.sqrt(dt);
    const f = factorVector(this.rng);
    this.tickCount++;
    for (const inst of INSTRUMENTS) {
      const s = this.state[inst.symbol];
      if (s.live) continue;
      const e = shock(inst.symbol, f, this.rng.normal());
      // mean-reversion keeps the intraday excursion in a realistic band
      const sigmaTick = inst.vol * sq;
      const target = dailySigma(inst) * 0.9;
      const kappa = Math.min(0.05, (sigmaTick / target) ** 2 / 2);
      s.x += -kappa * (s.x - s.anchor) + sigmaTick * e;
      const px = inst.kind === "level" ? s.x : Math.exp(s.x);
      s.hi = Math.max(s.hi, px);
      s.lo = Math.min(s.lo, px);
      s.vol += Math.abs(e) * (s.vol / 2000);
      s.spark.push(px);
      if (s.spark.length > SPARK_LEN) s.spark.shift();
    }
  }

  setLive(symbol: string, q: { price: number; prevClose: number; high: number; low: number }) {
    const s = this.state[symbol];
    const inst = INSTRUMENT_MAP[symbol];
    if (!s || !inst) return;
    s.live = { ...q, ts: Date.now() };
    s.anchor = inst.kind === "level" ? q.prevClose : Math.log(q.prevClose);
    s.x = inst.kind === "level" ? q.price : Math.log(q.price);
    s.hi = q.high;
    s.lo = q.low;
    s.spark.push(q.price);
    if (s.spark.length > SPARK_LEN) s.spark.shift();
  }

  snapshot(prev?: Record<string, Quote>): { quotes: Record<string, Quote>; spark: Record<string, number[]> } {
    const quotes: Record<string, Quote> = {};
    const spark: Record<string, number[]> = {};
    const now = Date.now();
    for (const inst of INSTRUMENTS) {
      const s = this.state[inst.symbol];
      const price = inst.kind === "level" ? s.x : Math.exp(s.x);
      const prevClose = s.live ? s.live.prevClose : inst.kind === "level" ? s.anchor : Math.exp(s.anchor);
      const change = price - prevClose;
      const old = prev?.[inst.symbol]?.price;
      quotes[inst.symbol] = {
        symbol: inst.symbol,
        price,
        prevClose,
        change,
        changePct: inst.kind === "level" ? change / Math.max(prevClose, 1e-9) : price / prevClose - 1,
        high: s.hi,
        low: s.lo,
        volume: s.vol,
        dir: old === undefined || old === price ? 0 : price > old ? 1 : -1,
        source: s.live ? "LIVE" : "SIM",
        ts: now,
      };
      spark[inst.symbol] = s.spark.slice();
    }
    return { quotes, spark };
  }
}
