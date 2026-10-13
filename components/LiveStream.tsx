"use client";
import { useEffect, useState } from "react";
import type { ContentItem } from "@/lib/types";
import { CopyLink } from "./CopyLink";

const TYPE_LABEL = { audio: "Audio", video: "Video", article: "Article", fast: "FAST" } as const;

/** Grouped by the viewer's local day, with local times. */
export function LiveStream({ items, marketNames }: { items: ContentItem[]; marketNames: Record<string, string> }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), [items]);

  if (!now) return <ol className="live" aria-busy="true" />;

  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const today = dayFmt.format(new Date(now));
  const yesterday = dayFmt.format(new Date(now - 864e5));

  const groups: { day: string; items: ContentItem[] }[] = [];
  for (const item of items) {
    const label = dayFmt.format(new Date(item.date!));
    const day = label === today ? "Today" : label === yesterday ? "Yesterday" : label;
    if (groups[groups.length - 1]?.day !== day) groups.push({ day, items: [] });
    groups[groups.length - 1].items.push(item);
  }

  return (
    <div className="live">
      {groups.map((g) => (
        <section key={g.day} aria-label={g.day}>
          <h2 className="live-day">{g.day}</h2>
          <ol className="live-list">
            {g.items.map((item) => {
              const t = new Date(item.date!).getTime();
              const fresh = now - t < 3600 * 1000;
              return (
                <li key={item.id} className={`live-row ${fresh ? "is-fresh" : ""}`}>
                  <time dateTime={item.date!} className="live-time">
                    {timeFmt.format(new Date(t))}
                  </time>
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="thumb" src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span className={`thumb thumb-empty type-${item.type}`} aria-hidden="true">
                      {TYPE_LABEL[item.type]}
                    </span>
                  )}
                  <div className="match-body">
                    <a className="match-title" href={item.link} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                    <div className="match-meta">
                      <span className="type">{TYPE_LABEL[item.type]}</span>
                      <span>{item.show}</span>
                      <span className="market-tag">{marketNames[item.market] || item.market}</span>
                      {fresh && <span className="fresh">New</span>}
                    </div>
                  </div>
                  <CopyLink url={item.link} />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
