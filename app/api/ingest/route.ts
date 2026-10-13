import { NextRequest, NextResponse } from "next/server";
import { ingestAll } from "@/lib/ingest";
import type { ContentType } from "@/lib/types";

const TYPES: ContentType[] = ["audio", "video", "article", "fast"];

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Pulls every feed and refreshes trends. Called by Vercel Cron (see vercel.json).
 * Manual run: curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/ingest
 * One market: /api/ingest?market=phly
 * Fast lane (live feed, no trend refresh): /api/ingest?types=video,article,fast
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!secret && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Set CRON_SECRET before running ingest in production." }, { status: 500 });
  }
  const market = req.nextUrl.searchParams.get("market") || undefined;
  const typesParam = req.nextUrl.searchParams.get("types");
  const types = typesParam
    ? (typesParam.split(",").filter((t) => TYPES.includes(t as ContentType)) as ContentType[])
    : undefined;
  const results = await ingestAll(market, types);
  return NextResponse.json({ ok: true, results });
}
