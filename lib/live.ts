import { MARKETS, MARKET_BY_SLUG } from "@/config/markets";
import type { ContentItem, Discovered, FeedConfig, LiveStore } from "./types";
import { fetchFeed, parseItems } from "./rss";
import { feedsFor } from "./discover";
import { mapLimit } from "./pool";
import { readLive, writeLive } from "./store";
import { liveStates, youtubeApiEnabled } from "./youtube";

/**
 * The live store: the last ~8 days of everything, small enough to read on
 * every poll. Fed by full ingests, WebSub pushes, and the on-view refresh.
 */
const KEEP_MS = 8 * 864e5;
const SNIPPET = 300;
const REFRESH_EVERY_MS = 60_000;

const slim = (i: ContentItem): ContentItem => ({
  ...i,
  description: i.description.length > SNIPPET ? i.description.slice(0, SNIPPET) + "..." : i.description,
  transcript: undefined,
});

function recent(i: ContentItem, now: number) {
  if (!i.date) return false;
  const t = new Date(i.date).getTime();
  return t >= now - KEEP_MS || i.live === "live" || i.live === "upcoming";
}

/** Merges items (and optional discovery info) into the live store. */
export async function mergeLive(
  items: ContentItem[],
  patch: { refreshedAt?: string; discovered?: Record<string, Discovered> } = {}
) {
  const store = await readLive();
  const now = Date.now();
  const byId = new Map(store.items.map((i) => [i.id, i]));
  for (const i of items) if (recent(i, now)) byId.set(i.id, slim({ ...byId.get(i.id), ...i }));
  const next: LiveStore = {
    ...store,
    ...(patch.refreshedAt ? { refreshedAt: patch.refreshedAt } : {}),
    discovered: { ...(store.discovered || {}), ...(patch.discovered || {}) },
    items: [...byId.values()].filter((i) => recent(i, now)).sort((a, b) => (b.date || "").localeCompare(a.date || "")),
  };
  await writeLive(next);
  return next;
}

/**
 * Light refresh: YouTube, article, and FAST feeds for every market (podcast
 * feeds are too large to poll; new episodes arrive by WebSub push or the
 * scheduled ingest). Plus YouTube live/upcoming state when an API key is set.
 */
async function refreshLive(store: LiveStore) {
  const startedAt = new Date().toISOString();
  const jobs: { feed: FeedConfig; market: string }[] = MARKETS.flatMap((m) =>
    feedsFor(m, store.discovered?.[m.slug], ["video", "article", "fast"]).map((feed) => ({ feed, market: m.slug }))
  );
  const results = await mapLimit(jobs, 8, (j) => fetchFeed(j.feed, j.market));
  const items = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

  // Live state for videos from the last two days, plus anything already marked live.
  const cutoff = Date.now() - 2 * 864e5;
  const candidates = [...items, ...store.items].filter(
    (i) => i.videoId && (i.live || (i.date && new Date(i.date).getTime() > cutoff))
  );
  const ids = [...new Set(candidates.map((i) => i.videoId!))].slice(0, 50);
  if (youtubeApiEnabled()) {
    try {
      const states = await liveStates(ids);
      const byVideo = new Map(candidates.map((i) => [i.videoId!, i]));
      for (const id of ids) {
        const item = byVideo.get(id);
        if (item) items.push({ ...item, live: states[id] });
      }
    } catch {
      // Live state is best-effort.
    }
  }
  await mergeLive(items, { refreshedAt: startedAt });
}

let inFlight: Promise<void> | null = null;

/** Refreshes at most once a minute, and only while someone has the live page open. */
export async function maybeRefreshLive() {
  if (inFlight) return inFlight;
  const store = await readLive();
  if (store.refreshedAt && Date.now() - new Date(store.refreshedAt).getTime() < REFRESH_EVERY_MS) return;
  inFlight = refreshLive(store).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/** Handles a WebSub push for one of our feeds. */
export async function applyPush(marketSlug: string, feedUrl: string, xml: string) {
  const market = MARKET_BY_SLUG[marketSlug];
  if (!market) throw new Error("unknown market");
  const store = await readLive();
  const feed = feedsFor(market, store.discovered?.[marketSlug]).find((f) => f.url === feedUrl);
  if (!feed) throw new Error("unknown feed");
  const items = await parseItems(xml, feed, marketSlug);
  if (items.length) await mergeLive(items);
  return items.length;
}
