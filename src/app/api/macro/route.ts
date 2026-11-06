import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** FRED series used by the Macro module; transform turns index levels into YoY %. */
const SERIES: Record<string, { id: string; transform?: "yoy" | "bil2tril" | "mil2tril" }> = {
  fedfunds: { id: "FEDFUNDS" },
  cpi: { id: "CPIAUCSL", transform: "yoy" },
  corePce: { id: "PCEPILFE", transform: "yoy" },
  unemployment: { id: "UNRATE" },
  gdp: { id: "A191RL1Q225SBEA" },
  y10: { id: "GS10" },
  y2: { id: "GS2" },
  sentiment: { id: "UMCSENT" },
  debt: { id: "GFDEBTN", transform: "mil2tril" },
  fedBalance: { id: "WALCL", transform: "mil2tril" },
};

type Obs = { date: string; value: string };

export async function GET() {
  const key = process.env.FRED_API_KEY;
  if (!key) return NextResponse.json({ source: "none" });
  const start = "1989-01-01";
  const out: Record<string, { t: string; v: number }[]> = {};
  await Promise.all(
    Object.entries(SERIES).map(async ([name, cfg]) => {
      try {
        const freq = cfg.id === "WALCL" ? "&frequency=m&aggregation_method=eop" : "";
        const r = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${cfg.id}&api_key=${key}&file_type=json&observation_start=${start}${freq}`,
          { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
        );
        if (!r.ok) return;
        const j = (await r.json()) as { observations: Obs[] };
        let pts = j.observations.filter((o) => o.value !== ".").map((o) => ({ t: o.date, v: Number(o.value) }));
        if (cfg.transform === "yoy") {
          pts = pts.slice(12).map((p, i) => ({ t: p.t, v: (p.v / pts[i].v - 1) * 100 }));
        } else if (cfg.transform === "mil2tril") {
          pts = pts.map((p) => ({ t: p.t, v: p.v / 1e6 }));
        }
        out[name] = pts;
      } catch {
        /* skip series on failure */
      }
    }),
  );
  return NextResponse.json({ source: "fred", series: out });
}
