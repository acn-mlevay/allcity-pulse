"use client";
import { useEffect, useRef } from "react";

/** <audio>/<video> that also plays HLS (.m3u8) via hls.js where the browser can't natively. */
export function MediaElement({ src, kind, autoPlay = true }: { src: string; kind: "audio" | "video"; autoPlay?: boolean }) {
  const ref = useRef<HTMLMediaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const isHls = /\.m3u8(\?|$)/i.test(src);
    if (!isHls || el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = src;
      if (autoPlay) el.play().catch(() => {});
      return;
    }
    let hls: { destroy(): void } | null = null;
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported()) return;
      const h = new Hls();
      h.loadSource(src);
      h.attachMedia(el as HTMLMediaElement);
      if (autoPlay) h.on(Hls.Events.MANIFEST_PARSED, () => el.play().catch(() => {}));
      hls = h;
    });
    return () => hls?.destroy();
  }, [src, autoPlay]);

  return kind === "video" ? (
    <video ref={(n) => { ref.current = n; }} controls playsInline className="stream-video" />
  ) : (
    <audio ref={(n) => { ref.current = n; }} controls className="player-audio" />
  );
}

export interface NowPlaying {
  title: string;
  subtitle: string;
  src: string;
}

/** Sticky bottom bar for audio. */
export function AudioBar({ playing, onClose }: { playing: NowPlaying | null; onClose: () => void }) {
  if (!playing) return null;
  return (
    <div className="player" role="region" aria-label="Audio player">
      <div className="player-meta">
        <strong>{playing.title}</strong>
        <span>{playing.subtitle}</span>
      </div>
      <MediaElement key={playing.src} src={playing.src} kind="audio" />
      <button type="button" className="copy" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
