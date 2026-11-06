/**
 * Global financial network dataset.
 * Sizes/balances are APPROXIMATE public reference figures (rounded, mostly 2024–25)
 * and are labeled REF in the UI. Relationship weights are analyst-style estimates
 * (0–1) of relative importance, not measured quantities.
 */

export type NodeType =
  | "region"
  | "central_bank"
  | "exchange"
  | "bank"
  | "investor"
  | "corporate"
  | "commodity"
  | "bond"
  | "currency";

export type EdgeType = "capital" | "trade" | "correlation" | "exposure" | "dependency";

export type NetNode = {
  id: string;
  name: string;
  short: string;
  type: NodeType;
  region: string;
  value: number; // $B
  valueLabel: string;
  lat: number;
  lon: number;
  sym?: string; // simulated instrument used for performance
  desc: string;
  m: [string, string][];
};

export type NetEdge = { s: string; t: string; type: EdgeType; w: number; label?: string };

export const NODE_TYPES: { id: NodeType; label: string; color: string; plural: string }[] = [
  { id: "region", label: "Economic Region", plural: "Regions", color: "#9aa6bd" },
  { id: "central_bank", label: "Central Bank", plural: "Central Banks", color: "#ffd166" },
  { id: "exchange", label: "Stock Exchange", plural: "Exchanges", color: "#35e7ff" },
  { id: "bank", label: "Investment Bank", plural: "Banks", color: "#4d8bff" },
  { id: "investor", label: "Institutional Investor", plural: "Investors", color: "#a77bff" },
  { id: "corporate", label: "Corporation", plural: "Corporations", color: "#3dff9a" },
  { id: "commodity", label: "Commodity Market", plural: "Commodities", color: "#ff9f43" },
  { id: "bond", label: "Bond Market", plural: "Bond Markets", color: "#e8f0ff" },
  { id: "currency", label: "Currency", plural: "Currencies", color: "#ff3d8b" },
];
export const NODE_TYPE_MAP = Object.fromEntries(NODE_TYPES.map((t) => [t.id, t])) as Record<NodeType, (typeof NODE_TYPES)[number]>;

export const EDGE_TYPES: { id: EdgeType; label: string; color: string; desc: string }[] = [
  { id: "capital", label: "Capital Flow", color: "#35e7ff", desc: "Ownership stakes, allocations and cross-border investment" },
  { id: "trade", label: "Trade", color: "#ff9f43", desc: "Goods & commodity trade between regions and markets" },
  { id: "correlation", label: "Correlation", color: "#ff3d8b", desc: "Strong co-movement of returns" },
  { id: "exposure", label: "Exposure", color: "#4d8bff", desc: "Balance-sheet holdings, lending and clearing exposure" },
  { id: "dependency", label: "Dependency", color: "#3dff9a", desc: "Supply chains, listings, policy transmission" },
];
export const EDGE_TYPE_MAP = Object.fromEntries(EDGE_TYPES.map((t) => [t.id, t])) as Record<EdgeType, (typeof EDGE_TYPES)[number]>;

type N = [id: string, name: string, short: string, type: NodeType, region: string, value: number, valueLabel: string, lat: number, lon: number, desc: string, m: [string, string][], sym?: string];

