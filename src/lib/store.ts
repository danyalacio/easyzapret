import { create } from "zustand";
<<<<<<< HEAD
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { api } from "./api";
import i18n, { systemLanguage } from "../i18n";
import { toast } from "./toast";
import type { TFunction } from "i18next";
import type {
  AppInfo,
  AppUpdateStatus,
  AutopilotEvent,
=======
import { api } from "./api";
import i18n, { systemLanguage } from "../i18n";
import type {
  AppInfo,
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
  ComponentsState,
  FullStatus,
  Settings,
  UpdateStatus,
} from "./types";

export type Page =
  | "home"
  | "strategies"
<<<<<<< HEAD
  | "zapret"
  | "autopilot"
  | "telegram"
  | "warp"
  | "logs"
  | "settings";

export type ZapretTab = "service" | "tests" | "lists";

interface AppStore {
  page: Page;
  zapretTab: ZapretTab;
=======
  | "service"
  | "tests"
  | "lists"
  | "telegram"
  | "logs"
  | "settings";

interface AppStore {
  page: Page;
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
  appInfo: AppInfo | null;
  settings: Settings | null;
  components: ComponentsState | null;
  status: FullStatus | null;
  strategies: string[];
  updates: UpdateStatus[] | null;
<<<<<<< HEAD
  appUpdate: AppUpdateStatus | null;
=======
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
  updatesCheckedAt: Date | null;
  updatesError: boolean;
  showSetup: boolean;
  showUpdatesModal: boolean;
<<<<<<< HEAD
  showWhatsNew: boolean;

  setPage: (page: Page) => void;
  setZapretTab: (tab: ZapretTab) => void;
=======

  setPage: (page: Page) => void;
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
  init: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  refreshComponents: () => Promise<void>;
  refreshStrategies: () => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
<<<<<<< HEAD
  checkUpdates: (opts?: { silent?: boolean }) => Promise<void>;
  dismissSetup: () => void;
  dismissUpdatesModal: () => void;
  dismissWhatsNew: () => Promise<void>;
}

function applyTheme(theme: string) {
  const root = document.documentElement;
  root.classList.remove("dark", "theme-purple");

  if (theme === "purple") {
    root.classList.add("dark", "theme-purple");
    return;
  }
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
}

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  const theme = useStore.getState().settings?.theme ?? "system";
  if (theme === "system") applyTheme("system");
});

function defaultAutopilot(): Settings["autopilot"] {
  return {
    enabled: false,
    intervalMinutes: 15,
    policy: "stability",
    switchMode: "rotate_policy",
    allowedStrategies: [],
    maxTestStrategies: 6,
    autoSwitchStrategy: true,
    minHealthPercent: 60,
    probeDiscord: true,
    probeYoutube: true,
    probeCloudflare: true,
    probeGoogle: false,
    autoEnableWarp: false,
    autoEnableTg: false,
    notifyOnSwitch: true,
    notifyOnDegraded: true,
    maxSwitchesPerHour: 3,
    onlyWhenZapretRunning: true,
  };
}

function mergeSettings(raw: Settings): Settings {
  return {
    ...raw,
    autopilot: { ...defaultAutopilot(), ...raw.autopilot },
  };
}

