import { useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { LogsPage } from "./pages/Logs";
import { SettingsPage } from "./pages/Settings";

export default function App() {
  const { t } = useTranslation();
  const { page, appInfo, init, refreshStatus } = useStore();

  useEffect(() => {
    init();
    const interval = setInterval(() => refreshStatus(), 2500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        {appInfo && appInfo.isWindows && !appInfo.isAdmin && (
          <div className="bg-red-600 px-5 py-2 text-center text-sm font-semibold text-white">
            {t("adminWarning")}
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {page === "home" && <HomePage />}
          {page === "strategies" && <StrategiesPage />}
          {page === "service" && <ServicePage />}
          {page === "tests" && <TestsPage />}
          {page === "lists" && <ListsPage />}
          {page === "telegram" && <TelegramPage />}
          {page === "logs" && <LogsPage />}
          {page === "settings" && <SettingsPage />}
        </div>
      </main>
      <SetupModal />
      <UpdatesModal />
      <Toasts />
    </div>
  );
}