const RAW: N[] = [
  // ── regions (GDP, $B nominal, ~2024)
  ["R_NA", "North America", "N.AMER", "region", "R_NA", 33300, "GDP", 40, -100, "US, Canada, Mexico — the world's deepest capital markets and the dollar's home.", [["GDP growth", "~2.6%"], ["Share of world mkt cap", "~62%"], ["Reserve currency", "USD"]]],
  ["R_EU", "Europe", "EUROPE", "region", "R_EU", 24400, "GDP", 50, 10, "EU, UK, Switzerland & Norway — bank-centric financing, large sovereign bond complex.", [["GDP growth", "~1.0%"], ["Share of world mkt cap", "~14%"], ["Key currencies", "EUR, GBP, CHF"]]],
  ["R_CN", "Greater China", "CHINA", "region", "R_CN", 19100, "GDP", 33, 110, "Mainland China & Hong Kong — manufacturing hub, largest commodity importer.", [["GDP growth", "~5.0%"], ["Share of global manufacturing", "~29%"], ["FX reserves", "~$3.2T"]]],
  ["R_EA", "East Asia", "E.ASIA", "region", "R_EA", 6700, "GDP", 36, 134, "Japan, South Korea & Taiwan — semiconductors, autos and the largest creditor nations.", [["Japan net foreign assets", "~$3.3T"], ["Semiconductor share", ">60% of advanced chips"], ["Key currencies", "JPY, KRW, TWD"]]],
  ["R_SA", "South & SE Asia", "S.ASIA", "region", "R_SA", 7800, "GDP", 16, 92, "India & ASEAN — fastest-growing large economies; supply-chain diversification.", [["India GDP growth", "~6.5%"], ["ASEAN GDP", "~$3.9T"], ["Demographics", "median age <30"]]],
  ["R_ME", "Middle East", "M.EAST", "region", "R_ME", 4600, "GDP", 26, 48, "Gulf states, Türkiye & Israel — energy exporters and sovereign wealth capital.", [["Share of oil exports", "~35%"], ["SWF assets", ">$4T"], ["Currency pegs", "SAR, AED → USD"]]],
  ["R_LA", "Latin America", "LATAM", "region", "R_LA", 4500, "GDP", -15, -60, "Brazil, Argentina, Chile & Andean economies — commodities and agriculture.", [["Copper share (Chile+Peru)", "~37%"], ["Soy exports (Brazil)", "#1 globally"], ["Avg policy rate", "high real rates"]]],
  ["R_AF", "Africa", "AFRICA", "region", "R_AF", 3100, "GDP", 2, 20, "Resource-rich, young and under-financed; critical minerals frontier.", [["Population", "~1.5B"], ["Cobalt share (DRC)", "~70%"], ["Gold producers", "Ghana, S.Africa"]]],
  ["R_OC", "Oceania", "OCEANIA", "region", "R_OC", 2000, "GDP", -28, 140, "Australia & New Zealand — iron ore, lithium, LNG; deep superannuation pools.", [["Iron ore share", "~38% of exports"], ["Superannuation", "~$2.6T"], ["Currency", "AUD"]]],

  // ── central banks (balance sheet $B)
  ["CB_FED", "Federal Reserve", "FED", "central_bank", "R_NA", 6600, "Balance sheet", 38.9, -77.04, "Sets the world's reference policy rate; dollar liquidity backstop via swap lines.", [["Policy rate (ref)", "3.50–3.75%"], ["Balance sheet", "~$6.6T"], ["Mandate", "Max employment, 2% PCE"]]],
  ["CB_ECB", "European Central Bank", "ECB", "central_bank", "R_EU", 7000, "Balance sheet", 50.11, 8.68, "Monetary authority for 20 euro-area states; TPI backstop for sovereign spreads.", [["Deposit rate (ref)", "2.00%"], ["Balance sheet", "~€6.2T"], ["Mandate", "2% HICP"]]],
  ["CB_BOJ", "Bank of Japan", "BOJ", "central_bank", "R_EA", 5000, "Balance sheet", 35.68, 139.77, "Exited negative rates in 2024; owns roughly half of the JGB market.", [["Policy rate (ref)", "0.50%"], ["JGB holdings", "~50% of market"], ["Balance sheet", "~¥750T"]]],
  ["CB_PBOC", "People's Bank of China", "PBOC", "central_bank", "R_CN", 6300, "Balance sheet", 39.9, 116.4, "Manages the managed-float yuan and credit impulse via RRR and LPR.", [["7d reverse repo (ref)", "1.40%"], ["FX reserves", "~$3.3T"], ["Gold reserves", "~2,300t"]]],
  ["CB_BOE", "Bank of England", "BOE", "central_bank", "R_EU", 900, "Balance sheet", 51.51, -0.09, "UK monetary policy and financial stability; active QT via gilt sales.", [["Bank Rate (ref)", "4.00%"], ["APF gilt holdings", "shrinking"], ["Mandate", "2% CPI"]]],
  ["CB_SNB", "Swiss National Bank", "SNB", "central_bank", "R_EU", 1050, "Balance sheet", 46.95, 7.45, "Large FX reserve manager; major holder of global equities.", [["Policy rate (ref)", "0.00%"], ["Equity share of reserves", "~25%"], ["Currency", "CHF safe haven"]]],
  ["CB_BOC", "Bank of Canada", "BOC", "central_bank", "R_NA", 290, "Balance sheet", 45.42, -75.7, "Inflation targeting central bank closely linked to the Fed cycle.", [["Policy rate (ref)", "2.25%"], ["Inflation target", "2% (1–3% band)"], ["Trade link", "~75% exports to US"]]],
  ["CB_RBA", "Reserve Bank of Australia", "RBA", "central_bank", "R_OC", 300, "Balance sheet", -33.87, 151.21, "Commodity-economy central bank; AUD is a global risk proxy.", [["Cash rate (ref)", "3.60%"], ["Inflation target", "2–3%"], ["Terms of trade", "iron ore driven"]]],

  // ── exchanges (domestic listed market cap $B)
  ["EX_NASDAQ", "Nasdaq", "NASDAQ", "exchange", "R_NA", 33000, "Listed mkt cap", 40.76, -73.98, "Home of mega-cap technology; electronic market pioneer.", [["Listed companies", "~3,300"], ["Listed mkt cap", "~$33T"], ["Flagship index", "Nasdaq-100"]]],
  ["EX_NYSE", "New York Stock Exchange", "NYSE", "exchange", "R_NA", 30000, "Listed mkt cap", 40.71, -74.01, "World's largest exchange by legacy listings; ICE-owned.", [["Listed companies", "~2,300"], ["Listed mkt cap", "~$30T"], ["Owner", "ICE"]]],
  ["EX_SSE", "Shanghai Stock Exchange", "SSE", "exchange", "R_CN", 7800, "Listed mkt cap", 31.23, 121.47, "Mainland China's largest exchange incl. STAR tech board.", [["Listed companies", "~2,300"], ["Foreign access", "Stock Connect"], ["Retail share of turnover", "high"]]],
  ["EX_EURONEXT", "Euronext", "EURONEXT", "exchange", "R_EU", 7000, "Listed mkt cap", 48.86, 2.35, "Pan-European exchange: Paris, Amsterdam, Milan, Dublin and more.", [["Venues", "7 markets"], ["Listed mkt cap", "~$7T"], ["Clearing", "Euronext Clearing"]]],
  ["EX_JPX", "Japan Exchange Group", "JPX", "exchange", "R_EA", 6800, "Listed mkt cap", 35.68, 139.78, "Tokyo Stock Exchange; governance reforms drove buyback wave.", [["Listed companies", "~3,900"], ["Flagship index", "TOPIX / Nikkei 225"], ["Reform", "P/B < 1 disclosure push"]]],
  ["EX_NSE", "National Stock Exchange of India", "NSE", "exchange", "R_SA", 5000, "Listed mkt cap", 19.06, 72.86, "World's largest derivatives exchange by contracts traded.", [["Derivatives", "#1 by contracts"], ["Flagship index", "NIFTY 50"], ["Retail accounts", ">100M"]]],
  ["EX_HKEX", "Hong Kong Exchanges", "HKEX", "exchange", "R_CN", 5000, "Listed mkt cap", 22.28, 114.16, "Gateway between Chinese issuers and global capital.", [["Connect programs", "Stock & Bond Connect"], ["IPO hub", "top-3 globally"], ["Flagship index", "Hang Seng"]]],
  ["EX_LSE", "London Stock Exchange", "LSE", "exchange", "R_EU", 3200, "Listed mkt cap", 51.51, -0.1, "Historic global listing venue; LSEG owns data & clearing (LCH).", [["Owner", "LSEG"], ["Clearing", "LCH SwapClear"], ["Flagship index", "FTSE 100"]]],
  ["EX_CME", "CME Group", "CME", "exchange", "R_NA", 100, "Market cap", 41.88, -87.63, "Largest derivatives marketplace: rates, equity index, energy, metals, ag.", [["Avg daily volume", "~26M contracts"], ["Key products", "SOFR, ES, CL, GC"], ["Clearing", "CME Clearing"]]],

  // ── investment banks (total assets $B)
  ["BK_ICBC", "ICBC", "ICBC", "bank", "R_CN", 6700, "Total assets", 39.91, 116.37, "World's largest bank by assets; state-owned policy lender.", [["Total assets", "~$6.7T"], ["Owner", "Central Huijin / MoF"], ["Role", "credit transmission"]]],
  ["BK_JPM", "JPMorgan Chase", "JPM", "bank", "R_NA", 4300, "Total assets", 40.76, -73.98, "Largest US bank; #1 global investment banking and markets franchise.", [["Total assets", "~$4.3T"], ["CET1 ratio", "~15%"], ["G-SIB bucket", "highest"]], "JPM"],
  ["BK_BAC", "Bank of America", "BAC", "bank", "R_NA", 3300, "Total assets", 35.23, -80.84, "US consumer & corporate bank; large securities portfolio.", [["Total assets", "~$3.3T"], ["Deposits", "~$1.9T"], ["HTM securities", "large"]], "BAC"],
  ["BK_HSBC", "HSBC", "HSBC", "bank", "R_EU", 3100, "Total assets", 51.5, -0.02, "Global trade-finance bank bridging Europe and Asia.", [["Total assets", "~$3.1T"], ["Asia share of profit", ">70%"], ["HQ", "London"]]],
  ["BK_MUFG", "Mitsubishi UFJ", "MUFG", "bank", "R_EA", 2600, "Total assets", 35.68, 139.76, "Japan's largest bank; major global lender and Morgan Stanley partner.", [["Total assets", "~$2.6T"], ["MS stake", "~22%"], ["Role", "yen funding channel"]]],
  ["BK_BNP", "BNP Paribas", "BNP", "bank", "R_EU", 2900, "Total assets", 48.87, 2.33, "Euro area's largest bank; leading European markets franchise.", [["Total assets", "~$2.9T"], ["CET1 ratio", "~12.9%"], ["Home", "France"]]],
  ["BK_CITI", "Citigroup", "CITI", "bank", "R_NA", 2400, "Total assets", 40.72, -74.01, "Most global US bank; treasury & trade solutions, FX market maker.", [["Total assets", "~$2.4T"], ["Countries", "~95"], ["FX share", "top-3 dealer"]]],
  ["BK_BARC", "Barclays", "BARC", "bank", "R_EU", 1900, "Total assets", 51.5, -0.02, "UK universal bank with large US investment bank.", [["Total assets", "~$1.9T"], ["Home", "UK"], ["Role", "gilt & FX dealer"]]],
  ["BK_GS", "Goldman Sachs", "GS", "bank", "R_NA", 1700, "Total assets", 40.71, -74.01, "Elite investment bank: M&A advisory, trading, asset & wealth management.", [["Total assets", "~$1.7T"], ["M&A league table", "#1"], ["AUS", "~$3T"]], "GS"],
  ["BK_UBS", "UBS", "UBS", "bank", "R_EU", 1600, "Total assets", 47.37, 8.54, "World's largest wealth manager after absorbing Credit Suisse.", [["Invested assets", "~$6T"], ["Total assets", "~$1.6T"], ["Home", "Switzerland"]]],
  ["BK_MS", "Morgan Stanley", "MS", "bank", "R_NA", 1300, "Total assets", 40.76, -73.98, "Wealth-management-led investment bank; equity markets leader.", [["Client assets", "~$8T"], ["Total assets", "~$1.3T"], ["Partner", "MUFG"]], "MS"],

  // ── institutional investors (AUM $B)
  ["IN_BLK", "BlackRock", "BLACKROCK", "investor", "R_NA", 13500, "AUM", 40.75, -73.98, "World's largest asset manager; iShares ETF platform and Aladdin risk system.", [["AUM", "~$13.5T"], ["ETF share (US)", "~1/3"], ["Aladdin", "~$20T+ on platform"]], "BLK"],
  ["IN_VG", "Vanguard", "VANGUARD", "investor", "R_NA", 10500, "AUM", 40.04, -75.51, "Client-owned index giant; top holder of most S&P 500 companies.", [["AUM", "~$10.5T"], ["Model", "mutual ownership"], ["Typical stake", "~8–9% of S&P names"]]],
  ["IN_FID", "Fidelity Investments", "FIDELITY", "investor", "R_NA", 6000, "AUM", 42.36, -71.06, "Active and passive manager, retirement platform and brokerage.", [["AUM", "~$6T"], ["Assets under admin", ">$15T"], ["Private", "family-owned"]]],
  ["IN_SST", "State Street", "STATE ST.", "investor", "R_NA", 5000, "AUM", 42.35, -71.05, "Custody giant and SPDR ETF sponsor.", [["AUM", "~$5T"], ["Assets under custody", "~$49T"], ["Flagship", "SPY"]]],
  ["IN_NBIM", "Norges Bank IM", "NBIM", "investor", "R_EU", 2000, "AUM", 59.91, 10.75, "Norway's oil fund — owns ~1.5% of every listed company in the world.", [["Fund value", "~$2T"], ["Equity share", "~70%"], ["Holdings", "~8,700 companies"]]],
  ["IN_GPIF", "Japan GPIF", "GPIF", "investor", "R_EA", 1700, "AUM", 35.67, 139.75, "World's largest pension fund; 25/25/25/25 policy mix.", [["AUM", "~$1.7T"], ["Policy mix", "25% each bucket"], ["Beneficiaries", "Japan public pension"]]],
  ["IN_CIC", "China Investment Corp", "CIC", "investor", "R_CN", 1300, "AUM", 39.92, 116.44, "China's sovereign wealth fund; owns Central Huijin (bank stakes).", [["AUM", "~$1.3T"], ["Subsidiary", "Central Huijin"], ["Focus", "global diversification"]]],
  ["IN_ADIA", "Abu Dhabi Investment Auth.", "ADIA", "investor", "R_ME", 1000, "AUM", 24.45, 54.38, "Long-horizon Gulf SWF recycling hydrocarbon revenue.", [["AUM (est.)", "~$1T"], ["Style", "multi-asset, external mgrs"], ["Origin", "oil revenue"]]],
  ["IN_PIF", "Saudi Public Investment Fund", "PIF", "investor", "R_ME", 950, "AUM", 24.71, 46.68, "Vision 2030 vehicle; stakes in Aramco, gaming, EVs, tech.", [["AUM", "~$950B"], ["Aramco stake", "~16%"], ["Mandate", "economic diversification"]]],
  ["IN_CALP", "CalPERS", "CALPERS", "investor", "R_NA", 550, "AUM", 38.58, -121.49, "Largest US public pension; stewardship leader.", [["AUM", "~$550B"], ["Funded status", "~80%"], ["Discount rate", "6.8%"]]],
  ["IN_BRK", "Berkshire Hathaway", "BERKSHIRE", "investor", "R_NA", 1060, "Market cap", 41.26, -95.94, "Conglomerate and concentrated equity investor with a fortress cash pile.", [["Cash & T-bills", "~$380B"], ["Top holding", "Apple"], ["Insurance float", "~$170B"]], "BRK.B"],
  ["IN_CITADEL", "Citadel", "CITADEL", "investor", "R_NA", 70, "AUM", 25.76, -80.19, "Multi-strategy hedge fund; Citadel Securities is a top market maker.", [["AUM", "~$65–70B"], ["Market-making share", "~25% US equity vol"], ["Style", "multi-manager pods"]]],
  ["IN_BW", "Bridgewater", "BRIDGEWATER", "investor", "R_NA", 90, "AUM", 41.14, -73.36, "Global macro pioneer; All Weather risk-parity framework.", [["AUM", "~$90B"], ["Flagship", "Pure Alpha"], ["Style", "systematic macro"]]],

  // ── corporations (market cap $B, illustrative)
  ["CO_NVDA", "NVIDIA", "NVDA", "corporate", "R_NA", 4520, "Market cap", 37.37, -121.96, "Accelerated computing; the picks-and-shovels supplier of the AI build-out.", [["Data-center share of revenue", "~88%"], ["Gross margin", "~75%"], ["Foundry", "TSMC"]], "NVDA"],
  ["CO_AAPL", "Apple", "AAPL", "corporate", "R_NA", 3880, "Market cap", 37.33, -122.01, "Consumer hardware & services ecosystem; record buyback program.", [["Services share of GP", "~45%"], ["Installed base", ">2.3B devices"], ["Assembly", "China, India, Vietnam"]], "AAPL"],
  ["CO_MSFT", "Microsoft", "MSFT", "corporate", "R_NA", 3750, "Market cap", 47.64, -122.13, "Cloud (Azure), productivity software and AI platform.", [["Cloud revenue run-rate", ">$150B"], ["Op. margin", "~45%"], ["Credit rating", "AAA"]], "MSFT"],
  ["CO_GOOGL", "Alphabet", "GOOGL", "corporate", "R_NA", 3410, "Market cap", 37.42, -122.08, "Search, YouTube, Google Cloud and custom TPU silicon.", [["Ad share of revenue", "~75%"], ["Cloud op. margin", "rising"], ["TPU partner", "Broadcom"]], "GOOGL"],
  ["CO_AMZN", "Amazon", "AMZN", "corporate", "R_NA", 2410, "Market cap", 47.62, -122.34, "E-commerce, logistics and AWS — the largest cloud provider.", [["AWS share of op. income", "~60%"], ["Capex (annual)", ">$100B"], ["Employees", "~1.5M"]], "AMZN"],
  ["CO_META", "Meta Platforms", "META", "corporate", "R_NA", 1615, "Market cap", 37.48, -122.15, "Social platforms reaching ~3.5B daily users; heavy AI capex.", [["Daily active people", "~3.4B"], ["Op. margin", "~40%"], ["Capex", "AI infrastructure"]], "META"],
  ["CO_AVGO", "Broadcom", "AVGO", "corporate", "R_NA", 1610, "Market cap", 37.39, -121.95, "Custom AI accelerators, networking silicon and infrastructure software.", [["AI revenue", "custom XPUs"], ["Software", "VMware"], ["Foundry", "TSMC"]], "AVGO"],
  ["CO_TSLA", "Tesla", "TSLA", "corporate", "R_NA", 1430, "Market cap", 30.22, -97.62, "EVs, energy storage and autonomy; Shanghai gigafactory exposure.", [["Deliveries (annual)", "~1.8M"], ["Shanghai share of output", "~50%"], ["Battery inputs", "lithium, nickel"]], "TSLA"],
  ["CO_LLY", "Eli Lilly", "LLY", "corporate", "R_NA", 898, "Market cap", 39.77, -86.16, "Pharma leader driven by GLP-1 obesity and diabetes franchises.", [["GLP-1 franchise", "Mounjaro / Zepbound"], ["Revenue growth", ">30%"], ["R&D intensity", "~25%"]], "LLY"],
  ["CO_WMT", "Walmart", "WMT", "corporate", "R_NA", 825, "Market cap", 36.37, -94.21, "World's largest retailer by revenue; consumer health bellwether.", [["Revenue", "~$680B"], ["Employees", "~2.1M"], ["E-commerce growth", "~20%"]], "WMT"],
  ["CO_XOM", "Exxon Mobil", "XOM", "corporate", "R_NA", 489, "Market cap", 30.17, -95.5, "Integrated oil major; Permian and Guyana growth engines.", [["Production", "~4.6 Mboe/d"], ["Breakeven", "~$35/bbl"], ["Dividend streak", "40+ years"]], "XOM"],
  ["CO_TSMC", "TSMC", "TSMC", "corporate", "R_EA", 1300, "Market cap", 24.78, 120.99, "Foundry for >90% of leading-edge chips — a single point of failure for AI.", [["Leading-edge share", ">90%"], ["Gross margin", "~58%"], ["Key tool supplier", "ASML"]]],
  ["CO_ARAMCO", "Saudi Aramco", "ARAMCO", "corporate", "R_ME", 1600, "Market cap", 26.29, 50.11, "World's largest oil producer; funds the Saudi state and PIF.", [["Production", "~12 Mboe/d"], ["State ownership", "~81%"], ["PIF stake", "~16%"]]],
  ["CO_TCEHY", "Tencent", "TENCENT", "corporate", "R_CN", 700, "Market cap", 22.54, 113.93, "WeChat, gaming and fintech super-app; HK-listed.", [["WeChat MAU", "~1.4B"], ["Listing", "HKEX"], ["Buybacks", "large"]]],
  ["CO_SAMSUNG", "Samsung Electronics", "SAMSUNG", "corporate", "R_EA", 450, "Market cap", 37.26, 127.03, "Memory chips (DRAM/HBM), smartphones and displays.", [["DRAM share", "~40%"], ["Listing", "KRX"], ["Key customer", "Apple, Nvidia"]]],
  ["CO_ASML", "ASML", "ASML", "corporate", "R_EU", 350, "Market cap", 51.42, 5.4, "Monopoly supplier of EUV lithography tools.", [["EUV share", "100%"], ["Backlog", "~€35B+"], ["Export controls", "China restrictions"]]],
  ["CO_ALIBABA", "Alibaba", "BABA", "corporate", "R_CN", 350, "Market cap", 30.27, 120.16, "China e-commerce and cloud; dual-listed NYSE/HKEX.", [["Cloud", "#1 in China"], ["Listings", "NYSE, HKEX"], ["AI", "Qwen models"]]],
  ["CO_LVMH", "LVMH", "LVMH", "corporate", "R_EU", 330, "Market cap", 48.87, 2.31, "Luxury conglomerate; barometer of Chinese & US high-end demand.", [["Maisons", "75+"], ["China exposure", "~30% demand"], ["Listing", "Euronext Paris"]]],
  ["CO_TOYOTA", "Toyota Motor", "TOYOTA", "corporate", "R_EA", 260, "Market cap", 35.08, 137.16, "World's largest automaker by volume; hybrid leader.", [["Vehicles sold", "~11M/yr"], ["Yen sensitivity", "high"], ["Listing", "TSE / NYSE ADR"]]],
  ["CO_NESTLE", "Nestlé", "NESTLE", "corporate", "R_EU", 240, "Market cap", 46.46, 6.84, "World's largest food company; defensive staple.", [["Brands", "2,000+"], ["Emerging mkts share", "~40%"], ["Listing", "SIX Swiss"]]],
  ["CO_RELIANCE", "Reliance Industries", "RELIANCE", "corporate", "R_SA", 230, "Market cap", 19.07, 72.87, "India's largest company: refining, telecom (Jio) and retail.", [["Refining", "Jamnagar, world's largest"], ["Jio subscribers", "~480M"], ["Listing", "NSE"]]],
  ["CO_NOVO", "Novo Nordisk", "NOVO", "corporate", "R_EU", 220, "Market cap", 55.73, 12.4, "GLP-1 pioneer (Ozempic/Wegovy).", [["GLP-1 share", "large"], ["Owner", "Novo Holdings"], ["Listing", "Copenhagen / NYSE"]]],
  ["CO_SHELL", "Shell", "SHELL", "corporate", "R_EU", 210, "Market cap", 51.5, -0.12, "Integrated energy major; world's largest LNG trader.", [["LNG portfolio", "~65 Mt/yr"], ["Listing", "LSE / NYSE"], ["Buybacks", "~$3.5B/qtr"]]],

  // ── commodities
  ["CM_OIL", "Crude Oil", "CRUDE", "commodity", "R_ME", 2600, "Annual market value", 27, 50, "~103 mb/d global demand — the macro input that moves inflation and FX.", [["Global demand", "~103 mb/d"], ["OPEC+ share", "~40%"], ["Benchmark", "Brent / WTI"]], "BRENT"],
  ["CM_GOLD", "Gold", "GOLD", "commodity", "R_AF", 4000, "Annual flows (est.)", -26.2, 28.05, "Monetary metal; central-bank buying hit records post-2022.", [["CB purchases", ">1,000t/yr"], ["Above-ground stock", "~216kt"], ["Driver", "real rates, USD"]], "GOLD"],
  ["CM_COPPER", "Copper", "COPPER", "commodity", "R_LA", 300, "Annual market value", -23.65, -70.4, "'Dr. Copper' — electrification and grid build-out metal.", [["Top producer", "Chile"], ["China demand share", "~55%"], ["Energy transition", "EVs, grids"]], "COPPER"],
  ["CM_LNG", "Natural Gas / LNG", "LNG", "commodity", "R_ME", 600, "Annual market value", 25.3, 51.5, "Seaborne gas linking US, Qatar, Europe and Asia.", [["Top exporters", "US, Qatar, Australia"], ["EU dependence", "post-2022 shift"], ["Benchmarks", "HH, TTF, JKM"]], "NATGAS"],
  ["CM_IRON", "Iron Ore", "IRON ORE", "commodity", "R_OC", 280, "Annual market value", -22, 118, "Seaborne steel input; Pilbara → China property & infrastructure.", [["Australia share", "~55% seaborne"], ["China import share", "~70%"], ["Key producers", "Rio, BHP, Vale"]]],
  ["CM_SOY", "Soybeans", "SOY", "commodity", "R_LA", 180, "Annual market value", -12.6, -55.7, "Feed crop at the center of US–China–Brazil trade politics.", [["Top exporter", "Brazil"], ["Top importer", "China"], ["Benchmark", "CBOT"]]],
  ["CM_LITHIUM", "Lithium", "LITHIUM", "commodity", "R_OC", 40, "Annual market value", -23.5, -68, "Battery metal; mined in Australia/Chile, refined mostly in China.", [["Refining share (China)", "~65%"], ["Top miner", "Australia"], ["Demand driver", "EV batteries"]]],

  // ── bond markets (outstanding $B)
  ["BD_UST", "US Treasuries", "UST", "bond", "R_NA", 30000, "Outstanding", 38.9, -77.0, "The global risk-free benchmark and collateral backbone.", [["Marketable debt", "~$30T"], ["Foreign holders", "~30%"], ["Benchmark", "10Y yield"]], "IEF"],
  ["BD_CGB", "China Govt Bonds", "CGB", "bond", "R_CN", 14000, "Outstanding", 39.9, 116.39, "Largely domestic, low-yield market with growing foreign access.", [["Outstanding (incl. local)", "~$14T"], ["Foreign share", "~3%"], ["10Y yield", "historically low"]]],
  ["BD_USIG", "US IG Corporate Credit", "US IG", "bond", "R_NA", 10000, "Outstanding", 40.7, -74.0, "Investment-grade corporate funding market.", [["Outstanding", "~$10T"], ["Spread regime", "tight"], ["Largest issuers", "banks, tech, telecom"]], "AGG"],
  ["BD_JGB", "Japanese Govt Bonds", "JGB", "bond", "R_EA", 8500, "Outstanding", 35.67, 139.76, "World's most indebted sovereign; normalizing after YCC.", [["Debt/GDP", "~235%"], ["BoJ ownership", "~50%"], ["10Y yield", "rising"]]],
  ["BD_OAT", "French OATs", "OAT", "bond", "R_EU", 3400, "Outstanding", 48.85, 2.35, "Core-periphery hinge of the euro sovereign complex.", [["Debt/GDP", "~113%"], ["Spread vs Bund", "widened 2024–25"], ["Rating", "AA-/A+"]]],
  ["BD_GILT", "UK Gilts", "GILT", "bond", "R_EU", 3300, "Outstanding", 51.51, -0.12, "Long-duration market dominated by pension (LDI) demand.", [["Debt/GDP", "~100%"], ["2022 LDI crisis", "BoE intervention"], ["Index-linked share", "~25%"]]],
  ["BD_BTP", "Italian BTPs", "BTP", "bond", "R_EU", 3000, "Outstanding", 41.9, 12.5, "Euro area's largest high-debt sovereign market.", [["Debt/GDP", "~135%"], ["Spread vs Bund", "barometer of EU stress"], ["Retail ownership", "rising"]]],
  ["BD_BUND", "German Bunds", "BUND", "bond", "R_EU", 2100, "Outstanding", 50.11, 8.69, "Euro-area safe asset and pricing anchor.", [["Debt/GDP", "~63%"], ["Fiscal shift", "2025 debt-brake reform"], ["Rating", "AAA"]]],
  ["BD_USHY", "US High Yield", "US HY", "bond", "R_NA", 1400, "Outstanding", 40.72, -73.99, "Leveraged-company funding; growth & default-cycle bellwether.", [["Outstanding", "~$1.4T"], ["Default rate", "~2–4%"], ["Competitor", "private credit"]], "HYG"],
  ["BD_EMSOV", "EM Sovereign Debt", "EM SOV", "bond", "R_LA", 1500, "Outstanding", -23.55, -46.63, "Hard-currency sovereign debt — sensitive to USD and Fed policy.", [["Outstanding (USD)", "~$1.5T"], ["Key issuers", "Mexico, Brazil, Indonesia"], ["Driver", "USD & Treasuries"]]],

  // ── currencies (avg daily turnover $B, BIS 2022 order of magnitude)
  ["FX_USD", "US Dollar", "USD", "currency", "R_NA", 6600, "Daily FX turnover", 40.71, -74.0, "On one side of ~88% of all FX trades; ~58% of global reserves.", [["FX turnover share", "~88%"], ["Reserve share", "~58%"], ["Index", "DXY"]], "DXY"],
  ["FX_EUR", "Euro", "EUR", "currency", "R_EU", 2300, "Daily FX turnover", 50.11, 8.68, "Second reserve currency; funding currency of euro-area banks.", [["FX turnover share", "~31%"], ["Reserve share", "~20%"], ["Pair", "EUR/USD"]], "EURUSD"],
  ["FX_JPY", "Japanese Yen", "JPY", "currency", "R_EA", 1250, "Daily FX turnover", 35.68, 139.69, "Classic carry-trade funding currency and haven.", [["FX turnover share", "~17%"], ["Carry trade", "funding leg"], ["Pair", "USD/JPY"]], "USDJPY"],
  ["FX_GBP", "British Pound", "GBP", "currency", "R_EU", 970, "Daily FX turnover", 51.51, -0.13, "London is the largest FX trading hub.", [["FX turnover share", "~13%"], ["London share of FX", "~38%"], ["Pair", "GBP/USD"]], "GBPUSD"],
  ["FX_CNY", "Chinese Yuan", "CNY", "currency", "R_CN", 530, "Daily FX turnover", 31.23, 121.47, "Managed currency; rising trade-settlement share.", [["FX turnover share", "~7%"], ["Regime", "daily fixing band"], ["Pair", "USD/CNH"]], "USDCNH"],
  ["FX_CHF", "Swiss Franc", "CHF", "currency", "R_EU", 390, "Daily FX turnover", 47.37, 8.54, "Safe-haven currency managed by SNB interventions.", [["FX turnover share", "~5%"], ["Role", "safe haven"], ["Pair", "USD/CHF"]], "USDCHF"],
  ["FX_AUD", "Australian Dollar", "AUD", "currency", "R_OC", 480, "Daily FX turnover", -33.87, 151.21, "Liquid proxy for China growth and commodity demand.", [["FX turnover share", "~6%"], ["Driver", "iron ore, risk appetite"], ["Pair", "AUD/USD"]], "AUDUSD"],
  ["FX_BTC", "Bitcoin", "BTC", "currency", "R_NA", 1950, "Network value", 10, -35, "Decentralized digital asset; spot ETFs institutionalized access in 2024.", [["Supply cap", "21M"], ["ETF holdings", ">1.2M BTC"], ["Correlation", "high-beta risk asset"]], "BTC"],
];

