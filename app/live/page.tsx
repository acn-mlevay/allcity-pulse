import Link from "next/link";
import { MARKETS, MARKET_BY_SLUG } from "@/config/markets";
import { STREAMS } from "@/config/streams";
import { getLibrary, getLive, LIVE_WINDOWS } from "@/lib/data";
import { ago } from "@/lib/format";
import { Sidebar } from "@/components/Sidebar";
import { HeaderRefresh } from "@/components/HeaderRefresh";
import { PlayerProvider } from "@/components/Player";
import { LiveWall } from "@/components/LiveWall";
import { LiveList } from "@/components/LiveList";
import { Library } from "@/components/Library";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live | ALLCITY Pulse" };

const TABS = [
  { key: "video", label: "Video" },
  { key: "audio", label: "Audio" },
  { key: "article", label: "Articles" },
] as const;

type Props = { searchParams: Promise<{ market?: string; type?: string; hours?: string; show?: string }> };

export default async function LivePage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = sp.market && MARKET_BY_SLUG[sp.market] ? sp.market : "all";
  const type = (TABS.some((t) => t.key === sp.type) ? sp.type : "video") as "video" | "audio" | "article";
  const hours = LIVE_WINDOWS.includes(Number(sp.hours) as (typeof LIVE_WINDOWS)[number]) ? Number(sp.hours) : 24;
  const marketNames = Object.fromEntries(MARKETS.map((m) => [m.slug, m.name]));
  const contentMarkets = MARKETS.filter((m) => m.feeds.length).map(({ slug, name }) => ({ slug, name }));

  const live = await getLive(market, type === "article" ? "article" : type, hours);
  const library = type === "video" ? null : await getLibrary(market, type, sp.show);
  const streams = STREAMS.filter((s) => s.kind === (type === "audio" ? "audio" : "video") && (market === "all" || s.market === market));

  const tabHref = (t: string) => {
    const q = new URLSearchParams();
    if (t !== "video") q.set("type", t);
    if (market !== "all") q.set("market", market);
    const s = q.toString();
    return s ? `/live?${s}` : "/live";
  };

  return (
    <div className="shell">
      <Sidebar
        page="live"
        market={market}
        counts={live.byMarket}
        note={live.refreshedAt && <>Feeds checked {ago(live.refreshedAt)}</>}
      />
      <main className="main">
        <PlayerProvider>
          {type !== "video" && <AutoRefresh seconds={60} />}
          <div className="topbar">
            <nav aria-label="Content type" className="tabs">
              {TABS.map((t) => (
                <Link key={t.key} href={tabHref(t.key)} aria-current={t.key === type ? "page" : undefined} className="tab">
                  <span className="tab-label">{t.label}</span>
                </Link>
              ))}
            </nav>
            <HeaderRefresh />
          </div>

          {type !== "article" && streams.length > 0 && (
            <section className="onair" aria-label="Live channels">
              <h1 className="onair-title">
                <span className="badge-live">Live</span> {type === "video" ? "Live TV" : "Live audio"}
              </h1>
              <LiveWall streams={streams} marketNames={marketNames} />
            </section>
          )}

          {type === "video" && <LiveList initial={live} market={market} hours={hours} marketNames={marketNames} />}
          {library && (
            <Library
              kind={type as "audio" | "article"}
              market={market}
              markets={contentMarkets}
              tiles={library.tiles}
              items={library.items}
              selected={library.selected}
              marketNames={marketNames}
            />
          )}
        </PlayerProvider>
      </main>
    </div>
  );
}
