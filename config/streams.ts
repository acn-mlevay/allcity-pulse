import type { StreamConfig } from "@/lib/types";

/**
 * 24/7 live channels shown in the "On air" strip of the live feed.
 * HLS (.m3u8) works for audio and video; direct audio streams (mp3/aac) work for audio.
 * Example: { name: "DNVR Live", market: "dnvr", kind: "video", url: "https://.../master.m3u8" }
 */
export const STREAMS: StreamConfig[] = [];
