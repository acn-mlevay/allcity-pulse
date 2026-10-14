"use client";
import { useActionState } from "react";
import { refreshNow } from "@/app/actions";

export function RefreshNow({ running, note }: { running: boolean; note: string }) {
  const [message, action, pending] = useActionState(refreshNow, null);
  const busy = pending || running;
  return (
    <form action={action} className="refresh-hero">
      <button type="submit" className={`refresh-btn ${busy ? "is-busy" : ""}`} disabled={busy}>
        <svg className="refresh-icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {pending ? "Starting..." : running ? "Refreshing all markets" : "Refresh now"}
      </button>
      <p className={`refresh-note ${message?.startsWith("Error") ? "refresh-error" : ""}`} role="status">
        {message || note}
      </p>
    </form>
  );
}
