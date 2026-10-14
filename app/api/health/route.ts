import { NextResponse } from "next/server";
import { readJSON, writeJSON, BLOB_ACCESS } from "@/lib/store";
import { publicBaseUrl } from "@/lib/websub";

export const dynamic = "force-dynamic";

/** Setup check. Open /api/health in a browser; shows yes/no only, never secret values. */
export async function GET() {
  const checks: Record<string, unknown> = {
    BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    blobAccess: BLOB_ACCESS,
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    YOUTUBE_API_KEY: Boolean(process.env.YOUTUBE_API_KEY),
    publicUrl: publicBaseUrl(),
    protectionBypass: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const stamp = new Date().toISOString();
    try {
      await writeJSON("health", { at: stamp });
      checks.blobWrite = "ok";
      const back = await readJSON<{ at: string }>("health");
      checks.blobRead = back?.at === stamp ? "ok" : "failed: read back a different value";
    } catch (e) {
      checks.blobWrite = `failed: ${(e as Error).message}`;
    }
  }

  const base = publicBaseUrl();
  if (base) {
    try {
      const headers: Record<string, string> = {};
      if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      if (process.env.CRON_SECRET) headers.Authorization = `Bearer ${process.env.CRON_SECRET}`;
      const res = await fetch(`${base}/api/ingest?chain=999`, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
      checks.selfCall = res.ok ? "ok" : `HTTP ${res.status}`;
    } catch (e) {
      checks.selfCall = `failed: ${(e as Error).message}`;
    }
  }
  return NextResponse.json(checks, { headers: { "Cache-Control": "no-store" } });
}
