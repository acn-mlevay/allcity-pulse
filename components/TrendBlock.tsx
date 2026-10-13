import type { TrendView } from "@/lib/data";
import { MARKET_BY_SLUG } from "@/config/markets";
import { ago } from "@/lib/format";
import { MatchRow } from "./MatchRow";

export function TrendBlock({ view, showMarket }: { view: TrendView; showMarket: boolean }) {
  const { trend, matches } = view;
  const top = trend.headlines[0];
  return (
    <article className="trend">
      <header className="trend-head">
        <h2 className="trend-label">{trend.label}</h2>
        <p className="trend-meta">
          {showMarket && <span className="market-tag">{MARKET_BY_SLUG[trend.market]?.name}</span>}
          {trend.team} / {trend.headlineCount} headlines from {trend.sourceCount} outlets / latest {ago(trend.latest)}
        </p>
        {top && (
          <a className="trend-headline" href={top.link} target="_blank" rel="noreferrer">
            {top.title} <span className="src">({top.source})</span>
          </a>
        )}
      </header>
      <ul className="matches">
        {matches.map((m) => (
          <MatchRow key={m.item.id} match={m} />
        ))}
      </ul>
    </article>
  );
}