export const NODES: NetNode[] = RAW.map(([id, name, short, type, region, value, valueLabel, lat, lon, desc, m, sym]) => ({
  id,
  name,
  short,
  type,
  region,
  value,
  valueLabel,
  lat,
  lon,
  desc,
  m,
  sym,
}));
export const NODE_MAP: Record<string, NetNode> = Object.fromEntries(NODES.map((n) => [n.id, n]));

// ───────────────────────── relationships ─────────────────────────

const E: NetEdge[] = [];
const add = (s: string, t: string, type: EdgeType, w: number, label?: string) => E.push({ s, t, type, w, label });

// structural: entity ↔ home region
for (const n of NODES) {
  if (n.type === "region") continue;
  if (n.type === "exchange" || n.type === "central_bank" || n.type === "bond") add(n.id, n.region, "dependency", 0.45, "home market");
  if (n.type === "corporate") add(n.id, n.region, "dependency", 0.3, "domicile");
}

// policy transmission
[
  ["CB_FED", "FX_USD"], ["CB_ECB", "FX_EUR"], ["CB_BOJ", "FX_JPY"], ["CB_BOE", "FX_GBP"], ["CB_PBOC", "FX_CNY"], ["CB_SNB", "FX_CHF"], ["CB_RBA", "FX_AUD"],
].forEach(([a, b]) => add(a, b, "dependency", 0.95, "monetary policy"));
[
  ["CB_FED", "BD_UST", 0.95], ["CB_ECB", "BD_BUND", 0.8], ["CB_ECB", "BD_OAT", 0.8], ["CB_ECB", "BD_BTP", 0.85], ["CB_BOJ", "BD_JGB", 1.0], ["CB_BOE", "BD_GILT", 0.8], ["CB_PBOC", "BD_CGB", 0.7], ["CB_BOC", "BD_UST", 0.3],
].forEach(([a, b, w]) => add(a as string, b as string, "exposure", w as number, "QE / balance-sheet holdings"));
add("CB_FED", "CB_ECB", "dependency", 0.6, "USD swap lines");
add("CB_FED", "CB_BOJ", "dependency", 0.55, "USD swap lines");
add("CB_FED", "CB_BOE", "dependency", 0.5, "USD swap lines");
add("CB_FED", "CB_SNB", "dependency", 0.45, "USD swap lines");
add("CB_FED", "CB_BOC", "dependency", 0.5, "USD swap lines");
add("CB_PBOC", "CM_GOLD", "capital", 0.7, "reserve accumulation");
add("CB_SNB", "CO_AAPL", "capital", 0.35, "FX reserve equity holdings");
add("CB_SNB", "CO_MSFT", "capital", 0.35, "FX reserve equity holdings");