export const useStore = create<AppStore>((set, get) => ({
  page: "home",
  zapretTab: "service",
=======
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
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
  appInfo: null,
  settings: null,
  components: null,
  status: null,
  strategies: [],
  updates: null,
<<<<<<< HEAD
  appUpdate: null,
=======
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
  updatesCheckedAt: null,
  updatesError: false,
  showSetup: false,
  showUpdatesModal: false,
<<<<<<< HEAD
  showWhatsNew: false,

  setPage: (page) => set({ page }),
  setZapretTab: (zapretTab) => set({ zapretTab, page: "zapret" }),

  init: async () => {
    const [appInfo, rawSettings, components] = await Promise.all([
=======

  setPage: (page) => set({ page }),

  init: async () => {
    const [appInfo, settings, components] = await Promise.all([
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
      api.getAppInfo(),
      api.getSettings(),
      api.getComponentsState(),
    ]);
<<<<<<< HEAD
    const settings = mergeSettings(rawSettings);
    const lang = settings.language ?? systemLanguage();
    if (i18n.language !== lang) await i18n.changeLanguage(lang);
    applyTheme(settings.theme);

    const showWhatsNew =
      settings.lastSeenChangelogVersion !== appInfo.version;

=======
    const lang = settings.language ?? systemLanguage();
    if (i18n.language !== lang) await i18n.changeLanguage(lang);
    applyTheme(settings.theme);
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
    set({
      appInfo,
      settings,
      components,
      showSetup: !components.zapretInstalled || !components.tgInstalled,
<<<<<<< HEAD
      showWhatsNew,
    });
    await Promise.all([get().refreshStatus(), get().refreshStrategies()]);
    if (settings.checkUpdatesOnStart) {
=======
    });
    await Promise.all([get().refreshStatus(), get().refreshStrategies()]);
    if (settings.checkUpdatesOnStart && components.zapretInstalled) {
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
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
<<<<<<< HEAD
=======
      // Auto-select the default strategy if none picked yet.
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
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
<<<<<<< HEAD
    const settings = mergeSettings({ ...current, ...patch });
=======
    const settings = { ...current, ...patch };
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
    set({ settings });
    await api.saveSettings(settings);
    if (patch.theme) applyTheme(patch.theme);
    if (patch.language !== undefined) {
      await i18n.changeLanguage(patch.language ?? systemLanguage());
      api.refreshTray().catch(() => {});
    }
  },

<<<<<<< HEAD
  checkUpdates: async (opts) => {
    const silent = opts?.silent ?? false;
    try {
      const [updates, appUpdate] = await Promise.all([
        api.checkUpdates(),
        api.checkAppUpdate().catch(() => null),
      ]);
      const hasErrors = updates.every((u) => u.error) && (!appUpdate || !!appUpdate.error);
      const anyAvailable =
        updates.some((u) => u.updateAvailable) || !!appUpdate?.updateAvailable;
      set({
        updates,
        appUpdate,
        updatesCheckedAt: new Date(),
        updatesError: hasErrors,
        ...(silent ? {} : { showUpdatesModal: anyAvailable }),
=======
  checkUpdates: async () => {
    try {
      const updates = await api.checkUpdates();
      const hasErrors = updates.every((u) => u.error);
      set({
        updates,
        updatesCheckedAt: new Date(),
        updatesError: hasErrors,
        showUpdatesModal: updates.some((u) => u.updateAvailable),
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
      });
    } catch {
      set({ updatesCheckedAt: new Date(), updatesError: true });
    }
  },

  dismissSetup: () => set({ showSetup: false }),
  dismissUpdatesModal: () => set({ showUpdatesModal: false }),
<<<<<<< HEAD

  dismissWhatsNew: async () => {
    const { appInfo } = get();
    if (appInfo) {
      await get().updateSettings({ lastSeenChangelogVersion: appInfo.version });
    }
    set({ showWhatsNew: false });
  },
}));

/** Autopilot toast notifications — wired once at app mount. */
export function setupAutopilotListener(t: TFunction) {
  let unlisten: UnlistenFn | null = null;
  listen<AutopilotEvent>("autopilot-event", (e) => {
    const ev = e.payload;
    if (ev.kind === "strategy_switched" && ev.fromStrategy && ev.toStrategy) {
      const from = ev.fromStrategy.replace(/\.bat$/i, "");
      const to = ev.toStrategy.replace(/\.bat$/i, "");
      toast(t("autopilot.toastSwitch", { from, to }), "info");
    } else if (ev.kind === "health_degraded") {
      toast(
        t("autopilot.toastDegraded", { percent: ev.healthPercent ?? 0 }),
        "fail",
      );
    }
  }).then((u) => {
    unlisten = u;
  });
  return () => {
    unlisten?.();
  };
}
=======
}));
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
