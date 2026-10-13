import Parser from "rss-parser";
import type { ContentItem, FeedConfig, Headline } from "./types";
import { stripHtml } from "./text";

type AnyItem = Record<string, any>;

const parser: Parser<AnyItem, AnyItem> = new Parser({
  customFields: {
    item: [
      ["media:group", "mediaGroup"],
      ["source", "source"],
      ["itunes:summary", "itunesSummary"],
      ["itunes:image", "itunesImage"],
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent", { keepArray: true }],
      ["yt:videoId", "ytVideoId"],
    ],
  },
});

const DESCRIPTION_LIMIT = 1500;

/** Show-note boilerplate (sponsor reads, subscribe links) starts at the first of these. */
const BOILERPLATE = [
  "become a diehard", "join the supporters club", "an allcity network production", "subscribe to our",
  "all things phnx", "hosted by simplecast", "see omnystudio", "merch http", "use code", "follow us",
];

export function cutBoilerplate(text: string): string {
  const lower = text.toLowerCase();
  let end = text.length;
  for (const m of BOILERPLATE) {
    const i = lower.indexOf(m);
    if (i > 40 && i < end) end = i;
  }
  return text.slice(0, end).trim();
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;

/**
 * Simplecast feeds often use the show's homepage as every episode's <link>.
 * In that case point to the Simplecast player page for the episode instead.
 */
function episodeLink(item: AnyItem, channelLink: string, dupes: Set<string>): string {
  const link: string = item.link || "";
  if (link && link !== channelLink && !dupes.has(link)) return link;
  const enc: string = item.enclosure?.url || "";
  const id = enc.match(/awEpisodeId=([0-9a-f-]{36})/)?.[1] || enc.match(new RegExp("episodes/(" + UUID.source + ")"))?.[1];
  if (id) return `https://player.simplecast.com/${id}`;
  return link || enc;
}

export async function fetchText(url: string, timeoutMs = 15000, headers: Record<string, string> = {}): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ALLCITY-Pulse/0.1)", ...headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function pickDescription(item: AnyItem): string {
  const yt = item.mediaGroup?.["media:description"]?.[0];
  const raw =
    item.itunesSummary ||
    item.contentSnippet ||
    (typeof yt === "string" ? yt : "") ||
    item.summary ||
    item.content ||
    "";
  const text = cutBoilerplate(stripHtml(String(raw)));
  return text.length > DESCRIPTION_LIMIT ? text.slice(0, DESCRIPTION_LIMIT) + "..." : text;
}

