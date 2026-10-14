import Link from "next/link";
import { MARKETS } from "@/config/markets";
import { readSettings } from "@/lib/store";
import { RefreshToggle } from "./RefreshToggle";

type Page = "trending" | "live";

export async function Sidebar({
  page,
  market,
  counts = {},
  note,
}: {
  page: Page;
  market: string;
  counts?: Record<string, number | undefined>;
  note?: React.ReactNode;
}) {
  const { refreshMode } = await readSettings();
  const base = page === "live" ? "/live" : "/";
  const nav = [{ slug: "all", name: "All markets" }, ...MARKETS];
  const href = (slug: string) => (slug === "all" ? base : `${base}?market=${slug}`);
  return (
    <aside className="side">
      <p className="brand">ALLCITY Pulse</p>
      <nav aria-label="Views" className="views">
        <Link href={market === "all" ? "/" : `/?market=${market}`} aria-current={page === "trending" ? "page" : undefined}>
          Trending
        </Link>
        <Link href={market === "all" ? "/live" : `/live?market=${market}`} aria-current={page === "live" ? "page" : undefined}>
          Live feed
        </Link>
      </nav>
      <nav aria-label="Markets">
        <ul className="markets">
          {nav.map((m) => (
            <li key={m.slug}>
              <Link href={href(m.slug)} aria-current={m.slug === market ? "page" : undefined}>
                <span>{m.name}</span>
                {counts[m.slug] ? <span className="count">{counts[m.slug]}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {note && <p className="side-note">{note}</p>}
      <RefreshToggle mode={refreshMode} />
    </aside>
  );
}
