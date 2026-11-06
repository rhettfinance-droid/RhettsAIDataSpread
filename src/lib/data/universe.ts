/**
 * NEXUS instrument universe.
 *
 * IMPORTANT: reference levels, market caps and prices below are ILLUSTRATIVE
 * inputs for the simulation engine — they are not quotes. Every value derived
 * from them is labeled SIMULATED in the UI. When FINNHUB_API_KEY is configured,
 * equities are overlaid with live quotes and labeled LIVE.
 */

export type AssetClass = "index" | "equity" | "fund" | "rate" | "fx" | "commodity" | "crypto" | "vol";

export const FACTORS = [
  "MKT",
  "GROWTH",
  "RATES",
  "COMMOD",
  "USD",
  "CRYPTO",
  "S_TECH",
  "S_COMM",
  "S_DISC",
  "S_STAP",
  "S_HLTH",
  "S_FIN",
  "S_INDU",
  "S_ENGY",
  "S_UTIL",
  "S_REIT",
  "S_MATL",
] as const;
export type Factor = (typeof FACTORS)[number];

export const SECTORS = [
  { id: "TECH", name: "Information Technology", factor: "S_TECH" },
  { id: "COMM", name: "Communication Services", factor: "S_COMM" },
  { id: "DISC", name: "Consumer Discretionary", factor: "S_DISC" },
  { id: "STAP", name: "Consumer Staples", factor: "S_STAP" },
  { id: "HLTH", name: "Health Care", factor: "S_HLTH" },
  { id: "FIN", name: "Financials", factor: "S_FIN" },
  { id: "INDU", name: "Industrials", factor: "S_INDU" },
  { id: "ENGY", name: "Energy", factor: "S_ENGY" },
  { id: "UTIL", name: "Utilities", factor: "S_UTIL" },
  { id: "REIT", name: "Real Estate", factor: "S_REIT" },
  { id: "MATL", name: "Materials", factor: "S_MATL" },
] as const;
export type SectorId = (typeof SECTORS)[number]["id"];

export type Instrument = {
  symbol: string;
  name: string;
  cls: AssetClass;
  /** "log" = geometric price, "level" = arithmetic (yields), "vix" = mean-reverting log level */
  kind: "log" | "level" | "vix";
  ref: number;
  /** total annualized volatility (log kinds) or absolute pp/yr (level) */
  vol: number;
  loadings: Partial<Record<Factor, number>>;
  sector?: SectorId;
  region?: "US" | "EU" | "JP" | "CN" | "EM" | "GLOBAL" | "UK";
  mcap?: number; // $B, illustrative
  unit?: string;
  decimals?: number;
  /** annual drift used for generating simulated history */
  drift?: number;
  group?: string;
};

const SECTOR_PROFILE: Record<SectorId, { vol: number; mkt: number; growth: number; rates: number; commod: number }> = {
  TECH: { vol: 0.32, mkt: 0.62, growth: 0.42, rates: -0.12, commod: 0 },
  COMM: { vol: 0.28, mkt: 0.6, growth: 0.3, rates: -0.08, commod: 0 },
  DISC: { vol: 0.32, mkt: 0.62, growth: 0.25, rates: -0.08, commod: 0 },
  STAP: { vol: 0.17, mkt: 0.42, growth: -0.22, rates: -0.1, commod: 0 },
  HLTH: { vol: 0.22, mkt: 0.45, growth: -0.05, rates: -0.05, commod: 0 },
  FIN: { vol: 0.24, mkt: 0.62, growth: -0.12, rates: 0.22, commod: 0.05 },
  INDU: { vol: 0.24, mkt: 0.62, growth: -0.05, rates: 0.05, commod: 0.15 },
  ENGY: { vol: 0.3, mkt: 0.42, growth: -0.25, rates: 0.12, commod: 0.55 },
  UTIL: { vol: 0.19, mkt: 0.38, growth: -0.2, rates: -0.35, commod: 0 },
  REIT: { vol: 0.23, mkt: 0.48, growth: -0.1, rates: -0.38, commod: 0 },
  MATL: { vol: 0.26, mkt: 0.55, growth: -0.1, rates: 0.05, commod: 0.38 },
};

