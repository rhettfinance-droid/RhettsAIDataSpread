import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Reports which optional data providers are configured. Never returns key values. */
export function GET() {
  return NextResponse.json({
    finnhub: !!process.env.FINNHUB_API_KEY,
    fred: !!process.env.FRED_API_KEY,
    sec: !!process.env.SEC_USER_AGENT,
  });
}
