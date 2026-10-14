"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentItem } from "@/lib/types";
import type { LiveData } from "@/lib/data";
import { ContentActions } from "./ContentActions";

const WINDOWS = [6, 24, 72, 168];
const POLL_MS = 15_000;

/** Newest videos, polled every 15 seconds; new arrivals slide in. */
export function LiveList({
  initial,
  market,
  hours,
  marketNames,
}: {
  initial: LiveData;
  market: string;
  hours: number;
  marketNames: Record<string, string>;
}) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const seen = useRef(new Set(initial.items.map((i) => i.id)));
  const [arrived, setArrived] = useState<Set<string>>(new Set());

  useEffect(() => setData(initial), [initial]);
  useEffect(() => {
    setNow(Date.now());
    const q = new URLSearchParams({ market, type: "video", hours: String(hours) });
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/live?${q}`, { cache: "no-store" });
        if (!res.ok || stop) return;
        const next: LiveData = await res.json();
        const fresh = next.items.filter((i) => !seen.current.has(i.id)).map((i) => i.id);
        fresh.forEach((id) => seen.current.add(id));
        if (fresh.length) setArrived((a) => new Set([...a, ...fresh]));
        setData(next);
        setNow(Date.now());
      } catch {
        // retry next tick
      }
    };
    const id = setInterval(tick, POLL_MS);
    tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [market, hours]);

  const groups = useMemo(() => {
    if (!now) return [];
    const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" });
    const today = dayFmt.format(new Date(now));
    const yesterday = dayFmt.format(new Date(now - 864e5));
    const out: { day: string; items: ContentItem[] }[] = [];
    for (const item of data.items) {
      const label = item.live === "live" ? "Live now" : dayFmt.format(new Date(item.date!));
      const day = label === today ? "Today" : label === yesterday ? "Yesterday" : label;
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(item);
    }
    return out;
  }, [data.items, now]);

  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  const href = (h: number) => {
    const q = new URLSearchParams();
    if (market !== "all") q.set("market", market);
    if (h !== 24) q.set("hours", String(h));
    const s = q.toString();
    return s ? `/live?${s}` : "/live";
  };

  return (
    <section className="lib">
      <div className="lib-head">
        <h2 className="lib-title">Latest videos <span className="count">{data.total}</span></h2>
        <nav aria-label="Time window" className="chips">
          {WINDOWS.map((h) => (
            <Link key={h} href={href(h)} scroll={false} aria-current={h === hours ? "true" : undefined} className="chip">
              {h < 24 ? `${h}h` : h === 24 ? "24h" : `${h / 24}d`}
            </Link>
          ))}
        </nav>
      </div>
      {!now ? null : data.items.length ? (
        groups.map((g) => (
          <section key={g.day} aria-label={g.day}>
            <h3 className="live-day">{g.day}</h3>
            <ol className="live-list">
              {g.items.map((item) => {
                const t = new Date(item.date!).getTime();
                const isOpen = open === item.id;
                return (
                  <li key={item.id} className={`live-row ${now - t < 36e5 ? "is-fresh" : ""} ${arrived.has(item.id) ? "is-arrived" : ""}`}>
                    <time dateTime={item.date!} className="live-time">{timeFmt.format(new Date(t))}</time>
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="thumb" src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="thumb thumb-empty" aria-hidden="true">Video</span>
                    )}
                    <div className="match-body">
                      <a className="match-title" href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
                      <div className="match-meta">
                        {item.live === "live" && <span className="badge-live">Live</span>}
                        {item.live === "upcoming" && <span className="badge-soon">Upcoming</span>}
                        <span>{item.show}</span>
                        <span className="market-tag">{marketNames[item.market] || item.market}</span>
                      </div>
                      <ContentActions item={item} />
                    </div>
                    {item.videoId && (
                      <button type="button" className="play" onClick={() => setOpen(isOpen ? null : item.id)} aria-expanded={isOpen}>
                        {isOpen ? "Hide" : "Watch"}
                      </button>
                    )}
                    {isOpen && item.videoId && (
                      <div className="embed">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&rel=0`}
                          title={item.title}
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      ) : (
        <div className="empty"><p>No videos in this window yet.</p></div>
      )}
    </section>
  );
}