// banks ↔ central banks (reserves) and ↔ sovereigns (holdings / dealing)
[
  ["BK_JPM", "CB_FED"], ["BK_BAC", "CB_FED"], ["BK_CITI", "CB_FED"], ["BK_GS", "CB_FED"], ["BK_MS", "CB_FED"], ["BK_BNP", "CB_ECB"], ["BK_MUFG", "CB_BOJ"], ["BK_HSBC", "CB_BOE"], ["BK_BARC", "CB_BOE"], ["BK_ICBC", "CB_PBOC"], ["BK_UBS", "CB_SNB"],
].forEach(([a, b]) => add(a, b, "dependency", 0.7, "reserves & liquidity facilities"));
[
  ["BK_JPM", "BD_UST", 0.85], ["BK_BAC", "BD_UST", 0.9], ["BK_CITI", "BD_UST", 0.7], ["BK_GS", "BD_UST", 0.6], ["BK_MS", "BD_UST", 0.5], ["BK_MUFG", "BD_JGB", 0.85], ["BK_MUFG", "BD_UST", 0.6],
  ["BK_HSBC", "BD_GILT", 0.6], ["BK_BARC", "BD_GILT", 0.7], ["BK_BNP", "BD_OAT", 0.8], ["BK_BNP", "BD_BTP", 0.6], ["BK_UBS", "BD_BUND", 0.4], ["BK_ICBC", "BD_CGB", 0.95],
  ["BK_JPM", "BD_USIG", 0.6], ["BK_GS", "BD_USHY", 0.5], ["BK_CITI", "BD_EMSOV", 0.55], ["BK_HSBC", "FX_CNY", 0.5],
].forEach(([a, b, w]) => add(a as string, b as string, "exposure", w as number, "securities holdings / dealing"));
[
  ["BK_JPM", "FX_USD"], ["BK_CITI", "FX_USD"], ["BK_UBS", "FX_CHF"], ["BK_BARC", "FX_GBP"], ["BK_HSBC", "FX_USD"], ["BK_GS", "FX_EUR"],
].forEach(([a, b]) => add(a, b, "exposure", 0.45, "FX market making"));
add("BK_MUFG", "BK_MS", "capital", 0.7, "~22% equity stake");
add("BK_JPM", "CO_TSLA", "exposure", 0.25, "corporate lending");
add("BK_GS", "CO_AAPL", "exposure", 0.3, "card partnership / advisory");
add("BK_JPM", "EX_CME", "exposure", 0.4, "clearing member");
add("BK_GS", "EX_CME", "exposure", 0.4, "clearing member");
add("BK_BARC", "EX_LSE", "exposure", 0.35, "LCH clearing member");

