import { getAllHistory, getHistory } from "./engine";
import { EQUITY_SYMBOLS, INSTRUMENT_MAP, SECTORS, type SectorId } from "../data/universe";

export type Horizon = "1D" | "5D" | "1M" | "3M" | "1Y";
export const HORIZON_DAYS: Record<Horizon, number> = { "1D": 1, "5D": 5, "1M": 21, "3M": 63, "1Y": 252 };

/** Return over horizon using live price for today and simulated closes before. */
export function horizonReturn(symbol: string, livePrice: number | undefined, h: Horizon): number {
  const hist = getHistory(symbol);
  if (!hist.length) return 0;
  const n = HORIZON_DAYS[h];
  const base = hist[Math.max(0, hist.length - n)].close;
  const last = livePrice ?? hist[hist.length - 1].close;
  const inst = INSTRUMENT_MAP[symbol];
  if (inst?.kind === "level") return (last - base) / Math.max(1e-9, base);
  return last / base - 1;
}

let breadthCache: ReturnType<typeof computeBreadth> | null = null;

function computeBreadth() {
  const all = getAllHistory();
  const syms = EQUITY_SYMBOLS;
  const len = all[syms[0]].length;
  const start = 260;
  const out: { t: number; adv: number; dec: number; ad: number; above50: number; highs: number; lows: number; mcclellan: number }[] = [];
  let ad = 0;
  let ema19 = 0;
  let ema39 = 0;
  for (let i = start; i < len; i++) {
    let adv = 0;
    let dec = 0;
    let above = 0;
    let highs = 0;
    let lows = 0;
    for (const s of syms) {
      const h = all[s];
      const c = h[i].close;
      const p = h[i - 1].close;
      if (c > p) adv++;
      else if (c < p) dec++;
      let m50 = 0;
      for (let k = i - 49; k <= i; k++) m50 += h[k].close;
      if (c > m50 / 50) above++;
      let hi = -Infinity;
      let lo = Infinity;
      for (let k = i - 251; k < i; k++) {
        hi = Math.max(hi, h[k].high);
        lo = Math.min(lo, h[k].low);
      }
      if (h[i].high >= hi) highs++;
      if (h[i].low <= lo) lows++;
    }
    const net = adv - dec;
    ad += net;
    ema19 = i === start ? net : ema19 + 0.1 * (net - ema19);
    ema39 = i === start ? net : ema39 + 0.05 * (net - ema39);
    out.push({ t: all[syms[0]][i].time * 1000, adv, dec, ad, above50: (above / syms.length) * 100, highs, lows, mcclellan: ema19 - ema39 });
  }
  return out;
}

export function breadthSeries() {
  if (!breadthCache) breadthCache = computeBreadth();
  return breadthCache;
}

export function realizedVol(symbol: string, window = 20) {
  const h = getHistory(symbol);
  const out: { x: number; y: number }[] = [];
  for (let i = window; i < h.length; i++) {
    let s = 0;
    let s2 = 0;
    for (let k = i - window + 1; k <= i; k++) {
      const r = Math.log(h[k].close / h[k - 1].close);
      s += r;
      s2 += r * r;
    }
    const m = s / window;
    out.push({ x: h[i].time * 1000, y: Math.sqrt(Math.max(0, s2 / window - m * m) * 252) * 100 });
  }
  return out;
}

export function sectorReturns(quotes: Record<string, { price: number; changePct: number } | undefined>, h: Horizon) {
  const res: Record<SectorId, { ret: number; cap: number }> = {} as never;
  for (const s of SECTORS) res[s.id] = { ret: 0, cap: 0 };
  for (const sym of EQUITY_SYMBOLS) {
    const inst = INSTRUMENT_MAP[sym];
    if (!inst.sector || !inst.mcap) continue;
    const r = h === "1D" ? quotes[sym]?.changePct ?? 0 : horizonReturn(sym, quotes[sym]?.price, h);
    res[inst.sector].ret += r * inst.mcap;
    res[inst.sector].cap += inst.mcap;
  }
  return SECTORS.map((s) => ({ id: s.id, name: s.name, ret: res[s.id].cap ? res[s.id].ret / res[s.id].cap : 0 }));
}
