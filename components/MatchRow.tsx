import type { Match } from "@/lib/types";
import { MARKET_BY_SLUG } from "@/config/markets";
import { isArchive, stamp } from "@/lib/format";
import { CopyLink } from "./CopyLink";

export const TYPE_LABEL = { audio: "Audio", video: "Video", article: "Article", fast: "FAST" } as const;

export function MatchRow({ match }: { match: Match }) {
  const { item } = match;
  const s = stamp(item.date);
  return (
    <li className={`match ${isArchive(item.date) ? "is-archive" : ""}`}>
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
      </div>
      <CopyLink url={item.link} />
    </li>
  );
}
