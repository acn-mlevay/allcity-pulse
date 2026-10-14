"use client";
import { useId, useState } from "react";
import type { Match, Trend } from "@/lib/types";
import { MARKET_BY_SLUG } from "@/config/markets";
import { ago } from "@/lib/format";
import { downloadText, platformLinks, toCsv } from "@/lib/share";
import { MatchRow } from "./MatchRow";

function momentum(t: Trend): { label: string; tone: string } | null {
  if (t.recentCount === undefined || !t.headlineCount) return null;
  const share = t.recentCount / t.headlineCount;
  if (share >= 0.5) return { label: "Surging", tone: "hot" };
  if (share >= 0.2) return { label: "Building", tone: "warm" };
  return { label: "Steady", tone: "cool" };
}

export function TrendCard({
  rank,
  trend,
  matches,
  heat,
  showMarket,
  defaultOpen = false,
}: {
  rank: number;
  trend: Trend;
  matches: Match[];
  heat: number;
  showMarket: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const m = momentum(trend);
  const top = trend.headlines[0];

  const exportCsv = () =>
    downloadText(
      `${trend.label.replace(/\W+/g, "-").toLowerCase()}-content.csv`,
      toCsv(
        matches.map((x) => ({
          trend_rank: rank,
          trend: trend.label,
          relevance: x.relevance,
          title: x.item.title,
          show: x.item.show,
          market: MARKET_BY_SLUG[x.item.market]?.name || x.item.market,
          type: x.item.type,
          published: x.item.date?.slice(0, 10) || "",
          link: x.item.link,
          audio: x.item.audio || "",
          why: x.reasons.join("; "),
        }))
      )
    );

  const copyBrief = () => {
    const lines = [
      `#${rank} ${trend.label} (${trend.team})`,
      `${trend.headlineCount} headlines from ${trend.sourceCount} outlets${trend.recentCount !== undefined ? `, ${trend.recentCount} in the last 6 hours` : ""}`,
      top ? `Top headline: ${top.title} (${top.source}) ${top.link}` : "",
      "",
      "ALLCITY content:",
      ...matches.map((x) => `- [${x.relevance}] ${x.item.title} (${x.item.show}) ${x.item.link}`),
    ];
    navigator.clipboard.writeText(lines.filter((l) => l !== undefined).join("\n"));
  };

  return (
    <article className={`tcard ${open ? "is-open" : ""}`} style={{ ["--i" as string]: rank }}>
      <button
        type="button"
        className="tcard-head"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <span className="rank">#{rank}</span>
        <span className="tcard-main">
          <span className="tcard-title">
            <span className="trend-label">{trend.label}</span>
            {m && <span className={`momentum m-${m.tone}`}>{m.label}</span>}
          </span>
          <span className="tcard-meta">
            {showMarket && <span className="market-tag">{MARKET_BY_SLUG[trend.market]?.name}</span>}
            {trend.team} / {trend.headlineCount} headlines / {trend.sourceCount} outlets / latest {ago(trend.latest)}
          </span>
          <span className="heat" aria-label={`Trend strength ${heat} of 100`}>
            <span className="heat-fill" style={{ ["--w" as string]: `${heat}%` }} />
          </span>
        </span>
        <span className={`match-count ${matches.length ? "" : "is-zero"}`}>
          <strong>{matches.length}</strong> {matches.length === 1 ? "match" : "matches"}
        </span>
        <span className="chev" aria-hidden="true" />
      </button>

      <div className="tcard-body" id={panelId} role="region" aria-label={`${trend.label} details`}>
        <div className="tcard-inner">
          <section className="why">
            <h3>Why it&apos;s #{rank}</h3>
            <dl className="stats">
              <div><dt>Trend score</dt><dd>{trend.score}</dd></div>
              <div><dt>Headlines</dt><dd>{trend.headlineCount}</dd></div>
              <div><dt>Outlets</dt><dd>{trend.sourceCount}</dd></div>
              {trend.recentCount !== undefined && <div><dt>Last 6 hours</dt><dd>{trend.recentCount}</dd></div>}
            </dl>
            <p className="why-text">
              Ranked by how many different outlets are covering it, weighted toward the most recent headlines
              (coverage loses half its weight every 12 hours).
            </p>

            {trend.outlets && trend.outlets.length > 0 && (
              <>
                <h4>Where it&apos;s getting coverage</h4>
                <ul className="outlets">
                  {trend.outlets.map((o) => (
                    <li key={o.source}>
                      <a href={o.link} target="_blank" rel="noreferrer">{o.source}</a>
                      <span className="count">{o.count}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h4>Join the conversation</h4>
            <div className="platforms">
              {platformLinks(trend.label).map((p) => (
                <a key={p.name} className="chip" href={p.url} target="_blank" rel="noreferrer">{p.name}</a>
              ))}
            </div>

            <h4>Latest headlines</h4>
            <ul className="headlines">
              {trend.headlines.slice(0, 5).map((h) => (
                <li key={h.link}>
                  <a href={h.link} target="_blank" rel="noreferrer">{h.title}</a>{" "}
                  <span className="src">{h.source} / {ago(h.date)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="content">
            <div className="content-head">
              <h3>ALLCITY content</h3>
              {matches.length > 0 && (
                <div className="action-row">
                  <button type="button" className="act" onClick={copyBrief}>Copy brief</button>
                  <button type="button" className="act" onClick={exportCsv}>Export CSV</button>
                </div>
              )}
            </div>
            {matches.length ? (
              <ul className="matches">
                {matches.map((x, i) => <MatchRow key={x.item.id} match={x} trend={trend} index={i} />)}
              </ul>
            ) : (
              <p className="empty-inline">No ALLCITY content mentions {trend.label} yet.</p>
            )}
          </section>
        </div>
      </div>
    </article>
  );
}
