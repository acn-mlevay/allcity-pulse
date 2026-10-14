import { MARKETS } from "@/config/markets";
import type { ContentItem, ContentType, Market, MarketIndex } from "./types";
import { feedsFor, refreshDiscovery } from "./discover";
import { backfillChannel, youtubeApiEnabled } from "./youtube";
import { fetchFeedWithMeta } from "./rss";
import { mergeLive } from "./live";
import { RENEW_AFTER_MS, publicBaseUrl, subscribe } from "./websub";
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

  // Configured feeds win over discovered ones of the same type.
  const feeds = feedsFor(market, discovered, types);

  const hubs = { ...(previous?.hubs || {}) };
  const showImages = { ...(previous?.showImages || {}) };
  const fresh: ContentItem[] = [];
  const feedResults = await mapLimit(feeds, 6, (f) => fetchFeedWithMeta(f, market.slug));
  feedResults.forEach((r, i) => {
    if (r.status === "fulfilled") {
      for (const item of r.value.items) byId.set(item.id, { ...byId.get(item.id), ...item });
      fresh.push(...r.value.items);
      const img = r.value.image;
      const showName = feeds[i].show || r.value.items[0]?.show;
      if (img && showName) showImages[showName] = img;
      const h = r.value.hub;
      if (h) hubs[feeds[i].url] = { ...hubs[feeds[i].url], ...h };
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

  // WebSub: (re)subscribe to every hub-enabled feed so new items are pushed to us.
  if (!types && publicBaseUrl()) {
    await mapLimit(Object.entries(hubs), 6, async ([feedUrl, h]) => {
      if (h.subscribedAt && Date.now() - new Date(h.subscribedAt).getTime() < RENEW_AFTER_MS) return;
      try {
        await subscribe(h.hub, h.topic, market.slug, feedUrl);
        hubs[feedUrl] = { ...h, subscribedAt: new Date().toISOString() };
      } catch (e) {
        feedErrors.push({ url: feedUrl, error: `websub: ${(e as Error).message}` });
      }
    });
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
    fullAt: types ? previous?.fullAt : new Date().toISOString(),
    items,
    trends: market.trendSource === "all" ? [] : trends,
    feedErrors,
    discovered,
    youtubeBackfill,
    hubs,
    showImages,
  };
  await writeIndex(index);
  // Keep the live feed's store current, including discovery info for its refresh.
  await mergeLive(fresh, discovered ? { discovered: { [market.slug]: discovered } } : {});
  return { market: market.slug, feeds: feeds.length, items: items.length, trends: index.trends.length, feedErrors };
}

export async function ingestAll(only?: string, types?: ContentType[]) {
  const targets = only ? MARKETS.filter((m) => m.slug === only) : MARKETS;
  const out = [];
  for (const m of targets) out.push(await ingestMarket(m, types));
  return out;
}
