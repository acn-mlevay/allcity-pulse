import type { MarketIndex } from "./types";
import type { RefreshMode } from "./store";

/** Daily refresh runs on the first cron tick at or after this hour (UTC). 10 UTC = 6 AM Eastern in summer, 5 AM in winter. */
export const DAILY_HOUR_UTC = 10;

export const REFRESH_LABEL: Record<RefreshMode, string> = {
  daily: "Daily, around 6 AM ET",
  frequent: "Daily, plus every 30 min while the app is open",
};

/**
 * Whether a cron tick should run. Manual runs always go through; this only
 * gates calls from Vercel Cron.
 */
export function shouldRunCron(mode: RefreshMode, fastLane: boolean, index: MarketIndex | null, now = new Date()): boolean {
  if (mode === "frequent") return true;
  if (fastLane) return false; // daily full run covers every content type
  if (now.getUTCHours() < DAILY_HOUR_UTC) return false;
  const last = index?.fullAt ? new Date(index.fullAt) : null;
  return !last || last.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
}
