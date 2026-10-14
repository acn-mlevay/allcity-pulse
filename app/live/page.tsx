import { MARKETS, MARKET_BY_SLUG } from "@/config/markets";
import { STREAMS } from "@/config/streams";
import { getLive, LIVE_WINDOWS } from "@/lib/data";
import { ago } from "@/lib/format";
import { Sidebar } from "@/components/Sidebar";
import { LiveView } from "@/components/LiveView";
import { HeaderRefresh } from "@/components/HeaderRefresh";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live feed | ALLCITY Pulse" };

const TYPE_KEYS = ["video", "audio", "article"];

type Props = { searchParams: Promise<{ market?: string; type?: string; hours?: string }> };

export default async function LivePage({ searchParams }: Props) {
  const sp = await searchParams;
  const market = sp.market && MARKET_BY_SLUG[sp.market] ? sp.market : "all";
  const type = TYPE_KEYS.includes(sp.type || "") ? sp.type! : "video";
  const hours = LIVE_WINDOWS.includes(Number(sp.hours) as (typeof LIVE_WINDOWS)[number]) ? Number(sp.hours) : 24;

  const initial = await getLive(market, type, hours);
  const scope = market === "all" ? "ALLCITY" : MARKET_BY_SLUG[market].name;
  const marketNames = Object.fromEntries(MARKETS.map((m) => [m.slug, m.name]));

  return (
    <div className="shell">
      <Sidebar
        page="live"
        market={market}
        counts={initial.byMarket}
        note={initial.refreshedAt && <>Feeds checked {ago(initial.refreshedAt)}</>}
      />
      <main className="main">
        <div className="topbar topbar-end">
          <HeaderRefresh />
        </div>
        <LiveView
          initial={initial}
          market={market}
          type={type}
          hours={hours}
          scope={scope}
          marketNames={marketNames}
          streams={STREAMS}
        />
      </main>
    </div>
  );
}
