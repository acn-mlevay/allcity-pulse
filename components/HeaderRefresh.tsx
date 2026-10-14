import { readSettings } from "@/lib/store";
import { ago } from "@/lib/format";
import { RefreshNow } from "./RefreshNow";

export async function HeaderRefresh() {
  const { chainStartedAt } = await readSettings();
  const running = !!chainStartedAt && Date.now() - new Date(chainStartedAt).getTime() < 5 * 60 * 1000;
  return (
    <RefreshNow
      running={running}
      note={chainStartedAt ? `Last refresh ${ago(chainStartedAt)}` : "Not refreshed yet"}
    />
  );
}
