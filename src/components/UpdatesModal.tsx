import { useState } from "react";
import { useTranslation } from "react-i18next";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../lib/api";
import { errText } from "../lib/errors";
import { toast } from "../lib/toast";
import { useStore } from "../lib/store";
import { Button, Modal, Spinner } from "../components/ui";

export function UpdatesModal() {
  const { t } = useTranslation();
  const {
    showUpdatesModal,
    updates,
    dismissUpdatesModal,
    refreshComponents,
    refreshStrategies,
    checkUpdates,
  } = useStore();
  const [installing, setInstalling] = useState<string | null>(null);

  const available = updates?.filter((u) => u.updateAvailable) ?? [];
  if (!showUpdatesModal || available.length === 0) return null;

  async function install(component: "zapret" | "tgproxy") {
    setInstalling(component);
    try {
      await api.installComponent(component);
      await Promise.all([refreshComponents(), refreshStrategies()]);
      await checkUpdates();
      toast(t("setup.done"), "ok");
    } catch (e) {
      toast(errText(t, e), "fail");
    } finally {
      setInstalling(null);
    }
  }

  return (
    <Modal
      open
      onClose={dismissUpdatesModal}
      title={t("settings.updatesModalTitle")}
      footer={
        <Button onClick={dismissUpdatesModal} disabled={installing !== null}>
          {t("common.later")}
        </Button>
      }
    >
      <p className="mb-4">{t("settings.updatesModalText")}</p>
      <div className="space-y-2">
        {available.map((u) => (
          <div
            key={u.component}
            className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/50"
          >
            <div>
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {u.component === "zapret" ? "Zapret" : "Telegram Proxy"}
              </div>
              <div className="text-xs text-slate-400">
                {u.installed ?? "—"} → <span className="font-semibold">{u.latest}</span>
                {u.releaseUrl && (
                  <button
                    className="ml-2 underline"
                    onClick={() => openUrl(u.releaseUrl!).catch(() => {})}
                  >
                    {t("settings.openRelease")}
                  </button>
                )}
              </div>
            </div>
            <Button
              variant="primary"
              disabled={installing !== null}
              onClick={() => install(u.component)}
            >
              {installing === u.component ? <Spinner /> : null}
              {t("common.update")}
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
