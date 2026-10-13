import { createHmac, timingSafeEqual } from "crypto";

/**
 * WebSub (PubSubHubbub) subscriber. YouTube and Simplecast feeds advertise a
 * hub; subscribing makes the hub POST new entries to /api/websub within
 * seconds of publishing.
 */
const LEASE_SECONDS = 10 * 86400;
export const RENEW_AFTER_MS = 4 * 86400 * 1000;

export function publicBaseUrl(): string | null {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return null;
}

/** Per-feed secret the hub uses to sign pushes. */
export function hubSecret(market: string, feedUrl: string): string {
  const base = process.env.CRON_SECRET || "allcity-pulse";
  return createHmac("sha256", base).update(`${market}|${feedUrl}`).digest("hex").slice(0, 48);
}

export function callbackUrl(market: string, feedUrl: string): string | null {
  const base = publicBaseUrl();
  if (!base) return null;
  const q = new URLSearchParams({ market, feed: feedUrl });
  // Lets hubs reach the callback through Vercel Deployment Protection.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    q.set("x-vercel-protection-bypass", process.env.VERCEL_AUTOMATION_BYPASS_SECRET);
  }
  return `${base}/api/websub?${q}`;
}

export async function subscribe(hub: string, topic: string, market: string, feedUrl: string) {
  const callback = callbackUrl(market, feedUrl);
  if (!callback) throw new Error("Set PUBLIC_URL (or deploy on Vercel) so hubs can reach /api/websub");
  const res = await fetch(hub, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.topic": topic,
      "hub.callback": callback,
      "hub.lease_seconds": String(LEASE_SECONDS),
      "hub.secret": hubSecret(market, feedUrl),
      "hub.verify": "async",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status !== 202 && res.status !== 204) {
    throw new Error(`hub ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
}

/** Checks X-Hub-Signature ("sha1=..." or "sha256=...") against the body. */
export function verifySignature(header: string | null, body: string, secret: string): boolean {
  if (!header) return false;
  const [algo, sig] = header.split("=");
  if (!sig || !["sha1", "sha256", "sha384", "sha512"].includes(algo)) return false;
  const expected = createHmac(algo, secret).update(body).digest("hex");
  const a = Buffer.from(sig, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
