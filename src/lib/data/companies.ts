/**
 * Reference financial statements — APPROXIMATE figures in $B (EPS in $),
 * rounded from public annual reports (10-K). Bundled so the Company module
 * works offline. Labeled REF in the UI; verify against filings before use.
 * When SEC_USER_AGENT is configured the module can pull XBRL facts live
 * from SEC EDGAR for any US filer.
 */

export type FinYear = {
  fy: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  fcf: number;
  totalAssets: number;
  totalLiabilities: number;
  debt: number;
  cash: number;
  eps: number;
  shares: number; // diluted, billions
  da: number; // depreciation & amortization
  equity: number;
};

export type CompanyProfile = {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  hq: string;
  fyEnd: string;
  description: string;
  years: FinYear[];
  source: "REF" | "LIVE";
  notes?: string;
};

type Row = [fy: string, rev: number, gp: number, op: number, ni: number, fcf: number, assets: number, liab: number, debt: number, cash: number, eps: number, shares: number, da: number, equity: number];

function build(ticker: string, name: string, sector: string, industry: string, hq: string, fyEnd: string, description: string, rows: Row[], notes?: string): CompanyProfile {
  return {
    ticker,
    name,
    sector,
    industry,
    hq,
    fyEnd,
    description,
    notes,
    source: "REF",
    years: rows.map(([fy, revenue, grossProfit, operatingIncome, netIncome, fcf, totalAssets, totalLiabilities, debt, cash, eps, shares, da, equity]) => ({
      fy,
      revenue,
      grossProfit,
      operatingIncome,
      netIncome,
      fcf,
      totalAssets,
      totalLiabilities,
      debt,
      cash,
      eps,
      shares,
      da,
      equity,
    })),
  };
}