// listings
[
  ["CO_NVDA", "EX_NASDAQ"], ["CO_AAPL", "EX_NASDAQ"], ["CO_MSFT", "EX_NASDAQ"], ["CO_GOOGL", "EX_NASDAQ"], ["CO_AMZN", "EX_NASDAQ"], ["CO_META", "EX_NASDAQ"], ["CO_AVGO", "EX_NASDAQ"], ["CO_TSLA", "EX_NASDAQ"],
  ["CO_LLY", "EX_NYSE"], ["CO_WMT", "EX_NYSE"], ["CO_XOM", "EX_NYSE"], ["BK_JPM", "EX_NYSE"], ["BK_BAC", "EX_NYSE"], ["BK_GS", "EX_NYSE"], ["BK_MS", "EX_NYSE"], ["BK_CITI", "EX_NYSE"], ["IN_BLK", "EX_NYSE"], ["IN_BRK", "EX_NYSE"],
  ["CO_TCEHY", "EX_HKEX"], ["CO_ALIBABA", "EX_HKEX"], ["CO_ALIBABA", "EX_NYSE"], ["BK_ICBC", "EX_SSE"], ["BK_ICBC", "EX_HKEX"], ["CO_LVMH", "EX_EURONEXT"], ["CO_ASML", "EX_EURONEXT"], ["BK_BNP", "EX_EURONEXT"],
  ["CO_SHELL", "EX_LSE"], ["BK_HSBC", "EX_LSE"], ["BK_BARC", "EX_LSE"], ["CO_TOYOTA", "EX_JPX"], ["BK_MUFG", "EX_JPX"], ["CO_RELIANCE", "EX_NSE"], ["CO_TSMC", "EX_NYSE"], ["CO_NOVO", "EX_NYSE"],
].forEach(([a, b]) => add(a, b, "dependency", 0.4, "primary listing"));

