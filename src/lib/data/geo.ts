/**
 * Country & geography reference data for the Global Economic Map.
 * Indicators are APPROXIMATE 2024 values (IMF WEO / national sources, rounded);
 * policy rates are approximate end-2024 levels. Labeled REF in the UI.
 */

export type CountryRef = {
  id: string; // ISO 3166 numeric (matches world-atlas)
  name: string;
  iso: string;
  gdp: number; // $T nominal
  growth: number; // real GDP %
  inflation: number; // CPI %
  rate: number; // policy rate %
  unemp: number; // %
  debt: number; // gov debt % GDP
  ccy: string;
  cb: string;
  exchange: string;
  region: string;
};

type Row = [id: string, name: string, iso: string, gdp: number, growth: number, inflation: number, rate: number, unemp: number, debt: number, ccy: string, cb: string, exchange: string, region: string];

const ROWS: Row[] = [
  ["840", "United States", "USA", 29.2, 2.8, 2.9, 4.5, 4.0, 121, "USD", "Federal Reserve", "NYSE / Nasdaq", "North America"],
  ["156", "China", "CHN", 18.7, 5.0, 0.2, 3.1, 5.1, 88, "CNY", "People's Bank of China", "SSE / SZSE", "Greater China"],
  ["276", "Germany", "DEU", 4.7, -0.2, 2.5, 3.0, 3.4, 63, "EUR", "ECB / Bundesbank", "Deutsche Börse", "Europe"],
  ["392", "Japan", "JPN", 4.0, 0.1, 2.7, 0.25, 2.5, 237, "JPY", "Bank of Japan", "Japan Exchange Group", "East Asia"],
  ["356", "India", "IND", 3.9, 6.5, 4.9, 6.5, 4.9, 83, "INR", "Reserve Bank of India", "NSE / BSE", "South Asia"],
  ["826", "United Kingdom", "GBR", 3.6, 1.1, 2.5, 4.75, 4.3, 101, "GBP", "Bank of England", "London Stock Exchange", "Europe"],
  ["250", "France", "FRA", 3.2, 1.1, 2.3, 3.0, 7.4, 113, "EUR", "ECB / Banque de France", "Euronext Paris", "Europe"],
  ["380", "Italy", "ITA", 2.4, 0.7, 1.1, 3.0, 6.5, 135, "EUR", "ECB / Banca d'Italia", "Borsa Italiana", "Europe"],
  ["124", "Canada", "CAN", 2.2, 1.5, 2.4, 3.25, 6.4, 107, "CAD", "Bank of Canada", "Toronto Stock Exchange", "North America"],
  ["076", "Brazil", "BRA", 2.2, 3.4, 4.4, 12.25, 6.6, 87, "BRL", "Banco Central do Brasil", "B3", "Latin America"],
  ["643", "Russia", "RUS", 2.2, 4.1, 8.4, 21.0, 2.5, 20, "RUB", "Bank of Russia", "Moscow Exchange", "Europe / Asia"],
  ["410", "South Korea", "KOR", 1.9, 2.0, 2.3, 3.0, 2.8, 53, "KRW", "Bank of Korea", "Korea Exchange", "East Asia"],
  ["036", "Australia", "AUS", 1.8, 1.0, 3.2, 4.35, 4.0, 50, "AUD", "Reserve Bank of Australia", "ASX", "Oceania"],
  ["484", "Mexico", "MEX", 1.85, 1.2, 4.7, 10.0, 2.7, 58, "MXN", "Banco de México", "BMV", "North America"],
  ["724", "Spain", "ESP", 1.7, 3.2, 2.8, 3.0, 11.3, 102, "EUR", "ECB / Banco de España", "BME", "Europe"],
  ["360", "Indonesia", "IDN", 1.4, 5.0, 2.3, 6.0, 4.9, 40, "IDR", "Bank Indonesia", "IDX", "South Asia"],
  ["528", "Netherlands", "NLD", 1.2, 0.9, 3.2, 3.0, 3.7, 44, "EUR", "ECB / DNB", "Euronext Amsterdam", "Europe"],
  ["682", "Saudi Arabia", "SAU", 1.1, 1.3, 1.7, 5.0, 3.5, 29, "SAR", "Saudi Central Bank", "Tadawul", "Middle East"],
  ["792", "Türkiye", "TUR", 1.3, 3.2, 58.5, 47.5, 8.7, 25, "TRY", "Central Bank of Türkiye", "Borsa Istanbul", "Middle East"],
  ["756", "Switzerland", "CHE", 0.94, 1.3, 1.1, 0.5, 2.4, 38, "CHF", "Swiss National Bank", "SIX Swiss Exchange", "Europe"],
  ["616", "Poland", "POL", 0.86, 2.9, 3.7, 5.75, 2.9, 55, "PLN", "National Bank of Poland", "Warsaw SE", "Europe"],
  ["032", "Argentina", "ARG", 0.6, -1.3, 219.9, 32.0, 7.2, 85, "ARS", "BCRA", "BYMA", "Latin America"],
  ["752", "Sweden", "SWE", 0.6, 1.0, 2.8, 2.5, 8.4, 34, "SEK", "Riksbank", "Nasdaq Stockholm", "Europe"],
  ["376", "Israel", "ISR", 0.54, 1.0, 3.1, 4.5, 3.0, 69, "ILS", "Bank of Israel", "Tel Aviv SE", "Middle East"],
  ["784", "United Arab Emirates", "ARE", 0.54, 3.8, 1.7, 4.4, 2.8, 30, "AED", "CBUAE", "ADX / DFM", "Middle East"],
  ["764", "Thailand", "THA", 0.53, 2.5, 0.4, 2.25, 1.0, 63, "THB", "Bank of Thailand", "SET", "South Asia"],
  ["578", "Norway", "NOR", 0.48, 2.1, 3.1, 4.5, 4.0, 43, "NOK", "Norges Bank", "Oslo Børs", "Europe"],
  ["704", "Vietnam", "VNM", 0.48, 7.1, 3.6, 4.5, 2.2, 34, "VND", "State Bank of Vietnam", "HOSE", "South Asia"],
  ["608", "Philippines", "PHL", 0.46, 5.7, 3.2, 5.75, 3.8, 61, "PHP", "Bangko Sentral", "PSE", "South Asia"],
  ["458", "Malaysia", "MYS", 0.42, 5.1, 1.8, 3.0, 3.2, 69, "MYR", "Bank Negara Malaysia", "Bursa Malaysia", "South Asia"],
  ["710", "South Africa", "ZAF", 0.4, 0.6, 4.4, 7.75, 32.1, 75, "ZAR", "South African Reserve Bank", "JSE", "Africa"],
  ["818", "Egypt", "EGY", 0.39, 2.4, 28.3, 27.25, 6.6, 90, "EGP", "Central Bank of Egypt", "EGX", "Africa"],
  ["152", "Chile", "CHL", 0.33, 2.6, 3.9, 5.0, 8.5, 41, "CLP", "Banco Central de Chile", "Santiago SE", "Latin America"],
  ["566", "Nigeria", "NGA", 0.25, 3.4, 33.2, 27.5, 5.0, 52, "NGN", "Central Bank of Nigeria", "NGX", "Africa"],
];

