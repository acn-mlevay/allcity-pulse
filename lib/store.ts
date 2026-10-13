import { head, put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import type { LiveStore, MarketIndex } from "./types";

/**
 * JSON documents (one index per market, plus settings). Uses Vercel Blob when
 * BLOB_READ_WRITE_TOKEN is set (production); otherwise ./.data on disk (local dev).
 */
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const localPath = (name: string) => path.join(process.cwd(), ".data", `${name}.json`);

/** Unchanged blobs are served from memory; head() tells us when they change. */
const memo = new Map<string, { version: number; data: unknown }>();

async function readJSON<T>(name: string): Promise<T | null> {
  try {
    if (useBlob()) {
      const meta = await head(`pulse/${name}.json`);
      const version = meta.uploadedAt.getTime();
      const hit = memo.get(name);
      if (hit && hit.version === version) return hit.data as T;
      const res = await fetch(`${meta.url}?v=${version}`, { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      memo.set(name, { version, data });
      return data;
    }
    return JSON.parse(await fs.readFile(localPath(name), "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJSON(name: string, value: unknown): Promise<void> {
  const body = JSON.stringify(value);
  if (useBlob()) {
    await put(`pulse/${name}.json`, body, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: 60,
    });
    return;
  }
  await fs.mkdir(path.dirname(localPath(name)), { recursive: true });
  await fs.writeFile(localPath(name), body);
}

export const readIndex = (market: string) => readJSON<MarketIndex>(`index-${market}`);
export const writeIndex = (index: MarketIndex) => writeJSON(`index-${index.market}`, index);

/** daily: one full refresh per market each morning. frequent: every cron tick. */
export type RefreshMode = "daily" | "frequent";
export interface Settings {
  refreshMode: RefreshMode;
  /** When the last full-refresh chain started. */
  chainStartedAt?: string;
}
export const DEFAULT_SETTINGS: Settings = { refreshMode: "daily" };

export async function readSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...((await readJSON<Partial<Settings>>("settings")) || {}) };
}
export const writeSettings = (s: Settings) => writeJSON("settings", s);

export const readLive = async (): Promise<LiveStore> =>
  (await readJSON<LiveStore>("live")) || { refreshedAt: null, items: [] };
export const writeLive = (s: LiveStore) => writeJSON("live", s);