type EqDef = [symbol: string, name: string, sector: SectorId, price: number, mcap: number, volMul?: number];

const EQUITIES: EqDef[] = [
  ["NVDA", "NVIDIA Corp", "TECH", 186, 4520, 1.5],
  ["AAPL", "Apple Inc", "TECH", 262, 3880, 0.85],
  ["MSFT", "Microsoft Corp", "TECH", 505, 3750, 0.8],
  ["AVGO", "Broadcom Inc", "TECH", 342, 1610, 1.3],
  ["ORCL", "Oracle Corp", "TECH", 232, 655, 1.3],
  ["AMD", "Advanced Micro Devices", "TECH", 236, 382, 1.5],
  ["CRM", "Salesforce Inc", "TECH", 246, 236, 1.05],
  ["CSCO", "Cisco Systems", "TECH", 69, 274, 0.75],
  ["IBM", "IBM Corp", "TECH", 298, 278, 0.85],
  ["MU", "Micron Technology", "TECH", 182, 204, 1.6],
  ["QCOM", "Qualcomm Inc", "TECH", 166, 181, 1.1],
  ["TXN", "Texas Instruments", "TECH", 172, 157, 0.95],
  ["NOW", "ServiceNow Inc", "TECH", 905, 188, 1.1],
  ["ADBE", "Adobe Inc", "TECH", 348, 148, 1.0],
  ["INTC", "Intel Corp", "TECH", 38, 168, 1.4],
  ["GOOGL", "Alphabet Inc", "COMM", 282, 3410, 1.0],
  ["META", "Meta Platforms", "COMM", 642, 1615, 1.2],
  ["NFLX", "Netflix Inc", "COMM", 112, 478, 1.15],
  ["TMUS", "T-Mobile US", "COMM", 231, 262, 0.7],
  ["DIS", "Walt Disney Co", "COMM", 112, 202, 0.95],
  ["T", "AT&T Inc", "COMM", 27, 194, 0.65],
  ["VZ", "Verizon", "COMM", 41, 173, 0.6],
  ["AMZN", "Amazon.com Inc", "DISC", 226, 2410, 1.0],
  ["TSLA", "Tesla Inc", "DISC", 432, 1430, 1.9],
  ["HD", "Home Depot", "DISC", 381, 379, 0.75],
  ["MCD", "McDonald's Corp", "DISC", 301, 215, 0.6],
  ["BKNG", "Booking Holdings", "DISC", 5210, 171, 0.9],
  ["LOW", "Lowe's Cos", "DISC", 251, 141, 0.8],
  ["SBUX", "Starbucks", "DISC", 86, 98, 0.95],
  ["NKE", "Nike Inc", "DISC", 64, 95, 1.0],
  ["WMT", "Walmart Inc", "STAP", 103, 825, 0.95],
  ["COST", "Costco Wholesale", "STAP", 905, 401, 1.0],
  ["PG", "Procter & Gamble", "STAP", 151, 355, 0.9],
  ["KO", "Coca-Cola Co", "STAP", 70, 301, 0.85],
  ["PM", "Philip Morris Intl", "STAP", 154, 240, 1.1],
  ["PEP", "PepsiCo Inc", "STAP", 146, 200, 0.9],
  ["LLY", "Eli Lilly", "HLTH", 948, 898, 1.35],
  ["JNJ", "Johnson & Johnson", "HLTH", 191, 460, 0.8],
  ["ABBV", "AbbVie Inc", "HLTH", 226, 399, 1.0],
  ["UNH", "UnitedHealth Group", "HLTH", 332, 301, 1.3],
  ["MRK", "Merck & Co", "HLTH", 91, 228, 1.0],
  ["TMO", "Thermo Fisher", "HLTH", 541, 204, 0.95],
  ["ISRG", "Intuitive Surgical", "HLTH", 538, 193, 1.2],
  ["PFE", "Pfizer Inc", "HLTH", 25, 142, 0.95],
  ["BRK.B", "Berkshire Hathaway", "FIN", 492, 1060, 0.65],
  ["JPM", "JPMorgan Chase", "FIN", 306, 845, 0.9],
  ["V", "Visa Inc", "FIN", 346, 655, 0.75],
  ["MA", "Mastercard", "FIN", 571, 522, 0.8],
  ["BAC", "Bank of America", "FIN", 52, 384, 1.05],
  ["WFC", "Wells Fargo", "FIN", 85, 272, 1.05],
  ["MS", "Morgan Stanley", "FIN", 161, 256, 1.1],
  ["GS", "Goldman Sachs", "FIN", 782, 240, 1.1],
  ["BLK", "BlackRock Inc", "FIN", 1105, 171, 1.0],
  ["SCHW", "Charles Schwab", "FIN", 95, 169, 1.1],
  ["GE", "GE Aerospace", "INDU", 301, 318, 1.05],
  ["CAT", "Caterpillar", "INDU", 561, 265, 1.1],
  ["RTX", "RTX Corp", "INDU", 171, 229, 0.8],
  ["BA", "Boeing Co", "INDU", 212, 161, 1.35],
  ["UNP", "Union Pacific", "INDU", 231, 138, 0.85],
  ["HON", "Honeywell", "INDU", 206, 131, 0.8],
  ["DE", "Deere & Co", "INDU", 471, 128, 0.95],
  ["LMT", "Lockheed Martin", "INDU", 481, 112, 0.8],
  ["XOM", "Exxon Mobil", "ENGY", 116, 489, 0.85],
  ["CVX", "Chevron Corp", "ENGY", 155, 298, 0.9],
  ["COP", "ConocoPhillips", "ENGY", 90, 114, 1.05],
  ["SLB", "SLB Ltd", "ENGY", 35, 48, 1.2],
  ["NEE", "NextEra Energy", "UTIL", 82, 168, 1.15],
  ["SO", "Southern Co", "UTIL", 92, 101, 0.85],
  ["DUK", "Duke Energy", "UTIL", 121, 94, 0.8],
  ["PLD", "Prologis Inc", "REIT", 126, 117, 1.05],
  ["AMT", "American Tower", "REIT", 186, 87, 1.0],
  ["EQIX", "Equinix Inc", "REIT", 792, 77, 0.95],
  ["LIN", "Linde plc", "MATL", 452, 213, 0.7],
  ["SHW", "Sherwin-Williams", "MATL", 341, 85, 0.9],
  ["FCX", "Freeport-McMoRan", "MATL", 42, 60, 1.5],
];

