"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * <audio>/<video> that plays HLS (.m3u8) via hls.js where the browser can't
 * natively (Safari can). Muted autoplay is allowed by every major browser.
 */
export function HlsMedia({
  src,
  kind,
  autoPlay = true,
  muted = false,
  controls = true,
  className,
  onStatus,
}: {
  src: string;
  kind: "audio" | "video";
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onStatus?: (s: "loading" | "playing" | "error") => void;
}) {
  const ref = useRef<HTMLMediaElement | null>(null);
  const status = useRef(onStatus);
  status.current = onStatus;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
    status.current?.("loading");
    const onPlaying = () => status.current?.("playing");
    const onError = () => status.current?.("error");
    el.addEventListener("playing", onPlaying);
    el.addEventListener("error", onError);
    const start = () => {
      if (autoPlay) el.play().catch(() => {});
    };

    let hls: { destroy(): void } | null = null;
    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (!isHls || el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = src;
      start();
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (!Hls.isSupported()) return status.current?.("error");
        const h = new Hls({ lowLatencyMode: true });
        h.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) status.current?.("error");
        });
        h.on(Hls.Events.MANIFEST_PARSED, start);
        h.loadSource(src);
        h.attachMedia(el);
        hls = h;
      });
    }
    return () => {
      el.removeEventListener("playing", onPlaying);
      el.removeEventListener("error", onError);
      hls?.destroy();
      el.removeAttribute("src");
      el.load();
    };
    // Muting is handled below without reloading the stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay]);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  const set = (n: HTMLMediaElement | null) => {
    ref.current = n;
  };
  return kind === "video" ? (
    <video ref={set} controls={controls} playsInline muted={muted} className={className} />
  ) : (
    <audio ref={set} controls={controls} muted={muted} className={className} />
  );
}

/** Back-compat name used by older components. */
export const MediaElement = HlsMedia;

export interface NowPlaying {
  id: string;
  title: string;
  subtitle: string;
  src: string;
}

const PlayerCtx = createContext<{ playing: NowPlaying | null; play: (n: NowPlaying | null) => void }>({
  playing: null,
  play: () => {},
});

export const usePlayer = () => useContext(PlayerCtx);

/** One shared audio bar for podcast playback across the page. */
export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playing, setPlaying] = useState<NowPlaying | null>(null);
  const play = useCallback((n: NowPlaying | null) => setPlaying(n), []);
  return (
    <PlayerCtx.Provider value={{ playing, play }}>
      {children}
      {playing && (
        <div className="player" role="region" aria-label="Audio player">
          <div className="player-meta">
            <strong>{playing.title}</strong>
            <span>{playing.subtitle}</span>
          </div>
          <HlsMedia key={playing.id} src={playing.src} kind="audio" className="player-audio" />
          <button type="button" className="act" onClick={() => setPlaying(null)}>
            Close
          </button>
        </div>
      )}
    </PlayerCtx.Provider>
  );
}