// supply chains & strategic dependencies
[
  ["CO_NVDA", "CO_TSMC", 1.0, "leading-edge foundry"], ["CO_AAPL", "CO_TSMC", 0.95, "A/M-series chips"], ["CO_AVGO", "CO_TSMC", 0.85, "custom XPU fab"], ["CO_TSMC", "CO_ASML", 0.95, "EUV lithography"],
  ["CO_SAMSUNG", "CO_ASML", 0.7, "EUV lithography"], ["CO_NVDA", "CO_SAMSUNG", 0.5, "HBM memory"], ["CO_AAPL", "CO_SAMSUNG", 0.45, "OLED / memory"], ["CO_AAPL", "R_CN", 0.75, "final assembly"],
  ["CO_AAPL", "R_SA", 0.4, "India assembly"], ["CO_TSLA", "R_CN", 0.7, "Shanghai gigafactory"], ["CO_TSLA", "CM_LITHIUM", 0.65, "battery cells"], ["CO_TOYOTA", "CM_LITHIUM", 0.3, "hybrids & EVs"],
  ["CO_MSFT", "CO_NVDA", 0.85, "GPU clusters"], ["CO_META", "CO_NVDA", 0.8, "GPU clusters"], ["CO_AMZN", "CO_NVDA", 0.7, "GPU clusters"], ["CO_GOOGL", "CO_AVGO", 0.8, "TPU co-design"],
  ["CO_GOOGL", "CO_NVDA", 0.5, "GPU cloud"], ["CO_TSMC", "R_EA", 0.9, "Taiwan concentration"], ["CO_LVMH", "R_CN", 0.6, "luxury demand"], ["CO_NESTLE", "R_SA", 0.35, "EM consumer"],
  ["CO_WMT", "R_CN", 0.45, "sourcing"], ["CO_TOYOTA", "R_NA", 0.55, "largest market"], ["CO_LLY", "CO_NOVO", 0.3, "GLP-1 duopoly"], ["CO_TCEHY", "R_CN", 0.6, "domestic consumer"],
].forEach(([a, b, w, l]) => add(a as string, b as string, "dependency", w as number, l as string));