export const COUNTRIES: Record<string, CountryRef> = Object.fromEntries(
  ROWS.map(([id, name, iso, gdp, growth, inflation, rate, unemp, debt, ccy, cb, exchange, region]) => [id, { id, name, iso, gdp, growth, inflation, rate, unemp, debt, ccy, cb, exchange, region }]),
);

export type MetricKey = "gdp" | "growth" | "inflation" | "rate" | "realRate" | "unemp" | "debt";
export const GEO_METRICS: { id: MetricKey; label: string; unit: string; domain: [number, number]; diverging?: boolean; get: (c: CountryRef) => number }[] = [
  { id: "gdp", label: "GDP size", unit: "$T", domain: [0, 6], get: (c) => c.gdp },
  { id: "growth", label: "Real GDP growth", unit: "%", domain: [-2, 7], diverging: true, get: (c) => c.growth },
  { id: "inflation", label: "Inflation", unit: "%", domain: [0, 10], get: (c) => c.inflation },
  { id: "rate", label: "Policy rate", unit: "%", domain: [0, 12], get: (c) => c.rate },
  { id: "realRate", label: "Real policy rate", unit: "pp", domain: [-4, 6], diverging: true, get: (c) => c.rate - c.inflation },
  { id: "unemp", label: "Unemployment", unit: "%", domain: [0, 12], get: (c) => c.unemp },
  { id: "debt", label: "Gov. debt / GDP", unit: "%", domain: [20, 160], get: (c) => c.debt },
];

