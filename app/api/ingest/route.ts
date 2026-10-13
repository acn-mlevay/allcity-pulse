import { NextRequest, NextResponse } from "next/server";
import { ingestAll, ingestMarket } from "@/lib/ingest";
import { MARKETS } from "@/config/markets";
import { readIndex, readSettings } from "@/lib/store";
import { shouldRunCron } from "@/lib/schedule";
import type { ContentType } from "@/lib/types";

const TYPES: ContentType[] = ["audio", "video", "article", "fast"];

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Pulls every feed and refreshes trends. Called by Vercel Cron (see vercel.json).
 * Manual run: curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/ingest
 * One market: /api/ingest?market=phly
 * Fast lane (live feed, no trend refresh): /api/ingest?types=video,article,fast
 *
 * Cron calls honor the refresh setting (daily / frequent, toggled in the UI).
 * Manual calls always run.
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
  const fromCron = (req.headers.get("user-agent") || "").includes("vercel-cron");
  if (!fromCron) return NextResponse.json({ ok: true, results: await ingestAll(market, types) });

  const { refreshMode } = await readSettings();
  const targets = market ? MARKETS.filter((m) => m.slug === market) : MARKETS;
  const results = [];
  for (const m of targets) {
    if (!shouldRunCron(refreshMode, Boolean(types), await readIndex(m.slug))) {
      results.push({ market: m.slug, skipped: `refresh mode: ${refreshMode}` });
      continue;
    }
    results.push(await ingestMarket(m, types));
  }
  return NextResponse.json({ ok: true, refreshMode, results });
}
