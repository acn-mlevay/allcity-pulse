export type ContentType = "audio" | "video" | "article" | "fast";

export interface FeedConfig {
  url: string;
  type: ContentType;
  /** Optional display name; defaults to the feed's own title. */
  show?: string;
  /** Inactive show; still indexed for its back catalog. */
  archived?: boolean;
}

export interface TeamConfig {
  name: string;
  terms: string[];
}

export interface Market {
  slug: string;
  name: string;
  teams: TeamConfig[];
  feeds: FeedConfig[];
  trendSource?: "own" | "all";
  /**
   * Market website. Its article RSS feed and YouTube channel are discovered
   * from the homepage at ingest time (refreshed daily).
   */
  site?: string;
}

export interface Discovered {
  at: string;
  articles?: string;
  youtube?: string;
  errors: string[];
}

export interface ContentItem {
  id: string;
  market: string;
  type: ContentType;
  show: string;
  title: string;
  description: string;
  link: string;
  date: string | null;
  thumbnail?: string;
  /** Playable audio URL (podcast enclosure). */
  audio?: string;
  /** YouTube video id, for the embedded player. */
  videoId?: string;
  /** YouTube live state when known. */
  live?: "live" | "upcoming";
  /** Reserved for the transcript phase. Searched when present. */
  transcript?: string;
}

export interface Headline {
  title: string;
  source: string;
  link: string;
  date: string | null;
}

export interface Trend {
  id: string;
  market: string;
  team: string;
  label: string;
  /** Primary phrase; content must contain it to match. */
  phrase: string;
  /** Co-occurring phrases that boost a match. */
  related: string[];
  score: number;
  headlineCount: number;
  sourceCount: number;
  latest: string | null;
  headlines: Headline[];
}

export interface MarketIndex {
  market: string;
  updatedAt: string;
  /** Last full (not fast-lane) ingest. */
  fullAt?: string;
  items: ContentItem[];
  trends: Trend[];
  feedErrors: { url: string; error: string }[];
  discovered?: Discovered;
  /** WebSub hubs advertised by this market's feeds, keyed by feed URL. */
  hubs?: Record<string, { hub: string; topic: string; subscribedAt?: string }>;
  /** YouTube API backfill progress, keyed by feed URL. */
  youtubeBackfill?: Record<string, YouTubeBackfill>;
}

export interface YouTubeBackfill {
  uploads: string;
  pageToken?: string;
  done: boolean;
  videos: number;
  at: string;
}

export interface Match {
  item: ContentItem;
  score: number;
  hits: string[];
}

/** Recent items pushed by WebSub or pulled by the live-page refresh. */
export interface LiveStore {
  refreshedAt: string | null;
  items: ContentItem[];
  /** Copied from each market's index so the live refresh needn't read indexes. */
  discovered?: Record<string, Discovered>;
}

export interface StreamConfig {
  name: string;
  market: string;
  kind: "audio" | "video";
  /** HLS (.m3u8) or a direct audio stream URL. */
  url: string;
}
