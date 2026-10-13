import Link from "next/link";
import { MARKETS, MARKET_BY_SLUG } from "@/config/markets";
import { getLive, LIVE_WINDOWS } from "@/lib/data";
import { ago } from "@/lib/format";
import { Sidebar } from "@/components/Sidebar";
import { LiveStream } from "@/components/LiveStream";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live feed | ALLCITY Pulse" };

const TYPES = [
  { key: "all", label: "Everything" },
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "article", label: "Articles" },
  { key: "fast", label: "FAST" },
];

type Props = { searchParams: Promise<{ market?: string; type?: string; hours?: string }> };

export default async function LivePage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = sp.market && MARKET_BY_SLUG[sp.market] ? sp.market : "all";
  const type = TYPES.some((t) => t.key === sp.type) ? sp.type! : "all";
  const hours = LIVE_WINDOWS.includes(Number(sp.hours) as (typeof LIVE_WINDOWS)[number]) ? Number(sp.hours) : 24;

  const { items, total, byMarket, byType, updated } = await getLive(market, type, hours);
  const scope = market === "all" ? "ALLCITY" : MARKET_BY_SLUG[market].name;
  const windowLabel = hours < 24 ? `${hours} hours` : hours === 24 ? "24 hours" : `${hours / 24} days`;
  const marketNames = Object.fromEntries(MARKETS.map((m) => [m.slug, m.name]));

  const link = (patch: Record<string, string | number>) => {
    const q = new URLSearchParams();
    const next = { market, type, hours, ...patch };
    if (next.market !== "all") q.set("market", String(next.market));
    if (next.type !== "all") q.set("type", String(next.type));
    if (Number(next.hours) !== 24) q.set("hours", String(next.hours));
    const s = q.toString();
    return s ? `/live?${s}` : "/live";
  };

  return (
    <div className="shell">
      <AutoRefresh seconds={60} />
      <Sidebar
        page="live"
        market={market}
        counts={byMarket}
        note={updated && <>Feeds checked {ago(updated)}<br />Page refreshes every minute</>}
      />
      <main className="main">
        <header className="live-head">
          <h1 className="live-title">
            {total.toLocaleString()} published by {scope} in the last {windowLabel}
          </h1>
          <div className="filters">
            <nav aria-label="Content type" className="chips">
              {TYPES.map((t) => {
                const n = t.key === "all" ? Object.values(byType).reduce((a, b) => a + b, 0) : byType[t.key] || 0;
                return (
                  <Link key={t.key} href={link({ type: t.key })} aria-current={t.key === type ? "true" : undefined} className="chip">
                    {t.label} <span className="count">{n}</span>
                  </Link>
                );
              })}
            </nav>
            <nav aria-label="Time window" className="chips">
              {LIVE_WINDOWS.map((h) => (
                <Link key={h} href={link({ hours: h })} aria-current={h === hours ? "true" : undefined} className="chip">
                  {h < 24 ? `${h}h` : h === 24 ? "24h" : `${h / 24}d`}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {items.length ? (
          <LiveStream items={items} marketNames={marketNames} />
        ) : (
          <div className="empty">
            <p>
              Nothing published in this window yet. Widen the window, or run <code>/api/ingest</code> if feeds haven&apos;t
              been checked recently.
            </p>
          </div>
        )}
        {total > items.length && (
          <p className="side-note">Showing the newest {items.length} of {total}. Narrow by market or type to see the rest.</p>
        )}
      </main>
    </div>
  );
}
