import Link from "next/link";
import type { ContentItem } from "@/lib/types";
import type { LibraryTile } from "@/lib/data";
import { LibraryList } from "./LibraryList";

/** Market selector, tile grid (shows or sections), and the newest items below. */
export function Library({
  kind,
  market,
  markets,
  tiles,
  items,
  selected,
  marketNames,
}: {
  kind: "audio" | "article";
  market: string;
  markets: { slug: string; name: string }[];
  tiles: LibraryTile[];
  items: ContentItem[];
  selected: string | null;
  marketNames: Record<string, string>;
}) {
  const base = (m: string, show?: string) => {
    const q = new URLSearchParams({ type: kind });
    if (m !== "all") q.set("market", m);
    if (show) q.set("show", show);
    return `/live?${q}`;
  };
  const selectedTile = tiles.find((t) => t.key === selected);
  const title = kind === "audio" ? "Podcasts" : "Articles";

  return (
    <section className="lib">
      <div className="lib-head">
        <h2 className="lib-title">{title}</h2>
        <nav aria-label="Market" className="chips">
          {[{ slug: "all", name: "All" }, ...markets].map((m) => (
            <Link key={m.slug} href={base(m.slug)} scroll={false} aria-current={m.slug === market ? "true" : undefined} className="chip">
              {m.name}
            </Link>
          ))}
        </nav>
      </div>

      {tiles.length > 0 ? (
        <div className="tiles">
          {tiles.map((t, i) => {
            const on = t.key === selected;
            return (
              <Link
                key={t.key}
                href={on ? base(market) : base(market, t.key)}
                scroll={false}
                className={`tile ${on ? "is-on" : ""}`}
                aria-current={on ? "true" : undefined}
                style={{ ["--i" as string]: Math.min(i, 20) }}
              >
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" loading="lazy" referrerPolicy="no-referrer" />
                ) : (
                  <span className="tile-fallback" aria-hidden="true">{marketNames[t.market]}</span>
                )}
                <span className="tile-caption">
                  <span className="tile-name">{t.name}</span>
                  <span className="tile-meta">{market === "all" ? `${marketNames[t.market]} / ` : ""}{t.count}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty"><p>Nothing indexed for this market yet.</p></div>
      )}

      {items.length > 0 && (
        <>
          <h3 className="live-day">
            {selectedTile ? selectedTile.name : kind === "audio" ? "Latest episodes" : "Latest articles"}
            {selectedTile && <Link href={base(market)} scroll={false} className="act lib-clear">Show all</Link>}
          </h3>
          <LibraryList items={items} marketNames={marketNames} />
        </>
      )}
    </section>
  );
}