export type Center = { id: string; name: string; lat: number; lon: number; kind: ("center" | "exchange" | "cb")[]; exchange?: string; cb?: string; note: string; tier: 1 | 2 | 3 };

export const CENTERS: Center[] = [
  { id: "nyc", name: "New York", lat: 40.71, lon: -74.0, kind: ["center", "exchange"], exchange: "NYSE · Nasdaq", cb: "NY Fed (markets desk)", note: "World's #1 financial center; deepest equity & funding markets", tier: 1 },
  { id: "ldn", name: "London", lat: 51.51, lon: -0.13, kind: ["center", "exchange", "cb"], exchange: "LSE", cb: "Bank of England", note: "Largest FX & interest-rate derivatives hub", tier: 1 },
  { id: "hkg", name: "Hong Kong", lat: 22.32, lon: 114.17, kind: ["center", "exchange"], exchange: "HKEX", cb: "HKMA", note: "Gateway between China and global capital", tier: 1 },
  { id: "sin", name: "Singapore", lat: 1.35, lon: 103.82, kind: ["center", "exchange", "cb"], exchange: "SGX", cb: "MAS", note: "Asian FX and wealth-management hub", tier: 1 },
  { id: "tyo", name: "Tokyo", lat: 35.68, lon: 139.69, kind: ["center", "exchange", "cb"], exchange: "JPX", cb: "Bank of Japan", note: "Home of the largest creditor nation's capital", tier: 1 },
  { id: "sha", name: "Shanghai", lat: 31.23, lon: 121.47, kind: ["center", "exchange"], exchange: "SSE", note: "Mainland China's financial capital", tier: 1 },
  { id: "fra", name: "Frankfurt", lat: 50.11, lon: 8.68, kind: ["center", "exchange", "cb"], exchange: "Deutsche Börse", cb: "European Central Bank", note: "Euro-area policy and clearing center", tier: 2 },
  { id: "par", name: "Paris", lat: 48.86, lon: 2.35, kind: ["center", "exchange"], exchange: "Euronext", note: "Pan-European exchange group HQ", tier: 2 },
  { id: "zrh", name: "Zurich", lat: 47.37, lon: 8.54, kind: ["center", "exchange", "cb"], exchange: "SIX", cb: "Swiss National Bank", note: "Private banking & safe-haven currency", tier: 2 },
  { id: "chi", name: "Chicago", lat: 41.88, lon: -87.63, kind: ["center", "exchange"], exchange: "CME Group · Cboe", note: "Global derivatives & commodity futures", tier: 2 },
  { id: "sfo", name: "San Francisco", lat: 37.77, lon: -122.42, kind: ["center"], note: "Venture capital & technology capital formation", tier: 2 },
  { id: "dc", name: "Washington, D.C.", lat: 38.9, lon: -77.04, kind: ["cb"], cb: "Federal Reserve Board · IMF · World Bank", note: "Global monetary & multilateral policy", tier: 1 },
  { id: "pek", name: "Beijing", lat: 39.9, lon: 116.4, kind: ["cb"], cb: "People's Bank of China", note: "Chinese monetary policy & state finance", tier: 2 },
  { id: "sel", name: "Seoul", lat: 37.57, lon: 126.98, kind: ["center", "exchange", "cb"], exchange: "KRX", cb: "Bank of Korea", note: "Semiconductor-heavy equity market", tier: 3 },
  { id: "syd", name: "Sydney", lat: -33.87, lon: 151.21, kind: ["center", "exchange", "cb"], exchange: "ASX", cb: "Reserve Bank of Australia", note: "Superannuation capital pool", tier: 3 },
  { id: "tor", name: "Toronto", lat: 43.65, lon: -79.38, kind: ["center", "exchange"], exchange: "TSX", note: "Mining & energy listings hub", tier: 3 },
  { id: "bom", name: "Mumbai", lat: 19.08, lon: 72.88, kind: ["center", "exchange", "cb"], exchange: "NSE · BSE", cb: "Reserve Bank of India", note: "World's largest derivatives exchange by contracts", tier: 2 },
  { id: "dxb", name: "Dubai", lat: 25.2, lon: 55.27, kind: ["center"], note: "DIFC — Gulf wealth & commodity trading", tier: 3 },
  { id: "ruh", name: "Riyadh", lat: 24.71, lon: 46.68, kind: ["exchange", "cb"], exchange: "Tadawul", cb: "SAMA", note: "Aramco, PIF and Gulf capital", tier: 3 },
  { id: "sao", name: "São Paulo", lat: -23.55, lon: -46.63, kind: ["center", "exchange"], exchange: "B3", note: "Latin America's largest exchange", tier: 3 },
  { id: "jnb", name: "Johannesburg", lat: -26.2, lon: 28.05, kind: ["center", "exchange"], exchange: "JSE", note: "Africa's deepest capital market", tier: 3 },
  { id: "szx", name: "Shenzhen", lat: 22.54, lon: 114.06, kind: ["exchange"], exchange: "SZSE", note: "Growth & tech board (ChiNext)", tier: 3 },
];