export const COMPANIES: CompanyProfile[] = [
  build("AAPL", "Apple Inc.", "Information Technology", "Consumer Electronics", "Cupertino, CA", "Late September", "Designs iPhone, Mac, iPad and wearables; monetizes a 2B+ device base through high-margin services.", [
    ["FY2020", 274.5, 105.0, 66.3, 57.4, 73.4, 323.9, 258.5, 112.4, 90.9, 3.28, 17.53, 11.1, 65.3],
    ["FY2021", 365.8, 152.8, 108.9, 94.7, 93.0, 351.0, 287.9, 124.7, 62.6, 5.61, 16.86, 11.3, 63.1],
    ["FY2022", 394.3, 170.8, 119.4, 99.8, 111.4, 352.8, 302.1, 120.1, 48.3, 6.11, 16.33, 11.1, 50.7],
    ["FY2023", 383.3, 169.1, 114.3, 97.0, 99.6, 352.6, 290.4, 111.1, 61.6, 6.13, 15.81, 11.5, 62.1],
    ["FY2024", 391.0, 180.7, 123.2, 93.7, 108.8, 365.0, 308.0, 106.6, 65.2, 6.08, 15.41, 11.4, 57.0],
  ], "FY2024 net income includes a ~$10B one-time EU State Aid tax charge."),
  build("MSFT", "Microsoft Corporation", "Information Technology", "Software & Cloud", "Redmond, WA", "June 30", "Azure cloud, Microsoft 365, Windows, LinkedIn, gaming (incl. Activision) and enterprise AI.", [
    ["FY2020", 143.0, 96.9, 53.0, 44.3, 45.2, 301.3, 183.0, 63.3, 136.5, 5.76, 7.68, 12.8, 118.3],
    ["FY2021", 168.1, 115.9, 69.9, 61.3, 56.1, 333.8, 191.8, 58.1, 130.3, 8.05, 7.61, 11.7, 142.0],
    ["FY2022", 198.3, 135.6, 83.4, 72.7, 65.1, 364.8, 198.3, 49.8, 104.8, 9.65, 7.54, 14.5, 166.5],
    ["FY2023", 211.9, 146.1, 88.5, 72.4, 59.5, 412.0, 205.8, 47.2, 111.3, 9.68, 7.47, 13.9, 206.2],
    ["FY2024", 245.1, 171.0, 109.4, 88.1, 74.1, 512.2, 243.7, 44.9, 75.5, 11.80, 7.47, 22.3, 268.5],
  ]),
  build("NVDA", "NVIDIA Corporation", "Information Technology", "Semiconductors", "Santa Clara, CA", "Late January", "GPUs, networking and software (CUDA) powering AI data centers, gaming and autonomous systems.", [
    ["FY2021", 16.7, 10.4, 4.5, 4.3, 4.7, 28.8, 11.9, 7.0, 11.6, 0.11, 25.2, 1.1, 16.9],
    ["FY2022", 26.9, 17.5, 10.0, 9.8, 8.1, 44.2, 17.6, 11.0, 21.2, 0.39, 25.4, 1.2, 26.6],
    ["FY2023", 27.0, 15.4, 4.2, 4.4, 3.8, 41.2, 19.1, 11.0, 13.3, 0.17, 25.1, 1.5, 22.1],
    ["FY2024", 60.9, 44.3, 33.0, 29.8, 27.0, 65.7, 23.0, 9.7, 26.0, 1.19, 24.9, 1.5, 43.0],
    ["FY2025", 130.5, 97.9, 81.5, 72.9, 60.9, 111.6, 32.3, 8.5, 43.2, 2.94, 24.8, 1.9, 79.3],
  ], "EPS and share counts adjusted for the 2021 (4:1) and 2024 (10:1) stock splits."),
  build("AMZN", "Amazon.com, Inc.", "Consumer Discretionary", "E-commerce & Cloud", "Seattle, WA", "December 31", "Online retail, third-party seller services, advertising, subscriptions and Amazon Web Services.", [
    ["FY2020", 386.1, 152.8, 22.9, 21.3, 31.0, 321.2, 227.8, 31.8, 84.4, 2.09, 10.3, 25.3, 93.4],
    ["FY2021", 469.8, 197.5, 24.9, 33.4, -9.1, 420.5, 282.3, 48.7, 96.0, 3.24, 10.3, 34.4, 138.2],
    ["FY2022", 514.0, 225.2, 12.2, -2.7, -11.6, 462.7, 316.6, 67.2, 70.0, -0.27, 10.2, 41.9, 146.0],
    ["FY2023", 574.8, 270.0, 36.9, 30.4, 36.8, 527.9, 326.0, 58.3, 86.8, 2.90, 10.5, 48.7, 201.9],
    ["FY2024", 638.0, 311.7, 68.6, 59.2, 38.2, 624.9, 338.9, 52.6, 101.2, 5.53, 10.7, 52.8, 286.0],
  ], "Per-share figures adjusted for the 2022 20:1 split. FY2022 net loss driven by Rivian mark-to-market."),
  build("GOOGL", "Alphabet Inc.", "Communication Services", "Internet Search & Cloud", "Mountain View, CA", "December 31", "Google Search, YouTube, Android, Google Cloud and Other Bets (Waymo).", [
    ["FY2020", 182.5, 97.8, 41.2, 40.3, 42.8, 319.6, 97.1, 14.0, 136.7, 2.93, 13.74, 13.7, 222.5],
    ["FY2021", 257.6, 146.7, 78.7, 76.0, 67.0, 359.3, 107.6, 14.8, 139.6, 5.61, 13.55, 12.4, 251.6],
    ["FY2022", 282.8, 156.6, 74.8, 60.0, 60.0, 365.3, 109.1, 14.7, 113.8, 4.56, 13.16, 15.9, 256.1],
    ["FY2023", 307.4, 174.1, 84.3, 73.8, 69.5, 402.4, 119.0, 13.3, 110.9, 5.80, 12.72, 11.9, 283.4],
    ["FY2024", 350.0, 203.7, 112.4, 100.1, 72.8, 450.3, 125.2, 10.9, 95.7, 8.04, 12.45, 15.3, 325.1],
  ], "Per-share figures adjusted for the 2022 20:1 split."),
  build("META", "Meta Platforms, Inc.", "Communication Services", "Social Media", "Menlo Park, CA", "December 31", "Facebook, Instagram, WhatsApp and Messenger; Reality Labs (AR/VR) and Llama AI models.", [
    ["FY2020", 86.0, 69.3, 32.7, 29.1, 23.6, 159.3, 31.0, 0.0, 62.0, 10.09, 2.89, 6.9, 128.3],
    ["FY2021", 117.9, 95.3, 46.8, 39.4, 39.1, 166.0, 41.1, 0.0, 48.0, 13.77, 2.86, 8.0, 124.9],
    ["FY2022", 116.6, 92.9, 28.9, 23.2, 19.0, 185.7, 60.0, 9.9, 40.7, 8.59, 2.70, 8.7, 125.7],
    ["FY2023", 134.9, 108.9, 46.8, 39.1, 43.0, 229.6, 76.5, 18.4, 65.4, 14.87, 2.63, 11.2, 153.2],
    ["FY2024", 164.5, 134.3, 69.4, 62.4, 52.1, 276.1, 93.4, 28.8, 77.8, 23.86, 2.61, 15.5, 182.6],
  ]),
  build("TSLA", "Tesla, Inc.", "Consumer Discretionary", "Automobiles & Energy", "Austin, TX", "December 31", "Electric vehicles, battery energy storage, charging network and autonomy software.", [
    ["FY2020", 31.5, 6.6, 2.0, 0.7, 2.8, 52.1, 28.4, 11.0, 19.4, 0.21, 3.25, 2.3, 22.2],
    ["FY2021", 53.8, 13.6, 6.5, 5.5, 5.0, 62.1, 30.5, 6.8, 17.7, 1.63, 3.39, 2.9, 30.2],
    ["FY2022", 81.5, 20.9, 13.7, 12.6, 7.6, 82.3, 36.4, 3.1, 22.2, 3.62, 3.48, 3.7, 44.7],
    ["FY2023", 96.8, 17.7, 8.9, 15.0, 4.4, 106.6, 43.0, 4.3, 29.1, 4.30, 3.49, 4.7, 62.6],
    ["FY2024", 97.7, 17.5, 7.1, 7.1, 3.6, 122.1, 48.4, 7.9, 36.6, 2.04, 3.50, 5.4, 72.9],
  ], "FY2023 net income includes a ~$5.9B deferred-tax valuation allowance release. Per-share data split-adjusted."),
  build("XOM", "Exxon Mobil Corporation", "Energy", "Integrated Oil & Gas", "Spring, TX", "December 31", "Upstream oil & gas, refining, chemicals and low-carbon solutions.", [
    ["FY2020", 181.5, 57.1, -28.9, -22.4, -2.6, 332.8, 168.6, 67.6, 4.4, -5.25, 4.27, 46.0, 157.2],
    ["FY2021", 285.6, 94.4, 30.8, 23.0, 36.1, 338.9, 163.2, 47.7, 6.8, 5.39, 4.28, 20.6, 168.6],
    ["FY2022", 413.7, 142.1, 77.8, 55.7, 62.1, 369.1, 166.6, 41.2, 29.6, 13.26, 4.20, 24.0, 195.0],
    ["FY2023", 344.6, 114.7, 52.8, 36.0, 36.1, 376.3, 163.8, 41.6, 31.6, 8.89, 4.05, 20.6, 204.8],
    ["FY2024", 349.6, 113.3, 47.4, 33.7, 30.7, 453.5, 182.9, 41.7, 23.2, 7.84, 4.30, 23.4, 263.7],
  ], "XOM does not report gross profit; shown as revenue less purchases & production costs. Operating income shown as pre-tax income. FY2020 includes large impairments."),
  build("WMT", "Walmart Inc.", "Consumer Staples", "Hypermarkets & Retail", "Bentonville, AR", "January 31", "Walmart U.S., Walmart International and Sam's Club; growing advertising and marketplace.", [
    ["FY2021", 559.2, 138.8, 22.5, 13.5, 25.8, 252.5, 164.0, 41.2, 17.7, 1.75, 8.53, 11.2, 81.3],
    ["FY2022", 572.8, 143.8, 25.9, 13.7, 11.1, 244.9, 153.0, 37.0, 14.8, 1.87, 8.37, 10.7, 83.3],
    ["FY2023", 611.3, 147.6, 20.4, 11.7, 12.0, 243.2, 159.4, 36.6, 8.6, 1.62, 8.17, 10.9, 76.7],
    ["FY2024", 648.1, 158.0, 27.0, 15.5, 15.1, 252.4, 161.8, 39.0, 9.9, 1.91, 8.10, 11.9, 83.9],
    ["FY2025", 681.0, 169.2, 29.3, 19.4, 12.7, 260.8, 163.1, 36.0, 9.0, 2.41, 8.07, 13.0, 91.0],
  ], "Per-share data adjusted for the 2024 3:1 split."),
  build("KO", "The Coca-Cola Company", "Consumer Staples", "Beverages", "Atlanta, GA", "December 31", "Concentrate and finished beverages sold through a global bottling system in 200+ countries.", [
    ["FY2020", 33.0, 19.6, 9.0, 7.7, 8.7, 87.3, 66.0, 42.8, 10.8, 1.79, 4.32, 1.5, 19.3],
    ["FY2021", 38.7, 23.3, 10.3, 9.8, 11.3, 94.4, 69.5, 40.6, 12.6, 2.25, 4.34, 1.45, 23.0],
    ["FY2022", 43.0, 25.0, 10.9, 9.5, 9.5, 92.8, 66.9, 39.1, 11.3, 2.19, 4.35, 1.26, 24.1],
    ["FY2023", 45.8, 27.2, 11.3, 10.7, 9.7, 97.7, 70.0, 42.1, 13.7, 2.47, 4.34, 1.13, 25.9],
    ["FY2024", 47.1, 28.7, 10.0, 10.6, 4.7, 100.5, 74.2, 44.8, 12.8, 2.46, 4.33, 1.08, 24.9],
  ], "FY2024 FCF reduced by a ~$6B IRS tax-litigation deposit and fairlife contingent payment."),
];

