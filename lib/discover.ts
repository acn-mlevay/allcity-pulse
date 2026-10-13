import type { Discovered, FeedConfig, Market } from "./types";
import { fetchText, youtubeFeedUrl } from "./rss";

const REFRESH_MS = 24 * 3600 * 1000;

/**
 * Reads a market homepage for its article RSS feed and YouTube channel.
 * Article feed falls back to WordPress's default /feed/ path.
 */
export async function discoverSite(site: string): Promise<Discovered> {
  const base = site.replace(/\/$/, "");
  const out: Discovered = { at: new Date().toISOString(), errors: [] };
  let html = "";
  try {
    html = await fetchText(base);
  } catch (e) {
    out.errors.push(`homepage: ${(e as Error).message}`);
  }

  const rssTag = (html.match(/<link[^>]+application\/rss\+xml[^>]*>/gi) || []).find((t) => !/comments/i.test(t));
  const href = rssTag?.match(/href=["']([^"']+)["']/)?.[1];
  out.articles = href ? new URL(href, base).toString() : `${base}/feed/`;

  const yt = html.match(/https?:\/\/(?:www\.)?youtube\.com\/(@[\w.-]+|channel\/UC[\w-]{22})/)?.[1];
  if (yt) {
    try {
      out.youtube = await youtubeFeedUrl(yt);
    } catch (e) {
      out.errors.push(`youtube: ${(e as Error).message}`);
    }
  } else if (html) {
    out.errors.push("youtube: no channel link on homepage");
  }
  return out;
}

export async function refreshDiscovery(market: Market, previous?: Discovered): Promise<Discovered | undefined> {
  if (!market.site) return undefined;
  if (previous && Date.now() - new Date(previous.at).getTime() < REFRESH_MS && previous.youtube) return previous;
  return discoverSite(market.site);
}

export function discoveredFeeds(d?: Discovered): FeedConfig[] {
  if (!d) return [];
  const feeds: FeedConfig[] = [];
  if (d.articles) feeds.push({ url: d.articles, type: "article" });
  if (d.youtube) feeds.push({ url: d.youtube, type: "video" });
  return feeds;
}