function normalizeLoadings(l: Partial<Record<Factor, number>>, cap = 0.94) {
  const ss = Object.values(l).reduce((s, v) => s + (v ?? 0) ** 2, 0);
  if (ss <= cap) return l;
  const k = Math.sqrt(cap / ss);
  const out: Partial<Record<Factor, number>> = {};
  for (const [f, v] of Object.entries(l)) out[f as Factor] = (v ?? 0) * k;
  return out;
}

const equityInstruments: Instrument[] = EQUITIES.map(([symbol, name, sector, price, mcap, volMul = 1]) => {
  const p = SECTOR_PROFILE[sector];
  const sf = SECTORS_BY_ID()[sector].factor as Factor;
  const vol = p.vol * volMul;
  // high-vol names carry relatively more idiosyncratic risk
  const sys = Math.min(1, 1.05 / Math.sqrt(volMul));
  return {
    symbol,
    name,
    cls: "equity",
    kind: "log",
    ref: price,
    vol,
    sector,
    region: "US",
    mcap,
    drift: 0.08 + (volMul - 1) * 0.06,
    loadings: normalizeLoadings({
      MKT: p.mkt * sys,
      GROWTH: p.growth * sys,
      RATES: p.rates * sys,
      COMMOD: p.commod * sys,
      [sf]: 0.42 * sys,
    }),
  } satisfies Instrument;
});

function SECTORS_BY_ID() {
  return Object.fromEntries(SECTORS.map((s) => [s.id, s])) as Record<SectorId, (typeof SECTORS)[number]>;
}

