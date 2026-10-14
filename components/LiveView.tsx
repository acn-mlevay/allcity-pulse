"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ContentItem, StreamConfig } from "@/lib/types";
import type { LiveData } from "@/lib/data";
import { ContentActions } from "./ContentActions";
import { AudioBar, MediaElement, type NowPlaying } from "./Player";

const TYPE_LABEL = { audio: "Audio", video: "Video", article: "Article", fast: "FAST" } as const;
const TYPES = [
  { key: "video", label: "Video", hint: "Live TV + YouTube" },
  { key: "audio", label: "Audio", hint: "Live radio + podcasts" },
  { key: "article", label: "Articles", hint: "Web stories" },
];
const WINDOWS = [6, 24, 72, 168];
const POLL_MS = 15_000;

interface Props {
  initial: LiveData;
  market: string;
  type: string;
  hours: number;
  scope: string;
  marketNames: Record<string, string>;
  streams: StreamConfig[];
}

export function LiveView({ initial, market, type, hours, scope, marketNames, streams }: Props) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState<number | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [audio, setAudio] = useState<NowPlaying | null>(null);
  const [streamOpen, setStreamOpen] = useState<string | null>(null);
  const seen = useRef(new Set(initial.items.map((i) => i.id)));
  const [arrived, setArrived] = useState<Set<string>>(new Set());

  useEffect(() => setData(initial), [initial]);

  useEffect(() => {
    setNow(Date.now());
    const q = new URLSearchParams({ market, type, hours: String(hours) });
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
        // Next tick retries.
      }
    };
    const id = setInterval(tick, POLL_MS);
    tick();
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [market, type, hours]);

  const link = (patch: Record<string, string | number>) => {
    const next = { market, type, hours, ...patch };
    const q = new URLSearchParams();
    if (next.market !== "all") q.set("market", String(next.market));
    if (next.type !== "video") q.set("type", String(next.type));
    if (Number(next.hours) !== 24) q.set("hours", String(next.hours));
    const s = q.toString();
    return s ? `/live?${s}` : "/live";
  };

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
  const windowLabel = hours < 24 ? `${hours} hours` : hours === 24 ? "24 hours" : `${hours / 24} days`;
  const tabStreams = streams.filter(
    (s) => (market === "all" || s.market === market) && ((type === "video" && s.kind === "video") || (type === "audio" && s.kind === "audio"))
  );
  const watching = tabStreams.find((s) => s.url === streamOpen) || null;
  const one = data.total === 1;
  const typeLabel =
    type === "video" ? (one ? "video" : "videos") : type === "audio" ? (one ? "audio piece" : "audio pieces") : one ? "article" : "articles";

  return (
    <>
      <header className="live-head">
        <h1 className="live-title">
          {data.total.toLocaleString()} {typeLabel} from {scope} in the last {windowLabel}
        </h1>
        <div className="filters">
          <nav aria-label="Content type" className="tabs">
            {TYPES.map((t) => (
              <Link key={t.key} href={link({ type: t.key })} aria-current={t.key === type ? "page" : undefined} className="tab">
                <span className="tab-label">{t.label} <span className="count">{data.byType[t.key] || 0}</span></span>
                <span className="tab-hint">{t.hint}</span>
              </Link>
            ))}
          </nav>
          <nav aria-label="Time window" className="chips">
            {WINDOWS.map((h) => (
              <Link key={h} href={link({ hours: h })} aria-current={h === hours ? "true" : undefined} className="chip">
                {h < 24 ? `${h}h` : h === 24 ? "24h" : `${h / 24}d`}
              </Link>
            ))}
          </nav>
        </div>
        <p className="live-status" aria-live="polite">
          <span className="pulse" aria-hidden="true" /> Checking for new content every 15 seconds
        </p>
      </header>

      {tabStreams.length > 0 && (
        <section className="onair" aria-label="Live channels">
          <h2 className="onair-title"><span className="badge-live">Live</span> {type === "video" ? "Live TV channels" : "Live audio"}</h2>
          {watching && (
            <div className="stage">
              <MediaElement key={watching.url} src={watching.url} kind="video" />
              <div className="stage-meta">
                <strong>{watching.name}</strong>
                <button type="button" className="act" onClick={() => setStreamOpen(null)}>Close</button>
              </div>
            </div>
          )}
          <div className="channels">
            {tabStreams.map((s) => {
              const active = s.kind === "video" ? streamOpen === s.url : audio?.src === s.url;
              return (
                <button
                  key={s.url}
                  type="button"
                  className={`channel ${active ? "is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() =>
                    s.kind === "audio"
                      ? setAudio(active ? null : { title: s.name, subtitle: "Live", src: s.url })
                      : setStreamOpen(active ? null : s.url)
                  }
                >
                  <span className="channel-market">{marketNames[s.market] || s.market}</span>
                  <span className="channel-name">{s.name}</span>
                  <span className="channel-cta">
                    {active ? (s.kind === "audio" ? "Playing" : "Watching") : s.kind === "audio" ? "Listen live" : "Watch live"}
                    {active && <span className="eq" aria-hidden="true"><i /><i /><i /></span>}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {!now ? (
        <div className="live" aria-busy="true" />
      ) : data.items.length ? (
        <div className="live">
          {groups.map((g) => (
            <section key={g.day} aria-label={g.day}>
              <h2 className="live-day">{g.day}</h2>
              <ol className="live-list">
                {g.items.map((item) => {
                  const t = new Date(item.date!).getTime();
                  const recent = now - t < 3600 * 1000;
                  const open = video === item.id;
                  return (
                    <li key={item.id} className={`live-row ${recent ? "is-fresh" : ""} ${arrived.has(item.id) ? "is-arrived" : ""}`}>
                      <time dateTime={item.date!} className="live-time">
                        {timeFmt.format(new Date(t))}
                      </time>
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="thumb thumb-empty" aria-hidden="true">
                          {TYPE_LABEL[item.type]}
                        </span>
                      )}
                      <div className="match-body">
                        <a className="match-title" href={item.link} target="_blank" rel="noreferrer">
                          {item.title}
                        </a>
                        <div className="match-meta">
                          {item.live === "live" && <span className="badge-live">Live</span>}
                          {item.live === "upcoming" && <span className="badge-soon">Upcoming</span>}
                          <span className="type">{TYPE_LABEL[item.type]}</span>
                          <span>{item.show}</span>
                          <span className="market-tag">{marketNames[item.market] || item.market}</span>
                          {recent && <span className="fresh">New</span>}
                        </div>
                        <ContentActions item={item} />
                      </div>
                      <div className="row-actions">
                        {item.videoId && (
                          <button type="button" className="play" onClick={() => setVideo(open ? null : item.id)} aria-expanded={open}>
                            {open ? "Hide" : "Watch"}
                          </button>
                        )}
                        {item.audio && (
                          <button
                            type="button"
                            className="play"
                            onClick={() => setAudio({ title: item.title, subtitle: item.show, src: item.audio! })}
                          >
                            {audio?.src === item.audio ? "Playing" : "Listen"}
                          </button>
                        )}
                      </div>
                      {open && item.videoId && (
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
          ))}
        </div>
      ) : (
        <div className="empty">
          <p>No {typeLabel} published in this window yet. Widen the window, or click <strong>Refresh now</strong>.</p>
        </div>
      )}
      {data.total > data.items.length && (
        <p className="side-note">Showing the newest {data.items.length} of {data.total}. Narrow by market or type to see the rest.</p>
      )}
      <AudioBar playing={audio} onClose={() => setAudio(null)} />
    </>
  );
}
