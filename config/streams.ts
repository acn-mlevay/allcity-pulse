import type { StreamConfig } from "@/lib/types";

/**
 * 24/7 live channels, shown at the top of the Live feed's Audio and Video tabs.
 * HLS (.m3u8) for both; Safari plays natively, other browsers use hls.js.
 */
export const STREAMS: StreamConfig[] = [
  // Live audio (StreamGuys)
  { name: "DNVR Live Audio", market: "dnvr", kind: "audio", url: "https://allcity.streamguys1.com/allcity/dnvr/playlist.m3u8" },
  { name: "CHGO Live Audio", market: "chgo", kind: "audio", url: "https://allcity.streamguys1.com/allcity/chgo/playlist.m3u8" },
  { name: "PHLY Live Audio", market: "phly", kind: "audio", url: "https://allcity.streamguys1.com/allcity/phly/playlist.m3u8" },

  // Live video / FAST (Zype)
  { name: "DNVR Live TV", market: "dnvr", kind: "video", url: "https://na.linear.zype.com/acf7347e-614e-452d-afbe-50964f444fa2/c054398f-3030-498c-96d9-2b23ecbed410-hls3/live.m3u8" },
  { name: "CHGO Live TV", market: "chgo", kind: "video", url: "https://na.linear.zype.com/d1a321a3-055a-4b99-80c7-309054067f91/28a561f0-e268-4a8f-9d1c-2d925fcafdb5-hls3/live.m3u8" },
  { name: "PHLY Live TV", market: "phly", kind: "video", url: "https://na.linear.zype.com/504d9824-ee67-45b3-85ec-9323c343c8d0/46c67167-aa70-4869-a70a-b2b4ae235c4a-hls3/live.m3u8" },
];