export type Route = { a: [number, number]; b: [number, number]; label: string; v: number };

/** Major bilateral goods-trade corridors, approx. annual value ($B, ~2024). */
export const ROUTES: Route[] = [
  { a: [38, -97], b: [35, 105], label: "US ↔ China", v: 580 },
  { a: [38, -97], b: [23.6, -102.5], label: "US ↔ Mexico", v: 800 },
  { a: [38, -97], b: [56, -106], label: "US ↔ Canada", v: 760 },
  { a: [38, -97], b: [51, 10], label: "US ↔ EU", v: 975 },
  { a: [38, -97], b: [36, 138], label: "US ↔ Japan", v: 230 },
  { a: [38, -97], b: [36.5, 127.8], label: "US ↔ Korea", v: 190 },
  { a: [38, -97], b: [21, 78], label: "US ↔ India", v: 130 },
  { a: [38, -97], b: [54, -2], label: "US ↔ UK", v: 150 },
  { a: [38, -97], b: [14, 108], label: "US ↔ Vietnam", v: 150 },
  { a: [35, 105], b: [51, 10], label: "China ↔ EU", v: 800 },
  { a: [35, 105], b: [36, 138], label: "China ↔ Japan", v: 300 },
  { a: [35, 105], b: [36.5, 127.8], label: "China ↔ Korea", v: 330 },
  { a: [35, 105], b: [-25, 134], label: "China ↔ Australia", v: 230 },
  { a: [35, 105], b: [-10, -52], label: "China ↔ Brazil", v: 160 },
  { a: [35, 105], b: [61, 90], label: "China ↔ Russia", v: 240 },
  { a: [35, 105], b: [14, 108], label: "China ↔ Vietnam", v: 260 },
  { a: [35, 105], b: [24, 45], label: "China ↔ Saudi Arabia", v: 110 },
  { a: [35, 105], b: [21, 78], label: "China ↔ India", v: 120 },
  { a: [35, 105], b: [1.35, 103.8], label: "China ↔ Singapore/ASEAN", v: 200 },
  { a: [51, 10], b: [54, -2], label: "EU ↔ UK", v: 700 },
  { a: [51, 10], b: [47, 8], label: "EU ↔ Switzerland", v: 300 },
  { a: [24, 45], b: [21, 78], label: "Saudi Arabia ↔ India", v: 45 },
  { a: [24, 45], b: [36, 138], label: "Gulf ↔ Japan (energy)", v: 80 },
  { a: [-25, 134], b: [36, 138], label: "Australia ↔ Japan", v: 75 },
  { a: [51, 10], b: [-10, -52], label: "EU ↔ Mercosur", v: 110 },
];

