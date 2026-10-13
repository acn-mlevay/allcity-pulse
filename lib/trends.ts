import type { Headline, Market, Trend } from "./types";
import { fetchGoogleNews } from "./rss";
import { mapLimit } from "./pool";
import { STOPWORDS, normalize, titleCase } from "./text";
import { NEWS_WINDOW, TRENDS_PER_MARKET } from "@/config/markets";

interface TaggedHeadline extends Headline {
  team: string;
  norm: string;
}

const HALF_LIFE_HOURS = 12;

function recencyWeight(date: string | null, now: number): number {
  if (!date) return 0.5;
  const hours = Math.max(0, (now - new Date(date).getTime()) / 36e5);
  return Math.pow(0.5, hours / HALF_LIFE_HOURS);
}

/**
 * Candidate entity phrases: runs of 2-3 adjacent tokens with no stopwords,
 * numbers, one-letter tokens, or "this team" words.
 */
export function phrasesOf(norm: string, teamTerms: Set<string>): string[] {
  const tokens = norm.split(" ");
  const usable = (t: string) =>
    t.length > 1 && !/^\d+$/.test(t) && !STOPWORDS.has(t) && !teamTerms.has(t);
  const out = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    for (const n of [2, 3]) {
      const gram = tokens.slice(i, i + n);
      if (gram.length === n && gram.every(usable)) out.add(gram.join(" "));
    }
  }
  return [...out];
}

/** Turn a pile of team headlines into ranked, de-duplicated trends. */
export function extractTrends(
  market: string,
  headlines: TaggedHeadline[],
  teamTerms: Set<string>,
  limit = TRENDS_PER_MARKET,
  now = Date.now()
): Trend[] {
  const byPhrase = new Map<string, number[]>();
  headlines.forEach((h, idx) => {
    for (const p of phrasesOf(h.norm, teamTerms)) {
      if (!byPhrase.has(p)) byPhrase.set(p, []);
      byPhrase.get(p)!.push(idx);
    }
  });

  type Candidate = { phrase: string; idx: Set<number>; score: number; sources: Set<string> };
  const candidates: Candidate[] = [];
  for (const [phrase, idxs] of byPhrase) {
    if (idxs.length < 2) continue;
    const sources = new Set(idxs.map((i) => headlines[i].source));
    const recency = idxs.reduce((s, i) => s + recencyWeight(headlines[i].date, now), 0);
    // Breadth of coverage matters more than one outlet repeating itself.
    const score = sources.size * 2 + recency + (phrase.split(" ").length === 3 ? 0.5 : 0);
    candidates.push({ phrase, idx: new Set(idxs), score, sources });
  }
  candidates.sort((a, b) => b.score - a.score);

  // Greedy selection; drop candidates that describe the same story cluster.
  const chosen: Candidate[] = [];
  for (const c of candidates) {
    const dup = chosen.some((k) => {
      let overlap = 0;
      for (const i of c.idx) if (k.idx.has(i)) overlap++;
      const contained = k.phrase.includes(c.phrase) || c.phrase.includes(k.phrase);
      return contained || overlap / Math.min(c.idx.size, k.idx.size) >= 0.6;
    });
    if (!dup) chosen.push(c);
    if (chosen.length >= limit) break;
  }

  return chosen.map((c) => {
    const hs = [...c.idx]
      .map((i) => headlines[i])
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    // Related phrases: other strong phrases inside this cluster.
    const related = candidates
      .filter((o) => o.phrase !== c.phrase && !o.phrase.includes(c.phrase) && !c.phrase.includes(o.phrase))
      .map((o) => ({ o, shared: [...o.idx].filter((i) => c.idx.has(i)).length }))
      .filter(({ shared }) => shared >= 2)
      .sort((a, b) => b.shared - a.shared)
      .slice(0, 3)
      .map(({ o }) => o.phrase);
    const teamCounts = new Map<string, number>();
    hs.forEach((h) => teamCounts.set(h.team, (teamCounts.get(h.team) || 0) + 1));
    const team = [...teamCounts].sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    return {
      id: `${market}:${c.phrase.replace(/ /g, "-")}`,
      market,
      team,
      label: titleCase(c.phrase),
      phrase: c.phrase,
      related,
      score: Math.round(c.score * 10) / 10,
      headlineCount: c.idx.size,
      sourceCount: c.sources.size,
      latest: hs[0]?.date || null,
      headlines: hs.slice(0, 4).map(({ title, source, link, date }) => ({ title, source, link, date })),
    };
  });
}

export async function buildTrends(market: Market): Promise<Trend[]> {
  if (!market.teams.length) return [];
  const teamTerms = new Set(
    market.teams.flatMap((t) => [...t.terms, ...normalize(t.name).split(" ")].map(normalize))
  );
  const results = await mapLimit(market.teams, 4, async (team) => {
    const hs = await fetchGoogleNews(`"${team.name}" when:${NEWS_WINDOW}`);
    return hs.map((h) => ({ ...h, team: team.name, norm: normalize(h.title) }));
  });
  const seen = new Set<string>();
  const headlines: TaggedHeadline[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const h of r.value) {
      if (seen.has(h.norm)) continue;
      seen.add(h.norm);
      headlines.push(h);
    }
  }
  return extractTrends(market.slug, headlines, teamTerms);
}