export const COMPANY_MAP: Record<string, CompanyProfile> = Object.fromEntries(COMPANIES.map((c) => [c.ticker, c]));

export type Derived = {
  grossMargin: number;
  opMargin: number;
  netMargin: number;
  fcfMargin: number;
  roe: number;
  roa: number;
  roic: number;
  debtToEquity: number;
  netDebt: number;
  assetTurnover: number;
  equityMultiplier: number;
  ebitda: number;
  revGrowth: number | null;
  niGrowth: number | null;
  epsGrowth: number | null;
};

export const ASSUMED_TAX = 0.18;

export function derive(y: FinYear, prev?: FinYear): Derived {
  const avgEq = prev ? (y.equity + prev.equity) / 2 : y.equity;
  const avgAssets = prev ? (y.totalAssets + prev.totalAssets) / 2 : y.totalAssets;
  const ic = y.equity + y.debt - y.cash;
  const g = (a: number, b?: number) => (b !== undefined && b !== 0 && b > 0 ? a / b - 1 : null);
  return {
    grossMargin: y.grossProfit / y.revenue,
    opMargin: y.operatingIncome / y.revenue,
    netMargin: y.netIncome / y.revenue,
    fcfMargin: y.fcf / y.revenue,
    roe: y.netIncome / avgEq,
    roa: y.netIncome / avgAssets,
    roic: ic > 0 ? (y.operatingIncome * (1 - ASSUMED_TAX)) / ic : NaN,
    debtToEquity: y.debt / y.equity,
    netDebt: y.debt - y.cash,
    assetTurnover: y.revenue / avgAssets,
    equityMultiplier: avgAssets / avgEq,
    ebitda: y.operatingIncome + y.da,
    revGrowth: g(y.revenue, prev?.revenue),
    niGrowth: g(y.netIncome, prev?.netIncome),
    epsGrowth: g(y.eps, prev?.eps),
  };
}

export function cagr(first: number, last: number, years: number): number | null {
  if (first <= 0 || last <= 0 || years <= 0) return null;
  return (last / first) ** (1 / years) - 1;
}
