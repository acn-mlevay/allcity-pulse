import { NextRequest, NextResponse, after } from "next/server";
import { markChainStarted, triggerStep } from "@/lib/chain";
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
 * Chain (used by the daily cron): /api/ingest?chain=0 answers immediately,
 * refreshes market 0 in the background, then calls ?chain=1, and so on.
 *
 * Other cron calls honor the refresh setting (daily / frequent). Manual calls always run.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!secret && process.env.VERCEL_ENV === "production") {
    return NextResponse.json({ error: "Set CRON_SECRET before running ingest in production." }, { status: 500 });
  }
  const chain = req.nextUrl.searchParams.get("chain");
  if (chain !== null) {
    const step = Math.max(0, Number(chain) || 0);
    const m = MARKETS[step];
    if (!m) return NextResponse.json({ ok: true, done: true });
    after(async () => {
      if (step === 0) await markChainStarted().catch(() => {});
      try {
        await ingestMarket(m);
      } catch (e) {
        console.error(`chain ${m.slug}:`, e);
      }
      await triggerStep(step + 1).catch((e) => console.error("chain next:", e));
    });
    return NextResponse.json({ ok: true, chain: step, market: m.slug }, { status: 202 });
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
