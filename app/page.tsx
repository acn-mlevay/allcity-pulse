import { after } from "next/server";
import { getView } from "@/lib/data";
import { ago } from "@/lib/format";
import { maybeStartChain } from "@/lib/chain";
import { Sidebar } from "@/components/Sidebar";
import { TrendCard } from "@/components/TrendCard";
import { MatchRow } from "@/components/MatchRow";
import { HeaderRefresh } from "@/components/HeaderRefresh";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ market?: string; q?: string }> };

export default async function Page({ searchParams }: Props) {
  const { market: marketParam = "all", q = "" } = await searchParams;
  after(() => maybeStartChain().catch(() => {}));
  const { market, views, results, updated, counts, totalItems } = await getView(marketParam, q.trim());

  const scopeName = market?.name || "all markets";
  const maxScore = Math.max(1, ...views.map((v) => v.trend.score));
  const showMarket = !market || market.trendSource === "all";
  const withContent = views.filter((v) => v.matches.length).length;

  return (
    <div className="shell">
      <Sidebar
        page="trending"
        market={marketParam}
        counts={Object.fromEntries(Object.entries(counts).map(([k, c]) => [k, c.trends]))}
        note={<>{totalItems.toLocaleString()} pieces indexed{updated && <><br />Updated {ago(updated)}</>}</>}
      />

      <main className="main">
        <div className="topbar">
          <form className="search" action="/" method="get" role="search">
            {marketParam !== "all" && <input type="hidden" name="market" value={marketParam} />}
            <label htmlFor="q" className="sr-only">Search all content</label>
            <input id="q" name="q" type="search" defaultValue={q} placeholder="Search every show, video, and article" />
            <button type="submit">Search</button>
          </form>
          <HeaderRefresh />
        </div>

        {q && (
          <section className="results" aria-labelledby="results-h">
            <h1 id="results-h" className="section-h">
              {results.length ? `${results.length} results for "${q}"` : `Nothing in the library mentions "${q}"`}
            </h1>
            <ul className="matches">
              {results.map((m, i) => <MatchRow key={m.item.id} match={m} index={i} />)}
            </ul>
          </section>
        )}

        <header className="trend-header">
          <h1 className="live-title">Trending in {scopeName}</h1>
          {views.length > 0 && (
            <p className="trend-sub">
              {views.length} stories ranked by coverage, {withContent} with ALLCITY content to push. Click a story to see why it ranks and what to share.
            </p>
          )}
        </header>

        {!views.length && (
          <div className="empty">
            {totalItems === 0 ? (
              <p>No content indexed yet. Click <strong>Refresh now</strong> to load every market.</p>
            ) : market && !market.teams.length && market.trendSource !== "all" ? (
              <p>{market.name} has no teams configured. Add them in <code>config/markets.ts</code> to pull trends.</p>
            ) : (
              <p>No trends found for {scopeName} in the last 2 days. Click <strong>Refresh now</strong> to update.</p>
            )}
          </div>
        )}

        <div className="tlist">
          {views.map((v, i) => (
            <TrendCard
              key={v.trend.id}
              rank={i + 1}
              trend={v.trend}
              matches={v.matches}
              heat={Math.round((v.trend.score / maxScore) * 100)}
              showMarket={showMarket}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