// producers / users of commodities (trade)
[
  ["CO_ARAMCO", "CM_OIL", 1.0, "production"], ["CO_XOM", "CM_OIL", 0.8, "production"], ["CO_SHELL", "CM_OIL", 0.7, "production & trading"], ["CO_SHELL", "CM_LNG", 0.9, "LNG portfolio"],
  ["CO_RELIANCE", "CM_OIL", 0.7, "refining"], ["CO_XOM", "CM_LNG", 0.5, "LNG projects"],
  ["CM_OIL", "R_ME", 0.95, "export"], ["CM_OIL", "R_NA", 0.7, "shale output"], ["CM_OIL", "R_CN", 0.8, "imports"], ["CM_OIL", "R_SA", 0.6, "imports"], ["CM_OIL", "R_EU", 0.55, "imports"],
  ["CM_LNG", "R_NA", 0.75, "export"], ["CM_LNG", "R_EU", 0.75, "imports"], ["CM_LNG", "R_EA", 0.7, "imports"], ["CM_LNG", "R_ME", 0.7, "Qatar export"],
  ["CM_IRON", "R_OC", 0.95, "Pilbara export"], ["CM_IRON", "R_CN", 0.95, "steel input"], ["CM_IRON", "R_LA", 0.5, "Vale export"],
  ["CM_COPPER", "R_LA", 0.9, "Chile/Peru mines"], ["CM_COPPER", "R_CN", 0.85, "refining & demand"], ["CM_COPPER", "R_AF", 0.5, "DRC/Zambia"],
  ["CM_SOY", "R_LA", 0.9, "Brazil export"], ["CM_SOY", "R_NA", 0.6, "US export"], ["CM_SOY", "R_CN", 0.9, "imports"],
  ["CM_LITHIUM", "R_OC", 0.8, "spodumene"], ["CM_LITHIUM", "R_LA", 0.7, "brine"], ["CM_LITHIUM", "R_CN", 0.85, "refining"],
  ["CM_GOLD", "R_SA", 0.5, "jewelry demand"], ["CM_GOLD", "R_CN", 0.55, "investment demand"], ["CM_GOLD", "R_AF", 0.55, "mining"],
].forEach(([a, b, w, l]) => add(a as string, b as string, "trade", w as number, l as string));

// inter-regional trade
[
  ["R_NA", "R_EU", 0.9], ["R_NA", "R_CN", 0.7], ["R_EU", "R_CN", 0.8], ["R_EA", "R_CN", 0.85], ["R_NA", "R_EA", 0.7], ["R_SA", "R_CN", 0.65], ["R_SA", "R_NA", 0.55],
  ["R_ME", "R_EA", 0.6], ["R_ME", "R_CN", 0.65], ["R_ME", "R_SA", 0.55], ["R_EU", "R_ME", 0.45], ["R_AF", "R_CN", 0.45], ["R_AF", "R_EU", 0.5], ["R_OC", "R_CN", 0.75],
  ["R_LA", "R_CN", 0.6], ["R_LA", "R_NA", 0.6], ["R_EU", "R_SA", 0.45],
].forEach(([a, b, w]) => add(a as string, b as string, "trade", w as number, "goods trade"));

