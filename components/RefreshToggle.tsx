import { setRefreshMode } from "@/app/actions";
import { RefreshNow } from "./RefreshNow";
import { ago } from "@/lib/format";
import { REFRESH_LABEL } from "@/lib/schedule";
import type { RefreshMode } from "@/lib/store";

/** Server-rendered toggle; each option is a submit button for the server action. */
export function RefreshToggle({ mode, startedAt }: { mode: RefreshMode; startedAt?: string }) {
  const running = startedAt && Date.now() - new Date(startedAt).getTime() < 5 * 60 * 1000;
  return (
    <>
    <RefreshNow
      running={!!running}
      note={startedAt ? `Last full refresh started ${ago(startedAt)}` : "No full refresh yet"}
    />
    <form action={setRefreshMode} className="refresh">
      <p className="refresh-label" id="refresh-label">Background refresh</p>
      <div className="views" role="group" aria-labelledby="refresh-label">
        {(["daily", "frequent"] as const).map((m) => (
          <button key={m} type="submit" name="mode" value={m} aria-pressed={mode === m}>
            {m === "daily" ? "Daily" : "30 min"}
          </button>
        ))}
      </div>
      <p className="refresh-note">{REFRESH_LABEL[mode]}</p>
    </form>
    </>
  );
}
