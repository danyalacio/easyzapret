import { useEffect } from "react";
import { useTranslation } from "react-i18next";
<<<<<<< HEAD
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
=======
import { useStore } from "./lib/store";
import { Sidebar } from "./components/Sidebar";
import { SetupModal } from "./components/SetupModal";
import { UpdatesModal } from "./components/UpdatesModal";
import { Toasts } from "./components/Toasts";
import { HomePage } from "./pages/Home";
import { StrategiesPage } from "./pages/Strategies";
import { ServicePage } from "./pages/Service";
import { TestsPage } from "./pages/Tests";
import { ListsPage } from "./pages/Lists";
import { TelegramPage } from "./pages/Telegram";
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
import { LogsPage } from "./pages/Logs";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  const { t } = useTranslation();
  const { page, appInfo, init, refreshStatus } = useStore();

  useEffect(() => {
    init();
<<<<<<< HEAD
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
=======
    const interval = setInterval(() => refreshStatus(), 2500);
    return () => clearInterval(interval);
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
<<<<<<< HEAD
    <div className="flex h-full bg-[rgb(var(--surface))] text-slate-900 dark:text-slate-100">
=======
    <div className="flex h-full bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {appInfo && appInfo.isWindows && !appInfo.isAdmin && (
          <div className="bg-red-600 px-5 py-2 text-center text-sm font-semibold text-white">
            {t("adminWarning")}
          </div>
        )}
<<<<<<< HEAD
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
          {page === "home" && <HomePage />}
          {page === "autopilot" && <AutopilotPage />}
          {page === "strategies" && <StrategiesPage />}
          {page === "zapret" && <ZapretPage />}
          {page === "telegram" && <TelegramPage />}
          {page === "warp" && <WarpPage />}
=======
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {page === "home" && <HomePage />}
          {page === "strategies" && <StrategiesPage />}
          {page === "service" && <ServicePage />}
          {page === "tests" && <TestsPage />}
          {page === "lists" && <ListsPage />}
          {page === "telegram" && <TelegramPage />}
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
          {page === "logs" && <LogsPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </main>
      <SetupModal />
      <UpdatesModal />
<<<<<<< HEAD
      <WhatsNewModal />
=======
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
      <Toasts />
    </div>
  );
}