// passive & active ownership (capital)
const megacaps = ["CO_NVDA", "CO_AAPL", "CO_MSFT", "CO_GOOGL", "CO_AMZN", "CO_META", "CO_AVGO", "CO_TSLA", "CO_LLY", "CO_WMT", "CO_XOM", "BK_JPM"];
for (const c of megacaps) {
  add("IN_VG", c, "capital", 0.75, "index ownership ~8–9%");
  add("IN_BLK", c, "capital", 0.7, "index ownership ~6–7%");
}
["CO_NVDA", "CO_AAPL", "CO_MSFT", "CO_AMZN", "CO_GOOGL"].forEach((c) => add("IN_SST", c, "capital", 0.5, "SPDR / index ownership"));
["CO_NVDA", "CO_AAPL", "CO_MSFT", "CO_META", "CO_AMZN", "CO_LLY"].forEach((c) => add("IN_FID", c, "capital", 0.45, "active ownership"));
["CO_AAPL", "CO_MSFT", "CO_NVDA", "CO_ASML", "CO_NESTLE", "CO_NOVO", "CO_SHELL", "CO_LVMH", "CO_TSMC"].forEach((c) => add("IN_NBIM", c, "capital", 0.4, "~1–2% global stakes"));
add("IN_BRK", "CO_AAPL", "capital", 0.85, "top equity holding");
add("IN_BRK", "BK_BAC", "capital", 0.6, "major stake");
add("IN_BRK", "BD_UST", "capital", 0.8, "T-bill cash pile");
add("IN_BRK", "CO_XOM", "capital", 0.15, "energy exposure");
add("IN_PIF", "CO_ARAMCO", "capital", 0.9, "~16% stake");
add("IN_PIF", "R_NA", "capital", 0.4, "US tech & gaming stakes");
add("IN_ADIA", "R_NA", "capital", 0.5, "external managers");
add("IN_ADIA", "R_EU", "capital", 0.4, "multi-asset");
add("IN_CIC", "BK_ICBC", "capital", 0.9, "Central Huijin stake");
add("IN_CIC", "R_NA", "capital", 0.35, "overseas portfolio");
add("IN_GPIF", "BD_JGB", "capital", 0.75, "25% domestic bonds");
add("IN_GPIF", "BD_UST", "capital", 0.55, "25% foreign bonds");
add("IN_GPIF", "CO_TOYOTA", "capital", 0.4, "25% domestic equity");
add("IN_CALP", "R_NA", "capital", 0.5, "domestic equities");
add("IN_CALP", "BD_USIG", "capital", 0.4, "fixed income");
add("IN_BW", "BD_UST", "capital", 0.5, "risk-parity duration");
add("IN_BW", "CM_GOLD", "capital", 0.4, "inflation hedge");
add("IN_BW", "R_CN", "capital", 0.35, "China fund");
add("IN_CITADEL", "EX_NASDAQ", "exposure", 0.6, "market making");
add("IN_CITADEL", "EX_NYSE", "exposure", 0.55, "market making");
add("IN_CITADEL", "EX_CME", "exposure", 0.5, "rates & futures");
add("IN_BLK", "BD_USIG", "capital", 0.6, "bond ETFs");
add("IN_BLK", "FX_BTC", "capital", 0.55, "spot BTC ETF");
add("IN_FID", "FX_BTC", "capital", 0.35, "spot BTC ETF");
add("IN_VG", "BD_UST", "capital", 0.6, "bond index funds");
add("IN_NBIM", "BD_UST", "capital", 0.45, "fixed income");
add("IN_NBIM", "BD_BUND", "capital", 0.35, "fixed income");

// cross-border portfolio capital
[
  ["R_EA", "BD_UST", 0.85, "Japan: largest foreign UST holder"], ["R_CN", "BD_UST", 0.6, "reserve holdings"], ["R_EU", "BD_UST", 0.6, "UK/EU custody holdings"], ["R_ME", "BD_UST", 0.45, "petrodollar recycling"],
  ["R_EU", "R_NA", 0.6, "FDI & portfolio"], ["R_EA", "R_NA", 0.55, "FDI & portfolio"], ["R_NA", "R_SA", 0.45, "India FDI & EM funds"], ["R_NA", "BD_EMSOV", 0.5, "EM credit"],
].forEach(([a, b, w, l]) => add(a as string, b as string, "capital", w as number, l as string));

// derivatives venues
add("EX_CME", "BD_UST", "exposure", 0.75, "Treasury & SOFR futures");
add("EX_CME", "CM_OIL", "exposure", 0.6, "WTI futures");
add("EX_CME", "CM_GOLD", "exposure", 0.55, "COMEX gold");
add("EX_CME", "CM_SOY", "exposure", 0.5, "CBOT soybeans");
add("EX_CME", "FX_BTC", "exposure", 0.35, "BTC futures");
add("EX_HKEX", "EX_SSE", "dependency", 0.7, "Stock Connect");

// correlation structure
[
  ["CO_AAPL", "CO_MSFT", 0.7], ["CO_NVDA", "CO_AVGO", 0.8], ["CO_NVDA", "CO_TSMC", 0.8], ["CO_TSMC", "CO_ASML", 0.72], ["CO_MSFT", "CO_GOOGL", 0.65], ["CO_AMZN", "CO_MSFT", 0.6],
  ["CO_META", "CO_GOOGL", 0.68], ["CO_XOM", "CM_OIL", 0.78], ["CO_SHELL", "CM_OIL", 0.72], ["CO_ARAMCO", "CM_OIL", 0.6], ["FX_AUD", "CM_COPPER", 0.6], ["FX_AUD", "CM_IRON", 0.5],
  ["BD_UST", "BD_BUND", 0.7], ["BD_BUND", "BD_OAT", 0.88], ["BD_OAT", "BD_BTP", 0.72], ["BD_USIG", "BD_UST", 0.72], ["BD_USHY", "BK_JPM", 0.45], ["BD_GILT", "BD_UST", 0.6],
  ["FX_BTC", "CO_TSLA", 0.4], ["FX_BTC", "CO_NVDA", 0.35], ["CM_GOLD", "FX_USD", 0.45], ["FX_JPY", "BD_UST", 0.4], ["FX_EUR", "FX_CHF", 0.6], ["FX_CNY", "FX_AUD", 0.45],
  ["CO_LLY", "CO_NOVO", 0.5], ["CO_TCEHY", "CO_ALIBABA", 0.7], ["BK_JPM", "BK_BAC", 0.8], ["BK_GS", "BK_MS", 0.85], ["BK_BNP", "BK_BARC", 0.6], ["CO_LVMH", "CO_ALIBABA", 0.35],
  ["BD_EMSOV", "FX_USD", 0.5], ["CM_COPPER", "CO_TSLA", 0.25],
].forEach(([a, b, w]) => add(a as string, b as string, "correlation", w as number, "return co-movement"));

export const EDGES: NetEdge[] = E.filter((e) => NODE_MAP[e.s] && NODE_MAP[e.t] && e.s !== e.t);

export function neighbors(id: string): { node: NetNode; edge: NetEdge; dir: "out" | "in" }[] {
  const out: { node: NetNode; edge: NetEdge; dir: "out" | "in" }[] = [];
  for (const e of EDGES) {
    if (e.s === id) out.push({ node: NODE_MAP[e.t], edge: e, dir: "out" });
    else if (e.t === id) out.push({ node: NODE_MAP[e.s], edge: e, dir: "in" });
  }
  return out.sort((a, b) => b.edge.w - a.edge.w);
}

/** Simple centrality: weighted degree normalized 0..1 */
export const CENTRALITY: Record<string, number> = (() => {
  const d: Record<string, number> = {};
  for (const n of NODES) d[n.id] = 0;
  for (const e of EDGES) {
    d[e.s] += e.w;
    d[e.t] += e.w;
  }
  const mx = Math.max(...Object.values(d));
  for (const k in d) d[k] /= mx;
  return d;
})();

/**
 * Stress propagation (contagion) — breadth-first diffusion of a unit shock with
 * per-hop damping proportional to edge weight. Returns impact 0..1 and hop distance.
 */
export function propagateShock(source: string, damping = 0.62, edgeTypes?: Set<EdgeType>) {
  const impact: Record<string, number> = { [source]: 1 };
  const hop: Record<string, number> = { [source]: 0 };
  let frontier = [source];
  for (let h = 1; h <= 5 && frontier.length; h++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const e of EDGES) {
        if (edgeTypes && !edgeTypes.has(e.type)) continue;
        const other = e.s === id ? e.t : e.t === id ? e.s : null;
        if (!other) continue;
        const v = impact[id] * e.w * damping;
        if (v < 0.04) continue;
        if ((impact[other] ?? 0) < v) {
          impact[other] = v;
          if (hop[other] === undefined) {
            hop[other] = h;
            next.push(other);
          }
        }
      }
    }
    frontier = next;
  }
  return { impact, hop };
}
