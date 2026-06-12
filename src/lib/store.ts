import { create } from "zustand";
import { api } from "./api";
import i18n, { systemLanguage } from "../i18n";
import type {
  AppInfo,
  ComponentsState,
  FullStatus,
  Settings,
  UpdateStatus,
} from "./types";

export type Page =
  | "home"
  | "strategies"
  | "service"
  | "tests"
  | "lists"
  | "telegram"
  | "logs"
  | "settings";

interface AppStore {
  page: Page;
  appInfo: AppInfo | null;
  settings: Settings | null;
  components: ComponentsState | null;
  status: FullStatus | null;
  strategies: string[];
  updates: UpdateStatus[] | null;
  updatesCheckedAt: Date | null;
  updatesError: boolean;
  showSetup: boolean;
  showUpdatesModal: boolean;

  setPage: (page: Page) => void;
  init: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshComponents: () => Promise<void>;
  refreshStrategies: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  checkUpdates: () => Promise<void>;
  dismissSetup: () => void;
  dismissUpdatesModal: () => void;
}

function applyTheme(theme: string) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", () => {
    const theme = useStore.getState().settings?.theme ?? "system";
    applyTheme(theme);
  });

export const useStore = create<AppStore>((set, get) => ({
  page: "home",
  appInfo: null,
  settings: null,
  components: null,
  status: null,
  strategies: [],
  updates: null,
  updatesCheckedAt: null,
  updatesError: false,
  showSetup: false,
  showUpdatesModal: false,

  setPage: (page) => set({ page }),

  init: async () => {
    const [appInfo, settings, components] = await Promise.all([
      api.getAppInfo(),
      api.getSettings(),
      api.getComponentsState(),
    ]);
    const lang = settings.language ?? systemLanguage();
    if (i18n.language !== lang) await i18n.changeLanguage(lang);
    applyTheme(settings.theme);
    set({
      appInfo,
      settings,
      components,
      showSetup: !components.zapretInstalled || !components.tgInstalled,
    });
    await Promise.all([get().refreshStatus(), get().refreshStrategies()]);
    if (settings.checkUpdatesOnStart && components.zapretInstalled) {
      get().checkUpdates().catch(() => {});
    }
  },

  refreshStatus: async () => {
    try {
      const status = await api.getStatus();
      set({ status });
    } catch {
      // backend busy; keep previous status
    }
  },

  refreshComponents: async () => {
    const components = await api.getComponentsState();
    set({ components });
  },

  refreshStrategies: async () => {
    try {
      const strategies = await api.listStrategies();
      set({ strategies });
      // Auto-select the default strategy if none picked yet.
      const { settings } = get();
      if (settings && !settings.selectedStrategy && strategies.length > 0) {
        const general = strategies.find((s) => s.toLowerCase() === "general.bat");
        await get().updateSettings({ selectedStrategy: general ?? strategies[0] });
      }
    } catch {
      set({ strategies: [] });
    }
  },

  updateSettings: async (patch) => {
    const current = get().settings;
    if (!current) return;
    const settings = { ...current, ...patch };
    set({ settings });
    await api.saveSettings(settings);
    if (patch.theme) applyTheme(patch.theme);
    if (patch.language !== undefined) {
      await i18n.changeLanguage(patch.language ?? systemLanguage());
      api.refreshTray().catch(() => {});
    }
  },

  checkUpdates: async () => {
    try {
      const updates = await api.checkUpdates();
      const hasErrors = updates.every((u) => u.error);
      set({
        updates,
        updatesCheckedAt: new Date(),
        updatesError: hasErrors,
        showUpdatesModal: updates.some((u) => u.updateAvailable),
      });
    } catch {
      set({ updatesCheckedAt: new Date(), updatesError: true });
    }
  },

  dismissSetup: () => set({ showSetup: false }),
  dismissUpdatesModal: () => set({ showUpdatesModal: false }),
}));
