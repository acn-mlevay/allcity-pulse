import type { Match, Trend } from "@/lib/types";
import { MARKET_BY_SLUG } from "@/config/markets";
import { isArchive, stamp } from "@/lib/format";
import { ContentActions } from "./ContentActions";

export const TYPE_LABEL = { audio: "Audio", video: "Video", article: "Article", fast: "FAST" } as const;

function tier(r: number) {
  return r >= 75 ? "high" : r >= 50 ? "mid" : "low";
}

export function MatchRow({ match, trend, index = 0 }: { match: Match; trend?: Trend; index?: number }) {
  const { item } = match;
  const s = stamp(item.date);
  return (
    <li className={`match ${isArchive(item.date) ? "is-archive" : ""}`} style={{ ["--i" as string]: index }}>
      <div className="stamp" title={item.date ? new Date(item.date).toDateString() : "No date"}>
        <span className="stamp-big">{s.big}</span>
        <span className="stamp-small">{s.small}</span>
      </div>
      <div className="match-body">
        <a className="match-title" href={item.link} target="_blank" rel="noreferrer">
          {item.title}
        </a>
        <div className="match-meta">
          <span className={`type type-${item.type}`}>{TYPE_LABEL[item.type]}</span>
          <span>{item.show}</span>
          <span className="market-tag">{MARKET_BY_SLUG[item.market]?.name || item.market}</span>
        </div>
        <p className="reasons">{match.reasons.join(" / ")}</p>
        <ContentActions item={item} trend={trend} />
      </div>
      <div className={`relevance rel-${tier(match.relevance)}`} title={`Relevance ${match.relevance} of 100`}>
        <span className="rel-num">{match.relevance}</span>
        <span className="rel-label">/ 100</span>
      </div>
    </li>
  );
}
