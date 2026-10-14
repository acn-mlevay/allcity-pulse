import type { ContentItem, Match, Trend } from "./types";
import { hasPhrase, normalize } from "./text";

export interface Searchable {
  item: ContentItem;
  title: string;
  body: string;
}

export function toSearchable(items: ContentItem[]): Searchable[] {
  return items.map((item) => ({
    item,
    title: normalize(item.title),
    body: normalize(`${item.show} ${item.description} ${item.transcript || ""}`),
  }));
}

const MAX_MATCHES = 8;

function occurrences(text: string, phrase: string): number {
  let n = 0;
  let i = ` ${text} `.indexOf(` ${phrase} `);
  while (i !== -1) {
    n++;
    i = ` ${text} `.indexOf(` ${phrase} `, i + phrase.length);
  }
  return n;
}

function freshness(date: string | null): { points: number; reason?: string } {
  if (!date) return { points: 0 };
  const days = (Date.now() - new Date(date).getTime()) / 864e5;
  if (days <= 7) return { points: 10, reason: "Published this week" };
  if (days <= 30) return { points: 6, reason: "Published this month" };
  if (days <= 365) return { points: 3 };
  return { points: 0, reason: "Archive pull" };
}

/**
 * Relevance (0-100) of one piece of content to a trend:
 *   name in the title 50, or only in the description 30
 *   mentioned 2+ times +5
 *   each related storyline phrase +10 (max 20)
 *   from the trend's own market +10
 *   freshness up to +10 (archive content is not penalized beyond that)
 */
export function scoreForTrend(s: Searchable, trend: Trend, homeMarket: string): Match | null {
  const reasons: string[] = [];
  let score = 0;
  if (hasPhrase(s.title, trend.phrase)) {
    score += 50;
    reasons.push(`"${trend.label}" in the title`);
  } else if (hasPhrase(s.body, trend.phrase)) {
    score += 30;
    reasons.push(`"${trend.label}" in the description`);
  } else return null;

  if (occurrences(`${s.title} ${s.body}`, trend.phrase) >= 2) {
    score += 5;
    reasons.push("Mentioned more than once");
  }
  const hits = [trend.phrase];
  let related = 0;
  for (const r of trend.related) {
    if (related < 2 && (hasPhrase(s.title, r) || hasPhrase(s.body, r))) {
      related++;
      score += 10;
      hits.push(r);
      reasons.push(`Also covers "${r.replace(/\b[a-z]/g, (c) => c.toUpperCase())}"`);
    }
  }
  if (s.item.market === homeMarket) {
    score += 10;
    reasons.push("Same market");
  }
  const f = freshness(s.item.date);
  score += f.points;
  if (f.reason) reasons.push(f.reason);

  return { item: s.item, score, relevance: Math.min(100, score), hits, reasons };
}

export function matchTrend(
  trend: Trend,
  pool: Searchable[],
  preferMarket = trend.market,
  limit = MAX_MATCHES
): Match[] {
  const out: Match[] = [];
  for (const s of pool) {
    const m = scoreForTrend(s, trend, preferMarket);
    if (m) out.push(m);
  }
  return sortMatches(out).slice(0, limit);
}

/** Free-text search: every word must appear; relevance favors title and exact-phrase hits. */
export function search(query: string, pool: Searchable[], limit = 50): Match[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(" ");
  const out: Match[] = [];
  for (const s of pool) {
    const all = `${s.title} ${s.body}`;
    if (!words.every((w) => hasPhrase(all, w))) continue;
    const reasons: string[] = [];
    let score = 20;
    if (hasPhrase(s.title, q)) {
      score += 50;
      reasons.push("Exact phrase in the title");
    } else if (hasPhrase(s.body, q)) {
      score += 30;
      reasons.push("Exact phrase in the description");
    }
    const inTitle = words.filter((w) => hasPhrase(s.title, w)).length;
    if (inTitle) {
      score += Math.round((inTitle / words.length) * 20);
      reasons.push(`${inTitle} of ${words.length} words in the title`);
    }
    const f = freshness(s.item.date);
    score += f.points;
    if (f.reason) reasons.push(f.reason);
    out.push({ item: s.item, score, relevance: Math.min(100, score), hits: [q], reasons });
  }
  return sortMatches(out).slice(0, limit);
}

function sortMatches(ms: Match[]): Match[] {
  return ms.sort(
    (a, b) => b.relevance - a.relevance || (b.item.date || "").localeCompare(a.item.date || "")
  );
}
