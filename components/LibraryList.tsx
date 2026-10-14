"use client";
import type { ContentItem } from "@/lib/types";
import { ContentActions } from "./ContentActions";
import { usePlayer } from "./Player";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateLabel(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${sameYear ? "" : `, ${d.getUTCFullYear()}`}`;
}

export function LibraryList({ items, marketNames }: { items: ContentItem[]; marketNames: Record<string, string> }) {
  const { playing, play } = usePlayer();
  return (
    <ol className="lib-list">
      {items.map((item, i) => {
        const on = playing?.id === item.id;
        return (
          <li key={item.id} className={`lib-row ${on ? "is-on" : ""}`} style={{ ["--i" as string]: Math.min(i, 15) }}>
            <time className="lib-date" dateTime={item.date || undefined}>{dateLabel(item.date)}</time>
            {item.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="thumb" src={item.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <span className="thumb thumb-empty" aria-hidden="true">{marketNames[item.market] || ""}</span>
            )}
            <div className="match-body">
              <a className="match-title" href={item.link} target="_blank" rel="noreferrer">{item.title}</a>
              <div className="match-meta">
                <span>{item.type === "article" ? item.section || item.show : item.show}</span>
                <span className="market-tag">{marketNames[item.market] || item.market}</span>
              </div>
              <ContentActions item={item} />
            </div>
            {item.audio && (
              <button
                type="button"
                className={`play ${on ? "is-on" : ""}`}
                onClick={() => play(on ? null : { id: item.id, title: item.title, subtitle: item.show, src: item.audio! })}
              >
                {on ? "Stop" : "Listen"}
              </button>
            )}
          </li>
        );
      })}
    </ol>
  );
}