export type Producer = { lat: number; lon: number; commodity: "Oil" | "LNG" | "Copper" | "Iron ore" | "Lithium" | "Gold" | "Soybeans"; label: string; share: number };

export const COMMODITY_COLORS: Record<Producer["commodity"], string> = {
  Oil: "#ff9f43",
  LNG: "#ffd166",
  Copper: "#ff6b3d",
  "Iron ore": "#c97b5a",
  Lithium: "#3dff9a",
  Gold: "#ffe066",
  Soybeans: "#a3e635",
};

export const PRODUCERS: Producer[] = [
  { lat: 31.5, lon: -102.5, commodity: "Oil", label: "US Permian & shale — ~20% of world oil", share: 0.2 },
  { lat: 24, lon: 45, commodity: "Oil", label: "Saudi Arabia — ~11%", share: 0.11 },
  { lat: 61, lon: 73, commodity: "Oil", label: "Russia (W. Siberia) — ~11%", share: 0.11 },
  { lat: 57, lon: -111, commodity: "Oil", label: "Canada oil sands — ~6%", share: 0.06 },
  { lat: 31, lon: 47, commodity: "Oil", label: "Iraq — ~4.5%", share: 0.045 },
  { lat: 25.9, lon: 51.5, commodity: "LNG", label: "Qatar — ~20% of LNG exports", share: 0.2 },
  { lat: 29.7, lon: -93.9, commodity: "LNG", label: "US Gulf Coast — ~21%", share: 0.21 },
  { lat: -20.6, lon: 116.8, commodity: "LNG", label: "Australia NW Shelf — ~19%", share: 0.19 },
  { lat: -24.3, lon: -69.1, commodity: "Copper", label: "Chile (Escondida) — ~24% of copper", share: 0.24 },
  { lat: -15.5, lon: -72, commodity: "Copper", label: "Peru — ~11%", share: 0.11 },
  { lat: -10.7, lon: 25.5, commodity: "Copper", label: "DR Congo — ~13%", share: 0.13 },
  { lat: -22.5, lon: 118, commodity: "Iron ore", label: "Pilbara, Australia — ~37%", share: 0.37 },
  { lat: -6, lon: -50.2, commodity: "Iron ore", label: "Carajás, Brazil — ~17%", share: 0.17 },
  { lat: -33.85, lon: 116.06, commodity: "Lithium", label: "Western Australia — ~45% of lithium", share: 0.45 },
  { lat: -23.5, lon: -68.25, commodity: "Lithium", label: "Atacama, Chile — ~24%", share: 0.24 },
  { lat: 37, lon: 95, commodity: "Lithium", label: "China (Qinghai/Jiangxi) — ~17%", share: 0.17 },
  { lat: -30.75, lon: 121.47, commodity: "Gold", label: "Australia — ~10% of gold", share: 0.1 },
  { lat: 37, lon: 117, commodity: "Gold", label: "China — ~10%", share: 0.1 },
  { lat: 6, lon: -1.6, commodity: "Gold", label: "Ghana — ~4%", share: 0.04 },
  { lat: -12.6, lon: -55.7, commodity: "Soybeans", label: "Mato Grosso, Brazil — ~40% of soy", share: 0.4 },
  { lat: 41.5, lon: -93.5, commodity: "Soybeans", label: "US Corn Belt — ~28%", share: 0.28 },
  { lat: -34, lon: -61, commodity: "Soybeans", label: "Argentine Pampas — ~12%", share: 0.12 },
];
