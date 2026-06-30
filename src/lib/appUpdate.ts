import { check, type DownloadEvent } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type AppUpdateProgress =
  | { phase: "checking" }
  | { phase: "downloading"; percent: number }
  | { phase: "installing" }
  | { phase: "done" };

/** Returns true if an update was installed and the app is about to relaunch. */
export async function installAppUpdate(
  onProgress?: (p: AppUpdateProgress) => void,
): Promise<boolean> {
  onProgress?.({ phase: "checking" });
  const update = await check();
  if (!update) return false;

  onProgress?.({ phase: "downloading", percent: 0 });
  let downloaded = 0;
  let total = 0;

  await update.downloadAndInstall((event: DownloadEvent) => {
    if (event.event === "Started" && event.data.contentLength) {
      total = event.data.contentLength;
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength;
      if (total > 0) {
        onProgress?.({
          phase: "downloading",
          percent: Math.min(100, Math.round((downloaded / total) * 100)),
        });
      }
    } else if (event.event === "Finished") {
      onProgress?.({ phase: "installing" });
    }
  });

  onProgress?.({ phase: "done" });
  await relaunch();
  return true;
}
