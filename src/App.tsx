import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { setupAutopilotListener, useStore } from "./lib/store";
import { Sidebar } from "./components/Sidebar";
import { SetupModal } from "./components/SetupModal";
import { UpdatesModal } from "./components/UpdatesModal";
import { WhatsNewModal } from "./components/WhatsNewModal";
import { Toasts } from "./components/Toasts";
import { HomePage } from "./pages/Home";
import { StrategiesPage } from "./pages/Strategies";
import { ZapretPage } from "./pages/Zapret";
import { AutopilotPage } from "./pages/Autopilot";
import { TelegramPage } from "./pages/Telegram";
import { WarpPage } from "./pages/Warp";
import { LogsPage } from "./pages/Logs";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  const { t } = useTranslation();
  const { page, appInfo, init, refreshStatus } = useStore();

  useEffect(() => {
    init();
    const cleanupAp = setupAutopilotListener(t);
    const statusInterval = setInterval(() => refreshStatus(), 2500);
    const updatesInterval = setInterval(
      () => {
        const { settings, checkUpdates } = useStore.getState();
        if (settings?.checkUpdatesOnStart) {
          checkUpdates({ silent: true }).catch(() => {});
        }
      },
      60 * 60 * 1000,
    );
    return () => {
      cleanupAp();
      clearInterval(statusInterval);
      clearInterval(updatesInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full bg-[rgb(var(--surface))] text-slate-900 dark:text-slate-100">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {appInfo && appInfo.isWindows && !appInfo.isAdmin && (
          <div className="bg-red-600 px-5 py-2 text-center text-sm font-semibold text-white">
            {t("adminWarning")}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {page === "home" && <HomePage />}
          {page === "autopilot" && <AutopilotPage />}
          {page === "strategies" && <StrategiesPage />}
          {page === "zapret" && <ZapretPage />}
          {page === "telegram" && <TelegramPage />}
          {page === "warp" && <WarpPage />}
          {page === "logs" && <LogsPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </main>
      <SetupModal />
      <UpdatesModal />
      <WhatsNewModal />
      <Toasts />
    </div>
  );
}