function pickThumbnail(item: AnyItem): string | undefined {
  const attr = (x: any) => (x && typeof x === "object" ? x.$?.url || x.$?.href : undefined);
  const media = item.mediaContent?.find?.((m: any) => /image/.test(m?.$?.medium || m?.$?.type || "image"));
  return (
    attr(item.mediaGroup?.["media:thumbnail"]?.[0]) ||
    attr(item.mediaThumbnail) ||
    attr(media) ||
    attr(item.itunesImage) ||
    (typeof item.itunes?.image === "string" ? item.itunes.image : undefined) ||
    (/^image\//.test(item.enclosure?.type || "") ? item.enclosure.url : undefined)
  );
}

function youTubeId(item: AnyItem): string | undefined {
  const id = item.ytVideoId || String(item.id || "").match(/^yt:video:([\w-]{11})$/)?.[1];
  if (id) return id;
  return String(item.link || "").match(/youtube\.com\/watch\?v=([\w-]{11})/)?.[1];
}

function pickDate(item: AnyItem): string | null {
  const raw = item.isoDate || item.pubDate || item.published;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface FeedResult {
  items: ContentItem[];
  /** WebSub hub and topic, when the feed advertises them. */
  hub?: { hub: string; topic: string };
}

export async function fetchFeed(feed: FeedConfig, market: string): Promise<ContentItem[]> {
  return (await fetchFeedWithMeta(feed, market)).items;
}

export async function fetchFeedWithMeta(feed: FeedConfig, market: string): Promise<FeedResult> {
  const url = feed.url.startsWith("youtube:") ? await youtubeFeedUrl(feed.url.slice(8)) : feed.url;
  const xml = await fetchText(url);
  const items = await parseItems(xml, feed, market);
  return { items, hub: findHub(xml, url) };
}

/** Pulls <link rel="hub"> and <link rel="self"> out of RSS (atom:link) or Atom. */
export function findHub(xml: string, fallbackTopic: string) {
  const head = xml.slice(0, 20000);
  const links = head.match(/<(?:atom:)?link\b[^>]*>/gi) || [];
  const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1];
  const hub = links.find((l) => attr(l, "rel") === "hub");
  const self = links.find((l) => attr(l, "rel") === "self");
  const hubUrl = hub && attr(hub, "href");
  if (!hubUrl) return undefined;
  return { hub: hubUrl, topic: (self && attr(self, "href")) || fallbackTopic };
}

/** Parses a full feed or a WebSub push payload into items. */
export async function parseItems(xml: string, feed: FeedConfig, market: string): Promise<ContentItem[]> {
  const parsed = await parser.parseString(xml);
  const show = feed.show || stripHtml(parsed.title || "") || feed.url;
  const items = parsed.items || [];
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const i of items) if (i.link) (seen.has(i.link) ? dupes : seen).add(i.link);

  return items
    .map((item): ContentItem | null => {
      const link = episodeLink(item, parsed.link || "", dupes);
      const id = String(item.guid || item.id || link || "");
      const title = stripHtml(String(item.title || ""));
      if (!id || !title) return null;
      return {
        id: `${market}:${id}`,
        market,
        type: feed.type,
        show,
        title,
        description: pickDescription(item),
        link,
        date: pickDate(item),
        thumbnail: pickThumbnail(item),
        ...(item.enclosure?.url && (/^audio\//.test(item.enclosure.type || "") || feed.type === "audio")
          ? { audio: item.enclosure.url as string }
          : {}),
        ...(youTubeId(item) ? { videoId: youTubeId(item) } : {}),
      };
    })
    .filter((x): x is ContentItem => x !== null);
}

/** Google News search feed for one query. Titles end in " - Source". */
export async function fetchGoogleNews(query: string): Promise<Headline[]> {
  const url =
    "https://news.google.com/rss/search?q=" +
    encodeURIComponent(query) +
    "&hl=en-US&gl=US&ceid=US:en";
  const xml = await fetchText(url);
  const parsed = await parser.parseString(xml);
  return (parsed.items || []).map((item) => {
    const sourceField = item.source;
    const source =
      (typeof sourceField === "string" ? sourceField : sourceField?._) ||
      String(item.title || "").split(" - ").pop() ||
      "";
    let title = stripHtml(String(item.title || ""));
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    return { title, source, link: item.link || "", date: pickDate(item) };
  });
}

/**
 * Turns "@Handle", "channel/UC...", or a youtube.com URL into the channel's
 * RSS feed URL. Handles are resolved by reading the channel page.
 */
export async function youtubeFeedUrl(ref: string): Promise<string> {
  const direct = ref.match(/(UC[\w-]{22})/)?.[1];
  if (direct && !ref.includes("@")) return `https://www.youtube.com/feeds/videos.xml?channel_id=${direct}`;
  const handle = ref.match(/@[\w.-]+/)?.[0];
  if (!handle) throw new Error(`Unrecognized YouTube reference: ${ref}`);
  const html = await fetchText(`https://www.youtube.com/${handle}`, 15000, {
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: "CONSENT=YES+1",
  });
  const id =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ||
    html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] ||
    html.match(/"channelId":"(UC[\w-]{22})"/)?.[1];
  if (!id) throw new Error(`Could not resolve YouTube channel for ${handle}`);
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
}
