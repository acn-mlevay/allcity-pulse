"use server";
import { revalidatePath } from "next/cache";
import { readSettings, writeSettings, type RefreshMode } from "@/lib/store";

export async function setRefreshMode(formData: FormData) {
  const mode = formData.get("mode");
  if (mode !== "daily" && mode !== "frequent") return;
  await writeSettings({ ...(await readSettings()), refreshMode: mode as RefreshMode });
  revalidatePath("/", "layout");
}
