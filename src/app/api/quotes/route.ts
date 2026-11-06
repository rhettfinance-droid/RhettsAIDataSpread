import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FinnhubQuote = { c: number; pc: number; h: number; l: number; t: number };

/**
 * Live quote proxy (Finnhub). The API key stays on the server.
 * Returns { source: "none" } when no key is configured so the client keeps its simulated feed.
 */
export async function GET(req: Request) {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return NextResponse.json({ source: "none", quotes: [] });
  const url = new URL(req.url);
  const symbols = (url.searchParams.get("symbols") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z.]{1,8}$/.test(s))
    .slice(0, 40);
  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol.replace(".", "-"))}&token=${key}`, {
          next: { revalidate: 15 },
          signal: AbortSignal.timeout(6000),
        });
        if (!r.ok) return null;
        const q = (await r.json()) as FinnhubQuote;
        if (!q || !q.c) return null;
        return { symbol, price: q.c, prevClose: q.pc, high: q.h, low: q.l, ts: q.t * 1000 };
      } catch {
        return null;
      }
    }),
  );
  return NextResponse.json({ source: "finnhub", quotes: results.filter(Boolean) });
}
