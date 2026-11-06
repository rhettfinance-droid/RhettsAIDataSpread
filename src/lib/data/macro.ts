/**
 * US macro REFERENCE dataset — annual averages (approximate, rounded) compiled from
 * public FRED/BLS/BEA/Fed series. 2025 values are partial-year estimates.
 * Labeled REF in the UI. Configure FRED_API_KEY to replace with live monthly series.
 */

export const YEARS = Array.from({ length: 36 }, (_, i) => 1990 + i); // 1990..2025

type Row = (number | null)[];

export type MacroKey = "fedfunds" | "cpi" | "corePce" | "unemployment" | "gdp" | "y10" | "y2" | "sentiment" | "debt" | "fedBalance";

export const MACRO_META: Record<MacroKey, { label: string; short: string; unit: string; fred: string; desc: string; color: string; fmt: (v: number) => string }> = {
  fedfunds: { label: "Federal Funds Rate", short: "FED FUNDS", unit: "%", fred: "FEDFUNDS", desc: "Effective overnight interbank rate targeted by the FOMC.", color: "#35e7ff", fmt: (v) => `${v.toFixed(2)}%` },
  cpi: { label: "CPI Inflation (YoY)", short: "CPI", unit: "%", fred: "CPIAUCSL", desc: "Consumer Price Index, all urban consumers — headline year-over-year change.", color: "#ff3d64", fmt: (v) => `${v.toFixed(1)}%` },
  corePce: { label: "Core PCE Inflation (YoY)", short: "CORE PCE", unit: "%", fred: "PCEPILFE", desc: "The Fed's preferred inflation gauge, excluding food & energy.", color: "#ff8ad0", fmt: (v) => `${v.toFixed(1)}%` },
  unemployment: { label: "Unemployment Rate", short: "UNEMP", unit: "%", fred: "UNRATE", desc: "Civilian unemployment rate (U-3).", color: "#ffb547", fmt: (v) => `${v.toFixed(1)}%` },
  gdp: { label: "Real GDP Growth", short: "GDP", unit: "%", fred: "A191RL1Q225SBEA", desc: "Annual growth of real gross domestic product.", color: "#3dff9a", fmt: (v) => `${v.toFixed(1)}%` },
  y10: { label: "10-Year Treasury Yield", short: "UST 10Y", unit: "%", fred: "GS10", desc: "Market yield on 10-year US Treasury securities.", color: "#9a6bff", fmt: (v) => `${v.toFixed(2)}%` },
  y2: { label: "2-Year Treasury Yield", short: "UST 2Y", unit: "%", fred: "GS2", desc: "Market yield on 2-year US Treasury securities.", color: "#4d8bff", fmt: (v) => `${v.toFixed(2)}%` },
  sentiment: { label: "Consumer Sentiment", short: "SENTIMENT", unit: "idx", fred: "UMCSENT", desc: "University of Michigan consumer sentiment index (1966:Q1 = 100).", color: "#e8f0ff", fmt: (v) => v.toFixed(1) },
  debt: { label: "Federal Debt (Total Public)", short: "DEBT", unit: "$T", fred: "GFDEBTN", desc: "Total public debt outstanding, trillions of dollars.", color: "#ff9f43", fmt: (v) => `$${v.toFixed(1)}T` },
  fedBalance: { label: "Fed Balance Sheet", short: "FED BS", unit: "$T", fred: "WALCL", desc: "Total assets of the Federal Reserve (year-end), trillions.", color: "#ffd166", fmt: (v) => `$${v.toFixed(2)}T` },
};

