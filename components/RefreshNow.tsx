"use client";
import { useActionState } from "react";
import { refreshNow } from "@/app/actions";

export function RefreshNow({ running, note }: { running: boolean; note: string }) {
  const [message, action, pending] = useActionState(refreshNow, null);
  return (
    <form action={action} className="refresh">
      <button type="submit" className="play refresh-now" disabled={pending || running}>
        {pending ? "Starting..." : running ? "Refreshing..." : "Refresh now"}
      </button>
      <p className={`refresh-note ${message?.startsWith("Error") ? "refresh-error" : ""}`} role="status">
        {message || note}
      </p>
    </form>
  );
}
