import type { ContentItem, FeedConfig, YouTubeBackfill } from "./types";
import { cutBoilerplate } from "./rss";
import { stripHtml } from "./text";

/**
 * One-time backfill of a channel's full upload history via the YouTube Data
 * API (the channel RSS feed only carries the latest 15 videos). Needs
 * YOUTUBE_API_KEY. Costs 1 quota unit per 50 videos; resumes where it left
 * off if a run is cut short.
 */
const API = "https://www.googleapis.com/youtube/v3";
const MAX_PAGES_PER_RUN = 400; // 20,000 videos
const DESCRIPTION_LIMIT = 1500;

export const youtubeApiEnabled = () => Boolean(process.env.YOUTUBE_API_KEY);

async function api(path: string, params: Record<string, string>) {
  const q = new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! });
  const res = await fetch(`${API}/${path}?${q}`, { signal: AbortSignal.timeout(15000), cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${body?.error?.message || res.statusText}`);
  return body;
}

/** "youtube:@Handle" or a videos.xml?channel_id=UC... feed URL -> lookup params. */
function channelLookup(feed: FeedConfig): Record<string, string> | null {
  const handle = feed.url.match(/@[\w.-]+/)?.[0];
  if (handle) return { forHandle: handle };
  const id = feed.url.match(/channel_id=(UC[\w-]{22})/)?.[1];
  return id ? { id } : null;
}

export async function backfillChannel(
  feed: FeedConfig,
  market: string,
  state?: YouTubeBackfill
): Promise<{ items: ContentItem[]; state: YouTubeBackfill }> {
  const lookup = channelLookup(feed);
  if (!lookup) throw new Error(`Not a YouTube feed: ${feed.url}`);

  let uploads = state?.uploads;
  let show = feed.show;
  if (!uploads) {
    const ch = await api("channels", { part: "contentDetails,snippet", ...lookup });
    const c = ch.items?.[0];
    if (!c) throw new Error(`YouTube channel not found for ${feed.url}`);
    uploads = c.contentDetails.relatedPlaylists.uploads as string;
    show = show || c.snippet?.title;
  }

  const items: ContentItem[] = [];
  let pageToken = state?.pageToken;
  let pages = 0;
  do {
    const res = await api("playlistItems", {
      part: "snippet,contentDetails",
      playlistId: uploads!,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });
    for (const v of res.items || []) {
      const videoId: string | undefined = v.contentDetails?.videoId;
      const title: string = v.snippet?.title || "";
      if (!videoId || title === "Private video" || title === "Deleted video") continue;
      const desc = cutBoilerplate(stripHtml(v.snippet?.description || ""));
      items.push({
        // Same id shape as the RSS feed's entries, so the two dedupe.
        id: `${market}:yt:video:${videoId}`,
        market,
        type: "video",
        show: show || "YouTube",
        title,
        description: desc.length > DESCRIPTION_LIMIT ? desc.slice(0, DESCRIPTION_LIMIT) + "..." : desc,
        link: `https://www.youtube.com/watch?v=${videoId}`,
        videoId,
        date: v.contentDetails?.videoPublishedAt || v.snippet?.publishedAt || null,
        thumbnail: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url,
      });
    }
    pageToken = res.nextPageToken;
    pages++;
  } while (pageToken && pages < MAX_PAGES_PER_RUN);

  return {
    items,
    state: {
      uploads: uploads!,
      pageToken,
      done: !pageToken,
      videos: (state?.videos || 0) + items.length,
      at: new Date().toISOString(),
    },
  };
}

/**
 * Live/upcoming state for up to 50 recent videos (1 quota unit per call).
 * Returns an empty map without an API key.
 */
export async function liveStates(videoIds: string[]): Promise<Record<string, "live" | "upcoming" | undefined>> {
  if (!youtubeApiEnabled() || !videoIds.length) return {};
  const res = await api("videos", { part: "snippet", id: videoIds.slice(0, 50).join(",") });
  const out: Record<string, "live" | "upcoming" | undefined> = {};
  for (const v of res.items || []) {
    const s = v.snippet?.liveBroadcastContent;
    out[v.id] = s === "live" || s === "upcoming" ? s : undefined;
  }
  return out;
}