const D: Record<MacroKey, Row> = {
  fedfunds: [8.1, 5.69, 3.52, 3.02, 4.21, 5.83, 5.3, 5.46, 5.35, 4.97, 6.24, 3.88, 1.67, 1.13, 1.35, 3.22, 4.97, 5.02, 1.92, 0.16, 0.18, 0.1, 0.14, 0.11, 0.09, 0.13, 0.4, 1.0, 1.83, 2.16, 0.38, 0.08, 1.68, 5.02, 5.14, 4.2],
  cpi: [5.4, 4.2, 3.0, 3.0, 2.6, 2.8, 3.0, 2.3, 1.6, 2.2, 3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.9, 3.8, -0.4, 1.6, 3.2, 2.1, 1.5, 1.6, 0.1, 1.3, 2.1, 2.4, 1.8, 1.2, 4.7, 8.0, 4.1, 2.9, 2.7],
  corePce: [3.9, 3.4, 2.9, 2.4, 2.1, 2.2, 1.9, 1.8, 1.4, 1.4, 1.8, 1.9, 1.6, 1.4, 2.0, 2.2, 2.3, 2.2, 2.0, 1.5, 1.3, 1.5, 1.9, 1.5, 1.6, 1.3, 1.7, 1.6, 2.0, 1.7, 1.3, 3.6, 5.4, 4.1, 2.8, 2.8],
  unemployment: [5.6, 6.8, 7.5, 6.9, 6.1, 5.6, 5.4, 4.9, 4.5, 4.2, 4.0, 4.7, 5.8, 6.0, 5.5, 5.1, 4.6, 4.6, 5.8, 9.3, 9.6, 8.9, 8.1, 7.4, 6.2, 5.3, 4.9, 4.4, 3.9, 3.7, 8.1, 5.4, 3.6, 3.6, 4.0, 4.3],
  gdp: [1.9, -0.1, 3.5, 2.8, 4.0, 2.7, 3.8, 4.4, 4.5, 4.8, 4.1, 1.0, 1.7, 2.8, 3.9, 3.5, 2.8, 2.0, 0.1, -2.6, 2.7, 1.6, 2.3, 2.1, 2.5, 2.9, 1.8, 2.5, 3.0, 2.5, -2.2, 6.1, 2.5, 2.9, 2.8, 2.0],
  y10: [8.55, 7.86, 7.01, 5.87, 7.09, 6.57, 6.44, 6.35, 5.26, 5.65, 6.03, 5.02, 4.61, 4.01, 4.27, 4.29, 4.8, 4.63, 3.66, 3.26, 3.22, 2.78, 1.8, 2.35, 2.54, 2.14, 1.84, 2.33, 2.91, 2.14, 0.89, 1.45, 2.95, 3.96, 4.21, 4.3],
  y2: [8.16, 6.49, 5.12, 4.43, 5.93, 6.15, 5.84, 5.99, 5.13, 5.43, 6.26, 3.8, 2.38, 1.65, 2.38, 3.85, 4.82, 4.36, 2.01, 0.96, 0.7, 0.45, 0.28, 0.31, 0.46, 0.69, 0.84, 1.4, 2.53, 1.97, 0.39, 0.27, 2.99, 4.59, 4.37, 3.8],
  sentiment: [81.6, 77.6, 77.3, 82.8, 92.3, 92.3, 93.6, 103.2, 104.6, 105.8, 107.6, 89.2, 89.6, 87.6, 95.2, 88.5, 87.3, 85.6, 63.8, 66.3, 71.8, 67.4, 76.5, 79.2, 84.1, 92.9, 91.8, 96.8, 98.4, 96.0, 81.5, 77.6, 59.0, 65.4, 72.5, 58.0],
  debt: [3.2, 3.6, 4.0, 4.4, 4.6, 4.97, 5.2, 5.4, 5.5, 5.66, 5.67, 5.8, 6.2, 6.8, 7.4, 7.9, 8.5, 9.0, 10.0, 11.9, 13.6, 14.8, 16.1, 16.7, 17.8, 18.2, 19.6, 20.2, 21.5, 22.7, 26.9, 28.4, 30.9, 33.2, 35.5, 37.6],
  fedBalance: [null, null, null, null, null, null, null, null, null, null, null, null, null, 0.73, 0.79, 0.83, 0.87, 0.89, 2.24, 2.24, 2.42, 2.93, 2.91, 4.03, 4.5, 4.49, 4.45, 4.45, 4.08, 4.17, 7.36, 8.76, 8.55, 7.71, 6.85, 6.55],
};

export type MacroPoint = { x: number; y: number | null };

export function refSeries(key: MacroKey): MacroPoint[] {
  return YEARS.map((y, i) => ({ x: Date.UTC(y, 6, 1), y: D[key][i] }));
}

export function refValue(key: MacroKey, year: number): number | null {
  const i = YEARS.indexOf(year);
  return i >= 0 ? D[key][i] : null;
}

