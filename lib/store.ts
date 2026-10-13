import { head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import type { MarketIndex } from "./types";

/**
 * One JSON document per market. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN
 * is set (production); otherwise ./.data on disk (local dev).
 */
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const key = (market: string) => `pulse/index-${market}.json`;
const localPath = (market: string) => path.join(process.cwd(), ".data", `index-${market}.json`);

export async function readIndex(market: string): Promise<MarketIndex | null> {
  try {
    if (useBlob()) {
      const meta = await head(key(market));
      const res = await fetch(`${meta.url}?v=${meta.uploadedAt.getTime()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as MarketIndex;
    }
    return JSON.parse(await fs.readFile(localPath(market), "utf8")) as MarketIndex;
  } catch {
    return null;
  }
}

export async function writeIndex(index: MarketIndex): Promise<void> {
  const body = JSON.stringify(index);
  if (useBlob()) {
    await put(key(index.market), body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    return;
  }
  await fs.mkdir(path.dirname(localPath(index.market)), { recursive: true });
  await fs.writeFile(localPath(index.market), body);
}
