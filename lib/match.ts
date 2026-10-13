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

const MAX_MATCHES = 6;

/**
 * Content must contain the trend's primary phrase. Ranking: title hit beats
 * body hit, related phrases and home-market content add weight, ties go to
 * the newer item.
 */
export function matchTrend(
  trend: Trend,
  pool: Searchable[],
  preferMarket = trend.market,
  limit = MAX_MATCHES
): Match[] {
  const out: Match[] = [];
  for (const s of pool) {
    let score = 0;
    const hits: string[] = [];
    if (hasPhrase(s.title, trend.phrase)) score += 10;
    else if (hasPhrase(s.body, trend.phrase)) score += 5;
    else continue;
    hits.push(trend.phrase);
    for (const r of trend.related) {
      if (hasPhrase(s.title, r) || hasPhrase(s.body, r)) {
        score += 2;
        hits.push(r);
      }
    }
    if (s.item.market === preferMarket) score += 3;
    out.push({ item: s.item, score, hits });
  }
  return sortMatches(out).slice(0, limit);
}

/** Free-text search: every word must appear; title hits rank higher. */
export function search(query: string, pool: Searchable[], limit = 50): Match[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(" ");
  const out: Match[] = [];
  for (const s of pool) {
    const all = `${s.title} ${s.body}`;
    if (!words.every((w) => hasPhrase(all, w))) continue;
    let score = words.filter((w) => hasPhrase(s.title, w)).length * 2;
    if (hasPhrase(s.title, q)) score += 10;
    else if (hasPhrase(s.body, q)) score += 5;
    out.push({ item: s.item, score, hits: [q] });
  }
  return sortMatches(out).slice(0, limit);
}

function sortMatches(ms: Match[]): Match[] {
  return ms.sort(
    (a, b) => b.score - a.score || (b.item.date || "").localeCompare(a.item.date || "")
  );
}