const MACRO_INSTRUMENTS: Instrument[] = [
  { symbol: "SPX", name: "S&P 500", cls: "index", kind: "log", ref: 6862, vol: 0.16, loadings: { MKT: 0.97, GROWTH: 0.12 }, group: "Equity Index", decimals: 2, drift: 0.09 },
  { symbol: "NDX", name: "Nasdaq 100", cls: "index", kind: "log", ref: 25240, vol: 0.21, loadings: { MKT: 0.86, GROWTH: 0.42, RATES: -0.08 }, group: "Equity Index", drift: 0.12 },
  { symbol: "DJI", name: "Dow Jones Industrial", cls: "index", kind: "log", ref: 47620, vol: 0.15, loadings: { MKT: 0.93, GROWTH: -0.18, COMMOD: 0.08 }, group: "Equity Index", drift: 0.07 },
  { symbol: "RUT", name: "Russell 2000", cls: "index", kind: "log", ref: 2461, vol: 0.22, loadings: { MKT: 0.86, RATES: -0.22, GROWTH: 0.05 }, group: "Equity Index", drift: 0.06 },
  { symbol: "VIX", name: "CBOE Volatility Index", cls: "vol", kind: "vix", ref: 16.4, vol: 1.1, loadings: { MKT: -0.8 }, group: "Volatility", decimals: 2 },
  { symbol: "US02Y", name: "US Treasury 2Y Yield", cls: "rate", kind: "level", ref: 3.54, vol: 0.95, loadings: { RATES: 0.82, MKT: 0.12 }, unit: "%", group: "Rates", decimals: 3 },
  { symbol: "US10Y", name: "US Treasury 10Y Yield", cls: "rate", kind: "level", ref: 4.11, vol: 0.85, loadings: { RATES: 0.9, MKT: 0.15 }, unit: "%", group: "Rates", decimals: 3 },
  { symbol: "US30Y", name: "US Treasury 30Y Yield", cls: "rate", kind: "level", ref: 4.71, vol: 0.78, loadings: { RATES: 0.86, MKT: 0.1 }, unit: "%", group: "Rates", decimals: 3 },
  { symbol: "DXY", name: "US Dollar Index", cls: "fx", kind: "log", ref: 99.4, vol: 0.075, loadings: { USD: 0.95 }, group: "FX", decimals: 2 },
  { symbol: "EURUSD", name: "Euro / US Dollar", cls: "fx", kind: "log", ref: 1.162, vol: 0.075, loadings: { USD: -0.88 }, group: "FX", decimals: 4 },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", cls: "fx", kind: "log", ref: 1.318, vol: 0.08, loadings: { USD: -0.72, MKT: 0.1 }, group: "FX", decimals: 4 },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", cls: "fx", kind: "log", ref: 152.4, vol: 0.1, loadings: { USD: 0.55, RATES: 0.35 }, group: "FX", decimals: 2 },
  { symbol: "USDCNH", name: "US Dollar / Offshore Yuan", cls: "fx", kind: "log", ref: 7.118, vol: 0.04, loadings: { USD: 0.55 }, group: "FX", decimals: 4 },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", cls: "fx", kind: "log", ref: 0.655, vol: 0.1, loadings: { USD: -0.6, MKT: 0.3, COMMOD: 0.22 }, group: "FX", decimals: 4 },
  { symbol: "USDCHF", name: "US Dollar / Swiss Franc", cls: "fx", kind: "log", ref: 0.801, vol: 0.08, loadings: { USD: 0.8 }, group: "FX", decimals: 4 },
  { symbol: "GOLD", name: "Gold Spot (USD/oz)", cls: "commodity", kind: "log", ref: 4052, vol: 0.17, loadings: { USD: -0.38, RATES: -0.28, MKT: 0.05 }, group: "Commodities", drift: 0.1 },
  { symbol: "SILVER", name: "Silver Spot (USD/oz)", cls: "commodity", kind: "log", ref: 48.6, vol: 0.3, loadings: { USD: -0.32, RATES: -0.2, COMMOD: 0.3, MKT: 0.12 }, group: "Commodities", drift: 0.1 },
  { symbol: "WTI", name: "WTI Crude Oil", cls: "commodity", kind: "log", ref: 61.8, vol: 0.36, loadings: { COMMOD: 0.86, MKT: 0.18 }, group: "Commodities", drift: -0.02 },
  { symbol: "BRENT", name: "Brent Crude Oil", cls: "commodity", kind: "log", ref: 65.7, vol: 0.33, loadings: { COMMOD: 0.9, MKT: 0.16 }, group: "Commodities", drift: -0.02 },
  { symbol: "NATGAS", name: "Henry Hub Natural Gas", cls: "commodity", kind: "log", ref: 3.84, vol: 0.6, loadings: { COMMOD: 0.32 }, group: "Commodities", decimals: 3 },
  { symbol: "COPPER", name: "COMEX Copper (USD/lb)", cls: "commodity", kind: "log", ref: 5.02, vol: 0.24, loadings: { COMMOD: 0.5, MKT: 0.35, USD: -0.2 }, group: "Commodities", decimals: 3 },
  { symbol: "IEF", name: "US Treasury 7-10Y (fund)", cls: "fund", kind: "log", ref: 96.2, vol: 0.07, loadings: { RATES: -0.92, MKT: -0.12 }, group: "Funds", region: "US", drift: 0.035 },
  { symbol: "AGG", name: "US Aggregate Bond (fund)", cls: "fund", kind: "log", ref: 99.8, vol: 0.055, loadings: { RATES: -0.88, MKT: 0.05 }, group: "Funds", region: "US", drift: 0.04 },
  { symbol: "TIP", name: "US TIPS (fund)", cls: "fund", kind: "log", ref: 110.4, vol: 0.06, loadings: { RATES: -0.7, COMMOD: 0.2 }, group: "Funds", region: "US", drift: 0.035 },
  { symbol: "HYG", name: "US High Yield Credit (fund)", cls: "fund", kind: "log", ref: 80.6, vol: 0.08, loadings: { MKT: 0.6, RATES: -0.35 }, group: "Funds", region: "US", drift: 0.055 },
  { symbol: "EFA", name: "Intl Developed Equity (fund)", cls: "fund", kind: "log", ref: 93.5, vol: 0.16, loadings: { MKT: 0.82, USD: -0.35 }, group: "Funds", region: "EU", drift: 0.07 },
  { symbol: "EEM", name: "Emerging Markets Equity (fund)", cls: "fund", kind: "log", ref: 53.1, vol: 0.2, loadings: { MKT: 0.72, USD: -0.42, COMMOD: 0.2 }, group: "Funds", region: "EM", drift: 0.07 },
  { symbol: "VNQ", name: "US REITs (fund)", cls: "fund", kind: "log", ref: 91.4, vol: 0.2, loadings: { MKT: 0.6, RATES: -0.5, S_REIT: 0.4 }, group: "Funds", region: "US", drift: 0.06 },
  { symbol: "BTC", name: "Bitcoin / USD", cls: "crypto", kind: "log", ref: 98400, vol: 0.55, loadings: { CRYPTO: 0.86, MKT: 0.3 }, group: "Digital Assets", drift: 0.25 },
  { symbol: "ETH", name: "Ether / USD", cls: "crypto", kind: "log", ref: 3410, vol: 0.72, loadings: { CRYPTO: 0.84, MKT: 0.3 }, group: "Digital Assets", drift: 0.2 },
];

export const INSTRUMENTS: Instrument[] = [...MACRO_INSTRUMENTS, ...equityInstruments];
export const INSTRUMENT_MAP: Record<string, Instrument> = Object.fromEntries(INSTRUMENTS.map((i) => [i.symbol, i]));
export const EQUITY_SYMBOLS = equityInstruments.map((i) => i.symbol);

export const TICKER_SYMBOLS = [
  "SPX", "NDX", "DJI", "RUT", "VIX", "US10Y", "US02Y", "DXY", "EURUSD", "USDJPY", "GBPUSD",
  "GOLD", "WTI", "BRENT", "COPPER", "BTC", "ETH", "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "JPM", "XOM", "LLY",
];

export const SECTOR_NAME: Record<SectorId, string> = Object.fromEntries(SECTORS.map((s) => [s.id, s.name])) as Record<SectorId, string>;
