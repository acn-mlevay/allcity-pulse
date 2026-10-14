import type { ContentItem, Trend } from "./types";

/** Search links for a trend on the platforms where conversation happens. */
export function platformLinks(label: string) {
  const q = encodeURIComponent(`"${label}"`);
  return [
    { name: "Google News", url: `https://news.google.com/search?q=${q}&hl=en-US&gl=US&ceid=US:en` },
    { name: "X", url: `https://x.com/search?q=${q}&f=live` },
    { name: "YouTube", url: `https://www.youtube.com/results?search_query=${q}` },
    { name: "Reddit", url: `https://www.reddit.com/search/?q=${q}&sort=new` },
    { name: "TikTok", url: `https://www.tiktok.com/search?q=${q}` },
  ];
}

export function embedCode(item: ContentItem): string | null {
  if (item.videoId) {
    return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${item.videoId}" title="${escapeAttr(item.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  }
  const sc = item.link.match(/player\.simplecast\.com\/([0-9a-f-]{36})/)?.[1];
  if (sc) {
    return `<iframe height="200px" width="100%" frameborder="no" scrolling="no" seamless src="https://player.simplecast.com/${sc}?dark=false"></iframe>`;
  }
  return null;
}

const escapeAttr = (s: string) => s.replace(/"/g, "&quot;");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function when(date: string | null): string {
  if (!date) return "";
  const d = new Date(date);
  return ` (${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()})`;
}

export function pitch(item: ContentItem, trend?: Trend) {
  const kind = item.type === "audio" ? "episode" : item.type === "video" ? "video" : "piece";
  const subject = trend ? `${trend.label}: ${item.title}` : item.title;
  const lead = trend
    ? `With ${trend.label} in the news, this ALLCITY ${kind} from ${item.show}${when(item.date)} is directly on point:`
    : `Sharing this ALLCITY ${kind} from ${item.show}${when(item.date)}:`;
  const body = `Hi,\n\n${lead}\n\n${item.title}\n${item.link}\n\nHappy to provide clips, quotes, or talent for your coverage.\n\nBest,\n`;
  return { subject, body };
}

export function mailto(to: string, subject: string, body: string) {
  return `mailto:${encodeURIComponent(to).replace(/%40/g, "@").replace(/%2C/g, ",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function csvCell(v: unknown) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
