import { NextRequest, NextResponse, after } from "next/server";
import { getLive, LIVE_WINDOWS } from "@/lib/data";
import { maybeRefreshLive } from "@/lib/live";
import { maybeStartChain } from "@/lib/chain";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Polled by the live page. Returns the current window, then (after the
 * response) refreshes video/article/FAST feeds if the last refresh is over a
 * minute old, so the next poll picks up anything new.
 */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const hours = LIVE_WINDOWS.includes(Number(p.get("hours")) as (typeof LIVE_WINDOWS)[number]) ? Number(p.get("hours")) : 24;
  const data = await getLive(p.get("market") || "all", p.get("type") || "all", hours);
  after(() => maybeRefreshLive().catch(() => {}));
  after(() => maybeStartChain().catch(() => {}));
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
