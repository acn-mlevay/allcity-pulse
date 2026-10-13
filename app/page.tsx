import { Sidebar } from "@/components/Sidebar";
import { getView } from "@/lib/data";
import { ago } from "@/lib/format";
import { TrendBlock } from "@/components/TrendBlock";
import { MatchRow } from "@/components/MatchRow";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ market?: string; q?: string }> };

export default async function Page({ searchParams }: Props) {
  const { market: marketParam = "all", q = "" } = await searchParams;
  const { market, views, results, updated, counts, totalItems } = await getView(marketParam, q.trim());

  const withMatches = views.filter((v) => v.matches.length);
  const without = views.filter((v) => !v.matches.length);
  const scopeName = market?.name || "all markets";

  return (
    <div className="shell">
      <Sidebar
        page="trending"
        market={marketParam}
        counts={Object.fromEntries(Object.entries(counts).map(([k, c]) => [k, c.trends]))}
        note={<>{totalItems.toLocaleString()} pieces indexed{updated && <><br />Updated {ago(updated)}</>}</>}
      />

      <main className="main">
        <form className="search" action="/" method="get" role="search">
          {marketParam !== "all" && <input type="hidden" name="market" value={marketParam} />}
          <label htmlFor="q" className="sr-only">Search all content</label>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Search every show, video, and article" />
          <button type="submit">Search</button>
        </form>

        {q && (
          <section className="results" aria-labelledby="results-h">
            <h1 id="results-h" className="section-h">
              {results.length ? `${results.length} results for "${q}"` : `Nothing in the library mentions "${q}"`}
            </h1>
            <ul className="matches">
              {results.map((m) => <MatchRow key={m.item.id} match={m} />)}
            </ul>
          </section>
        )}

        <h1 className="section-h">Trending in {scopeName}</h1>

        {!views.length && (
          <div className="empty">
            {totalItems === 0 ? (
              <p>No content indexed yet. Add feeds in <code>config/markets.ts</code>, deploy, then run <code>/api/ingest</code>.</p>
            ) : market && !market.teams.length && market.trendSource !== "all" ? (
              <p>{market.name} has no teams configured. Add them in <code>config/markets.ts</code> to pull trends.</p>
            ) : (
              <p>No trends found for {scopeName} in the last 2 days. Run <code>/api/ingest</code> to refresh.</p>
            )}
          </div>
        )}

        {withMatches.map((v) => (
          <TrendBlock key={v.trend.id} view={v} showMarket={!market || market.trendSource === "all"} />
        ))}

        {without.length > 0 && (
          <details className="unmatched">
            <summary>{without.length} {without.length === 1 ? "trend" : "trends"} with no matching content</summary>
            <ul>
              {without.map(({ trend }) => (
                <li key={trend.id}>
                  <strong>{trend.label}</strong>{" "}
                  {trend.headlines[0] && (
                    <a href={trend.headlines[0].link} target="_blank" rel="noreferrer">{trend.headlines[0].title}</a>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </main>
    </div>
  );
}
