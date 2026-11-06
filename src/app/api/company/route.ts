import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * SEC EDGAR XBRL "companyfacts" adapter. Requires SEC_USER_AGENT (the SEC asks for a
 * descriptive User-Agent with contact details). Returns the last five 10-K fiscal years.
 */

type Fact = { end: string; val: number; fy: number; fp: string; form: string; frame?: string; filed: string };
type Concept = { units: Record<string, Fact[]> };
type Facts = { entityName: string; facts: { "us-gaap"?: Record<string, Concept>; dei?: Record<string, Concept> } };

let tickerCache: { at: number; map: Record<string, { cik: number; title: string }> } | null = null;

async function tickers(ua: string) {
  if (tickerCache && Date.now() - tickerCache.at < 24 * 3600e3) return tickerCache.map;
  const r = await fetch("https://www.sec.gov/files/company_tickers.json", { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(8000) });
  const j = (await r.json()) as Record<string, { cik_str: number; ticker: string; title: string }>;
  const map: Record<string, { cik: number; title: string }> = {};
  for (const v of Object.values(j)) map[v.ticker.toUpperCase()] = { cik: v.cik_str, title: v.title };
  tickerCache = { at: Date.now(), map };
  return map;
}

function annual(facts: Facts, names: string[], unit = "USD"): Map<number, number> {
  const g = facts.facts["us-gaap"] ?? {};
  for (const n of names) {
    const c = g[n];
    const arr = c?.units?.[unit];
    if (!arr) continue;
    const m = new Map<number, number>();
    for (const f of arr) {
      if (f.form !== "10-K" || f.fp !== "FY") continue;
      const year = Number(f.end.slice(0, 4));
      // keep the latest-filed value for the period ending in that year
      if (!m.has(year) || f.frame) m.set(year, f.val);
    }
    if (m.size) return m;
  }
  return new Map();
}

export async function GET(req: Request) {
  const ua = process.env.SEC_USER_AGENT;
  const url = new URL(req.url);
  const q = (url.searchParams.get("ticker") ?? "").toUpperCase().trim();
  if (!ua) return NextResponse.json({ source: "none", error: "SEC_USER_AGENT not configured" });
  if (!/^[A-Z.\-]{1,8}$/.test(q)) return NextResponse.json({ error: "invalid ticker" }, { status: 400 });
  try {
    const map = await tickers(ua);
    const hit = map[q] ?? map[q.replace(".", "-")];
    if (!hit) return NextResponse.json({ error: "ticker not found in SEC registry" }, { status: 404 });
    const cik = String(hit.cik).padStart(10, "0");
    const r = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`, { headers: { "User-Agent": ua }, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return NextResponse.json({ error: `SEC returned ${r.status}` }, { status: 502 });
    const f = (await r.json()) as Facts;
    const B = 1e9;
    const rev = annual(f, ["RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "RevenueFromContractWithCustomerIncludingAssessedTax"]);
    const cogs = annual(f, ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold"]);
    const gp = annual(f, ["GrossProfit"]);
    const op = annual(f, ["OperatingIncomeLoss"]);
    const ni = annual(f, ["NetIncomeLoss"]);
    const ocf = annual(f, ["NetCashProvidedByUsedInOperatingActivities"]);
    const capex = annual(f, ["PaymentsToAcquirePropertyPlantAndEquipment"]);
    const assets = annual(f, ["Assets"]);
    const liab = annual(f, ["Liabilities"]);
    const eq = annual(f, ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"]);
    const ltd = annual(f, ["LongTermDebt", "LongTermDebtNoncurrent"]);
    const cash = annual(f, ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"]);
    const eps = annual(f, ["EarningsPerShareDiluted", "EarningsPerShareBasic"], "USD/shares");
    const shares = annual(f, ["WeightedAverageNumberOfDilutedSharesOutstanding"], "shares");
    const da = annual(f, ["DepreciationDepletionAndAmortization", "DepreciationAndAmortization", "Depreciation"]);
    const years = [...rev.keys()].sort().slice(-5);
    const rows = years.map((y) => {
      const revenue = (rev.get(y) ?? 0) / B;
      const grossProfit = gp.has(y) ? gp.get(y)! / B : cogs.has(y) ? revenue - cogs.get(y)! / B : NaN;
      const totalAssets = (assets.get(y) ?? NaN) / B;
      const equity = (eq.get(y) ?? NaN) / B;
      return {
        fy: `FY${y}`,
        revenue,
        grossProfit,
        operatingIncome: (op.get(y) ?? NaN) / B,
        netIncome: (ni.get(y) ?? NaN) / B,
        fcf: ((ocf.get(y) ?? NaN) - (capex.get(y) ?? 0)) / B,
        totalAssets,
        totalLiabilities: liab.has(y) ? liab.get(y)! / B : totalAssets - equity,
        debt: (ltd.get(y) ?? 0) / B,
        cash: (cash.get(y) ?? 0) / B,
        eps: eps.get(y) ?? NaN,
        shares: (shares.get(y) ?? NaN) / B,
        da: (da.get(y) ?? 0) / B,
        equity,
      };
    });
    return NextResponse.json({
      source: "sec",
      profile: {
        ticker: q,
        name: f.entityName ?? hit.title,
        sector: "—",
        industry: "SEC filer",
        hq: "—",
        fyEnd: "per 10-K",
        description: `Financial data parsed live from SEC EDGAR XBRL company facts (CIK ${cik}). Tag coverage varies by filer.`,
        years: rows,
        source: "LIVE",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
