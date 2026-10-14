"use client";
import { useState } from "react";
import type { StreamConfig } from "@/lib/types";
import { HlsMedia } from "./Player";

type Status = "loading" | "playing" | "error";

/**
 * Every live channel playing at once, each in its own tile, muted. Unmuting
 * one tile mutes the others so only one channel is heard at a time.
 */
export function LiveWall({ streams, marketNames }: { streams: StreamConfig[]; marketNames: Record<string, string> }) {
  const [audible, setAudible] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, Status>>({});
  if (!streams.length) return null;
  const kind = streams[0].kind;

  return (
    <div className={`wall wall-${kind}`}>
      {streams.map((s) => {
        const on = audible === s.url;
        const st = status[s.url] || "loading";
        return (
          <div key={s.url} className={`wall-tile ${on ? "is-on" : ""} is-${st}`}>
            {kind === "video" ? (
              <HlsMedia
                src={s.url}
                kind="video"
                muted={!on}
                controls={false}
                className="wall-video"
                onStatus={(x) => setStatus((p) => ({ ...p, [s.url]: x }))}
              />
            ) : (
              <>
                <HlsMedia
                  src={s.url}
                  kind="audio"
                  muted={!on}
                  controls={false}
                  onStatus={(x) => setStatus((p) => ({ ...p, [s.url]: x }))}
                />
                <div className="wall-audio-art" aria-hidden="true">
                  <span className="wall-audio-market">{marketNames[s.market] || s.market}</span>
                  <span className={`eq eq-big ${on && st === "playing" ? "" : "is-still"}`}><i /><i /><i /><i /><i /></span>
                </div>
              </>
            )}
            <div className="wall-bar">
              <span className="badge-live">Live</span>
              <span className="wall-name">{s.name}</span>
              <span className="wall-state">{st === "error" ? "Unavailable" : st === "loading" ? "Connecting" : ""}</span>
              <button
                type="button"
                className={`wall-btn ${on ? "is-on" : ""}`}
                onClick={() => setAudible(on ? null : s.url)}
                aria-pressed={on}
                aria-label={on ? `Mute ${s.name}` : `Unmute ${s.name}`}
              >
                {on ? "Mute" : "Unmute"}
              </button>
              {kind === "video" && (
                <button
                  type="button"
                  className="wall-btn"
                  aria-label={`Full screen ${s.name}`}
                  onClick={(e) => {
                    const v = (e.currentTarget.closest(".wall-tile") as HTMLElement | null)?.querySelector("video");
                    v?.requestFullscreen?.();
                  }}
                >
                  Full screen
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
