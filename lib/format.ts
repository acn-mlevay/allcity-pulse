const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Year is the headline for archive content; month/day for this year. */
export function stamp(iso: string | null, now = new Date()) {
  if (!iso) return { big: "n/a", small: "" };
  const d = new Date(iso);
  if (d.getUTCFullYear() === now.getUTCFullYear()) {
    return { big: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, small: String(d.getUTCFullYear()) };
  }
  return { big: String(d.getUTCFullYear()), small: MONTHS[d.getUTCMonth()] };
}

export function isArchive(iso: string | null, now = Date.now()): boolean {
  return !!iso && now - new Date(iso).getTime() > 365 * 864e5;
}
