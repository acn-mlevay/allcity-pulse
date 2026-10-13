import { MARKETS } from "@/config/markets";
import type { Match, MarketIndex, Trend } from "./types";
import { matchTrend, search, toSearchable, type Searchable } from "./match";
import { readIndex } from "./store";

let cache: { key: string; indexes: MarketIndex[]; pool: Searchable[] } | null = null;

/** Loads every market index; re-normalizes content only when something changed. */
export async function loadAll() {
  const indexes = (await Promise.all(MARKETS.map((m) => readIndex(m.slug)))).filter(
    (x): x is MarketIndex => x !== null
  );
  const key = indexes.map((i) => `${i.market}@${i.updatedAt}`).join("|");
  if (!cache || cache.key !== key) {
    cache = { key, indexes, pool: toSearchable(indexes.flatMap((i) => i.items)) };
  }
  return cache;
}

export interface TrendView {
  trend: Trend;
  matches: Match[];
}

export async function getView(marketSlug: string, query: string) {
  const { indexes, pool } = await loadAll();
  const market = MARKETS.find((m) => m.slug === marketSlug);
  const allTrends = indexes.flatMap((i) => i.trends).sort((a, b) => b.score - a.score);

  let trends: Trend[];
  let prefer: string | undefined;
  if (!market) trends = allTrends.slice(0, 24);
  else if (market.trendSource === "all") {
    trends = allTrends.slice(0, 24);
    prefer = market.slug;
  } else trends = indexes.find((i) => i.market === market.slug)?.trends || [];

  // Creator Network view ranks creator content first; others rank their own market first.
  const views: TrendView[] = trends.map((trend) => ({
    trend,
    matches: matchTrend(trend, pool, prefer ?? trend.market),
  }));

  const results = query ? search(query, pool) : [];
  const updated = indexes.map((i) => i.updatedAt).sort().pop() || null;
  const counts = Object.fromEntries(
    indexes.map((i) => [i.market, { items: i.items.length, trends: i.trends.length, errors: i.feedErrors.length }])
  );
  return { market, views, results, updated, counts, totalItems: pool.length };
}

export const LIVE_WINDOWS = [6, 24, 72, 168] as const;
const LIVE_LIMIT = 400;

/** Everything published inside the window, newest first. */
export async function getLive(marketSlug: string, type: string, hours: number) {
  const { indexes } = await loadAll();
  const since = Date.now() - hours * 3600 * 1000;
  const inWindow = indexes
    .flatMap((i) => i.items)
    .filter((i) => i.date && new Date(i.date).getTime() >= since && new Date(i.date).getTime() <= Date.now() + 5 * 60000);

  const byMarket: Record<string, number> = {};
  for (const i of inWindow) byMarket[i.market] = (byMarket[i.market] || 0) + 1;

  const scoped = inWindow.filter((i) => marketSlug === "all" || i.market === marketSlug);
  const byType: Record<string, number> = {};
  for (const i of scoped) byType[i.type] = (byType[i.type] || 0) + 1;

  const items = scoped
    .filter((i) => type === "all" || i.type === type)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const updated = indexes.map((i) => i.updatedAt).sort().pop() || null;
  return { items: items.slice(0, LIVE_LIMIT), total: items.length, byMarket: { all: inWindow.length, ...byMarket }, byType, updated };
}
