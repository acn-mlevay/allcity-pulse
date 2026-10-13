"use server";
import { revalidatePath } from "next/cache";
import { readSettings, writeSettings, type RefreshMode } from "@/lib/store";

export async function setRefreshMode(formData: FormData) {
  const mode = formData.get("mode");
  if (mode !== "daily" && mode !== "frequent") return;
  await writeSettings({ ...(await readSettings()), refreshMode: mode as RefreshMode });
  revalidatePath("/", "layout");
}

/** Starts a full refresh of every market in the background (same as the daily cron). */
export async function refreshNow() {
  const { triggerStep, markChainStarted } = await import("@/lib/chain");
  const settings = await readSettings();
  const last = settings.chainStartedAt ? new Date(settings.chainStartedAt).getTime() : 0;
  if (Date.now() - last < 5 * 60 * 1000) return; // one already running
  await markChainStarted();
  await triggerStep(0);
  revalidatePath("/", "layout");
}
