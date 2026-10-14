import { NextResponse } from "next/server";
import { head, put } from "@vercel/blob";
import { publicBaseUrl } from "@/lib/websub";

export const dynamic = "force-dynamic";

/** Setup check. Open /api/health in a browser; shows yes/no only, never secret values. */
export async function GET() {
  const checks: Record<string, unknown> = {
    BLOB_READ_WRITE_TOKEN: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    CRON_SECRET: Boolean(process.env.CRON_SECRET),
    YOUTUBE_API_KEY: Boolean(process.env.YOUTUBE_API_KEY),
    publicUrl: publicBaseUrl(),
    protectionBypass: Boolean(process.env.VERCEL_AUTOMATION_BYPASS_SECRET),
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put("pulse/health.json", JSON.stringify({ at: new Date().toISOString() }), {
        access: "public",
        contentType: "application/json",
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      const meta = await head("pulse/health.json");
      const res = await fetch(meta.url, { cache: "no-store" });
      checks.blobWrite = "ok";
      checks.blobRead = res.ok ? "ok" : `HTTP ${res.status}`;
    } catch (e) {
      checks.blobWrite = `failed: ${(e as Error).message}`;
    }
  }

  const base = publicBaseUrl();
  if (base) {
    try {
      const headers: Record<string, string> = {};
      if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) headers["x-vercel-protection-bypass"] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
      const res = await fetch(`${base}/api/ingest?chain=999`, {
        headers: { ...headers, ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}) },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      checks.selfCall = res.ok ? "ok" : `HTTP ${res.status}`;
    } catch (e) {
      checks.selfCall = `failed: ${(e as Error).message}`;
    }
  }
  return NextResponse.json(checks, { headers: { "Cache-Control": "no-store" } });
}
