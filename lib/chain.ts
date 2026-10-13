import { MARKETS } from "@/config/markets";
import { readSettings, writeSettings } from "./store";
import { publicBaseUrl } from "./websub";

/**
 * Full refresh as a chain of calls, one market per call, so it fits Vercel
 * Hobby: one daily cron starts it, and each step triggers the next. Each step
 * gets its own function time limit.
 */
const STALE_MS = 30 * 60 * 1000;

function selfUrl(step: number): string | null {
  const base =
    publicBaseUrl() || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  return base ? `${base}/api/ingest?chain=${step}` : null;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (process.env.CRON_SECRET) h.Authorization = `Bearer ${process.env.CRON_SECRET}`;
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    h["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  return h;
}

/** Kicks off a chain step. The callee answers right away and works after responding. */
export async function triggerStep(step: number): Promise<void> {
  if (step >= MARKETS.length) return;
  const url = selfUrl(step);
  if (!url) throw new Error("No public URL to call; set PUBLIC_URL");
  const res = await fetch(url, { headers: authHeaders(), signal: AbortSignal.timeout(20000), cache: "no-store" });
  if (!res.ok) throw new Error(`chain step ${step}: HTTP ${res.status}`);
}

/**
 * In "frequent" mode, a page view starts a full refresh when the last one is
 * over 30 minutes old. Works on any Vercel plan; only runs while the app is in use.
 */
export async function maybeStartChain(): Promise<void> {
  const settings = await readSettings();
  if (settings.refreshMode !== "frequent") return;
  const last = settings.chainStartedAt ? new Date(settings.chainStartedAt).getTime() : 0;
  if (Date.now() - last < STALE_MS) return;
  await writeSettings({ ...settings, chainStartedAt: new Date().toISOString() });
  await triggerStep(0);
}

export async function markChainStarted() {
  const settings = await readSettings();
  await writeSettings({ ...settings, chainStartedAt: new Date().toISOString() });
}
