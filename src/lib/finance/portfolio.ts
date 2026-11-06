import { getHistory } from "../sim/engine";
import { INSTRUMENT_MAP, SECTOR_NAME, type Instrument } from "../data/universe";
import { mean, std, correlation, covariance, drawdown, quantile } from "../stats";

export const RISK_FREE = 0.0375; // reference T-bill yield assumption

export function isInvestable(i: Instrument) {
  return i.cls === "equity" || i.cls === "fund" || i.cls === "commodity" || i.cls === "crypto" || i.cls === "index";
}

export function assetClassOf(i: Instrument): string {
  if (i.cls === "equity") return "US Equity";
  if (i.cls === "index") return "US Equity";
  if (i.cls === "crypto") return "Digital Assets";
  if (i.cls === "commodity") return "Commodities";
  if (["IEF", "AGG", "TIP", "HYG"].includes(i.symbol)) return "Fixed Income";
  if (i.symbol === "VNQ") return "Real Estate";
  if (["EFA", "EEM"].includes(i.symbol)) return "Intl Equity";
  return "Other";
}

export const CLASS_COLORS: Record<string, string> = {
  "US Equity": "#35e7ff",
  "Intl Equity": "#3d7bff",
  "Fixed Income": "#e8f0ff",
  "Real Estate": "#9a6bff",
  Commodities: "#ff9f43",
  "Digital Assets": "#ff3d8b",
  Other: "#7c8798",
};

export function sectorOf(i: Instrument): string {
  if (i.sector) return SECTOR_NAME[i.sector];
  const c = assetClassOf(i);
  if (c === "Fixed Income") return i.symbol === "HYG" ? "Credit" : "Government Bonds";
  if (i.symbol === "EFA" || i.symbol === "EEM" || i.cls === "index") return "Diversified Equity";
  return c;
}

/** Approximate look-through geographic weights for each holding. */
export function geoWeights(i: Instrument): Record<string, number> {
  if (i.symbol === "EFA") return { Europe: 0.64, Japan: 0.22, "Asia Pacific": 0.14 };
  if (i.symbol === "EEM") return { China: 0.28, India: 0.2, "Taiwan & Korea": 0.3, "Other EM": 0.22 };
  if (i.cls === "commodity" || i.cls === "crypto") return { Global: 1 };
  return { "United States": 1 };
}

export type PortfolioStats = {
  nav: { x: number; y: number }[];
  bench: { x: number; y: number }[];
  dd: { x: number; y: number }[];
  rollVol: { x: number; y: number }[];
  annRet: number;
  annVol: number;
  sharpe: number;
  sortino: number;
  maxDD: number;
  beta: number;
  var95: number;
  cvar95: number;
  corr: number[][];
  riskContrib: number[];
  benchAnnRet: number;
  benchVol: number;
  trackingError: number;
};

function returns(symbol: string, n: number) {
  const h = getHistory(symbol).slice(-(n + 1));
  return h.slice(1).map((b, i) => b.close / h[i].close - 1);
}

export function analyze(holdings: { symbol: string; weight: number }[], benchmark: "SPX" | "6040", n = 504): PortfolioStats | null {
  const valid = holdings.filter((h) => INSTRUMENT_MAP[h.symbol] && h.weight > 0);
  if (!valid.length) return null;
  const tot = valid.reduce((s, h) => s + h.weight, 0);
  const w = valid.map((h) => h.weight / tot);
  const R = valid.map((h) => returns(h.symbol, n));
  const T = Math.min(...R.map((r) => r.length));
  const times = getHistory("SPX").slice(-T).map((b) => b.time * 1000);
  const rp: number[] = [];
  for (let t = 0; t < T; t++) {
    let s = 0;
    for (let i = 0; i < w.length; i++) s += w[i] * R[i][R[i].length - T + t];
    rp.push(s);
  }
  const spx = returns("SPX", T);
  const agg = returns("AGG", T);
  const rb = benchmark === "SPX" ? spx : spx.map((r, i) => 0.6 * r + 0.4 * agg[i]);
  const navV = [100];
  const benV = [100];
  for (let t = 0; t < T; t++) {
    navV.push(navV[t] * (1 + rp[t]));
    benV.push(benV[t] * (1 + rb[t]));
  }
  const nav = navV.slice(1).map((v, i) => ({ x: times[i], y: v }));
  const bench = benV.slice(1).map((v, i) => ({ x: times[i], y: v }));
  const ddr = drawdown(navV.slice(1));
  const years = T / 252;
  const annRet = (navV[navV.length - 1] / 100) ** (1 / years) - 1;
  const benchAnnRet = (benV[benV.length - 1] / 100) ** (1 / years) - 1;
  const annVol = std(rp) * Math.sqrt(252);
  const benchVol = std(rb) * Math.sqrt(252);
  const downside = Math.sqrt(mean(rp.map((r) => Math.min(0, r) ** 2))) * Math.sqrt(252);
  const sorted = [...rp].sort((a, b) => a - b);
  const var95 = -quantile(sorted, 0.05);
  const tail = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.05)));
  const cvar95 = -mean(tail);
  const beta = covariance(rp, spx) / (std(spx) ** 2 || 1);
  const te = std(rp.map((r, i) => r - rb[i])) * Math.sqrt(252);
  const rollVol: { x: number; y: number }[] = [];
  for (let t = 60; t < T; t++) rollVol.push({ x: times[t], y: std(rp.slice(t - 60, t)) * Math.sqrt(252) * 100 });
  // covariance-based risk contribution (last 252d)
  const L = Math.min(252, T);
  const Rl = R.map((r) => r.slice(-L));
  const cov = Rl.map((a) => Rl.map((b) => covariance(a, b)));
  const corr = Rl.map((a) => Rl.map((b) => correlation(a, b)));
  const sw = cov.map((row) => row.reduce((s, c, j) => s + c * w[j], 0));
  const varP = w.reduce((s, wi, i) => s + wi * sw[i], 0) || 1;
  const riskContrib = w.map((wi, i) => (wi * sw[i]) / varP);
  return {
    nav,
    bench,
    dd: ddr.series.map((v, i) => ({ x: times[i], y: v * 100 })),
    rollVol,
    annRet,
    annVol,
    sharpe: (annRet - RISK_FREE) / (annVol || 1),
    sortino: (annRet - RISK_FREE) / (downside || 1),
    maxDD: ddr.maxDD,
    beta,
    var95,
    cvar95,
    corr,
    riskContrib,
    benchAnnRet,
    benchVol,
    trackingError: te,
  };
}
