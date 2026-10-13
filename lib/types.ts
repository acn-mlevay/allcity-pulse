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
  items: ContentItem[];
  trends: Trend[];
  feedErrors: { url: string; error: string }[];
  discovered?: Discovered;
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