export function latestRef(key: MacroKey): { year: number; value: number; prev: number | null } {
  for (let i = YEARS.length - 1; i >= 0; i--) {
    const v = D[key][i];
    if (v !== null) return { year: YEARS[i], value: v, prev: i > 0 ? D[key][i - 1] : null };
  }
  return { year: YEARS[0], value: NaN, prev: null };
}

/** NBER-dated US recessions (month precision). */
export const RECESSIONS = [
  { from: Date.UTC(1990, 6, 1), to: Date.UTC(1991, 2, 1), label: "S&L" },
  { from: Date.UTC(2001, 2, 1), to: Date.UTC(2001, 10, 1), label: "DOT-COM" },
  { from: Date.UTC(2007, 11, 1), to: Date.UTC(2009, 5, 1), label: "GFC" },
  { from: Date.UTC(2020, 1, 1), to: Date.UTC(2020, 3, 1), label: "COVID" },
];

/** Approximate snapshots of the Treasury curve (%) at notable dates. */
export const CURVE_TENORS = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "7Y", "10Y", "20Y", "30Y"];
export const CURVE_YEARS = [1 / 12, 0.25, 0.5, 1, 2, 3, 5, 7, 10, 20, 30];
export const CURVE_SNAPSHOTS: { id: string; label: string; date: string; color: string; y: number[]; note: string }[] = [
  { id: "2006", label: "Jul 2006", date: "2006-07", color: "#9aa6bd", y: [4.95, 5.1, 5.22, 5.23, 5.12, 5.07, 5.03, 5.04, 5.07, 5.26, 5.13], note: "Flat/inverted curve ahead of the GFC" },
  { id: "2009", label: "Dec 2009", date: "2009-12", color: "#3dff9a", y: [0.03, 0.05, 0.2, 0.47, 1.14, 1.7, 2.69, 3.39, 3.85, 4.58, 4.64], note: "Steep curve: zero policy rate, recovery priced" },
  { id: "2019", label: "Aug 2019", date: "2019-08", color: "#ffb547", y: [2.1, 1.99, 1.89, 1.77, 1.5, 1.45, 1.42, 1.52, 1.6, 1.9, 2.05], note: "2s10s inversion prompted 'mid-cycle' cuts" },
  { id: "2020", label: "Dec 2020", date: "2020-12", color: "#4d8bff", y: [0.08, 0.09, 0.09, 0.1, 0.13, 0.17, 0.36, 0.65, 0.93, 1.45, 1.65], note: "Pandemic ZIRP + QE" },
  { id: "2023", label: "Jul 2023", date: "2023-07", color: "#ff3d64", y: [5.3, 5.43, 5.53, 5.37, 4.88, 4.53, 4.18, 4.07, 3.97, 4.2, 4.02], note: "Deepest inversion since 1981" },
  { id: "2025", label: "Dec 2025", date: "2025-12", color: "#35e7ff", y: [3.72, 3.66, 3.6, 3.5, 3.5, 3.55, 3.7, 3.92, 4.15, 4.75, 4.8], note: "Re-steepening as the Fed cut toward neutral" },
];

/**
 * Model-interpolated annual curve surface (Nelson–Siegel style fit through
 * fed funds (short end), 2Y and 10Y reference averages). Used for the 3D rate surface.
 * It is a MODEL view of the history, not observed tenor-by-tenor data.
 */
export function modeledCurve(year: number): number[] {
  const ff = refValue("fedfunds", year) ?? 0;
  const y2 = refValue("y2", year) ?? ff;
  const y10 = refValue("y10", year) ?? y2;
  const lambda = 1.6;
  const load = (m: number) => {
    const x = m / lambda;
    const l1 = (1 - Math.exp(-x)) / x;
    return [1, l1, l1 - Math.exp(-x)];
  };
  // solve β0, β1, β2 so the curve passes through (0.25, ff), (2, y2), (10, y10)
  const A = [load(0.25), load(2), load(10)];
  const b = [ff, y2, y10];
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D0 = det(A);
  const beta = [0, 1, 2].map((k) => det(A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)))) / D0);
  return CURVE_YEARS.map((m) => {
    const l = load(Math.max(m, 0.05));
    return Math.max(0, beta[0] * l[0] + beta[1] * l[1] + beta[2] * l[2]);
  });
}

export const ALL_MACRO_KEYS = Object.keys(MACRO_META) as MacroKey[];
