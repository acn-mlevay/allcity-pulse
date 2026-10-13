import { MARKETS } from "@/config/markets";
import type { ContentItem, ContentType, Market, MarketIndex } from "./types";
import { discoveredFeeds, refreshDiscovery } from "./discover";
import { backfillChannel, youtubeApiEnabled } from "./youtube";
import { fetchFeed } from "./rss";
import { buildTrends } from "./trends";
import { mapLimit } from "./pool";
import { readIndex, writeIndex } from "./store";

/** Items are kept after they fall out of a feed, so the archive grows over time. */
const MAX_ITEMS_PER_MARKET = 25000;

/**
 * types: refresh only these content types (the fast lane for the live feed);
 * trends are left as they are. Omit for a full refresh.
 */
export async function ingestMarket(market: Market, types?: ContentType[]) {
  const previous = await readIndex(market.slug);
  const byId = new Map<string, ContentItem>((previous?.items || []).map((i) => [i.id, i]));
  const feedErrors: MarketIndex["feedErrors"] = [];

  let discovered = previous?.discovered;
  try {
    discovered = await refreshDiscovery(market, discovered);
  } catch (e) {
    feedErrors.push({ url: market.site || "", error: `discovery: ${(e as Error).message}` });
  }
  for (const err of discovered?.errors || []) feedErrors.push({ url: market.site || "", error: err });

  // Configured feeds win: skip a discovered feed when the market already lists that type.
  const configuredTypes = new Set(market.feeds.map((f) => f.type));
  let feeds = [...market.feeds, ...discoveredFeeds(discovered).filter((f) => !configuredTypes.has(f.type))];
  if (types) feeds = feeds.filter((f) => types.includes(f.type));

  const feedResults = await mapLimit(feeds, 6, (f) => fetchFeed(f, market.slug));
  feedResults.forEach((r, i) => {
    if (r.status === "fulfilled") {
      for (const item of r.value) byId.set(item.id, { ...byId.get(item.id), ...item });
    } else {
      feedErrors.push({ url: feeds[i].url, error: String(r.reason?.message || r.reason) });
    }
  });

  // Full YouTube history, once per channel, on full (not fast-lane) runs.
  const youtubeBackfill = { ...(previous?.youtubeBackfill || {}) };
  if (!types && youtubeApiEnabled()) {
    for (const f of feeds.filter((f) => f.type === "video" && /youtube/.test(f.url))) {
      if (youtubeBackfill[f.url]?.done) continue;
      try {
        const { items: videos, state } = await backfillChannel(f, market.slug, youtubeBackfill[f.url]);
        for (const v of videos) byId.set(v.id, { ...byId.get(v.id), ...v });
        youtubeBackfill[f.url] = state;
      } catch (e) {
        feedErrors.push({ url: f.url, error: `youtube backfill: ${(e as Error).message}` });
      }
    }
  }

  let trends = previous?.trends || [];
  try {
    if (!types && market.trendSource !== "all") trends = await buildTrends(market);
  } catch (e) {
    feedErrors.push({ url: "google-news", error: String((e as Error).message || e) });
  }

  const items = [...byId.values()]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, MAX_ITEMS_PER_MARKET);

  const index: MarketIndex = {
    market: market.slug,
    updatedAt: new Date().toISOString(),
    items,
    trends: market.trendSource === "all" ? [] : trends,
    feedErrors,
    discovered,
    youtubeBackfill,
  };
  await writeIndex(index);
  return { market: market.slug, feeds: feeds.length, items: items.length, trends: index.trends.length, feedErrors };
}

export async function ingestAll(only?: string, types?: ContentType[]) {
  const targets = only ? MARKETS.filter((m) => m.slug === only) : MARKETS;
  const out = [];
  for (const m of targets) out.push(await ingestMarket(m, types));
  return out;
}
