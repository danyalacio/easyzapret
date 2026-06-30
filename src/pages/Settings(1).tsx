import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../lib/api";
import { errText } from "../lib/errors";
import { toast } from "../lib/toast";
import { useStore } from "../lib/store";
import {
  Badge,
  Button,
  Card,
  FieldRow,
  Note,
  PageHeader,
  Segmented,
  Spinner,
  Switch,
} from "../components/ui";
import type { InstallProgress } from "../lib/types";

export function SettingsPage() {
  const { t } = useTranslation();
  const {
    appInfo,
    settings,
    components,
    updates,
    updateSettings,
    checkUpdates,
    refreshComponents,
    refreshStrategies,
  } = useStore();
  const [installing, setInstalling] = useState<string | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let un: UnlistenFn | null = null;
    listen<InstallProgress>("install-progress", (e) => setProgress(e.payload)).then(
      (u) => (un = u),
    );
    return () => {
      un?.();
    };
  }, []);

  async function install(component: "zapret" | "tgproxy") {
    setInstalling(component);
    try {
      await api.installComponent(component);
      await Promise.all([refreshComponents(), refreshStrategies()]);
      toast(t("setup.done"), "ok");
    } catch (e) {
      toast(errText(t, e), "fail");
    } finally {
      setInstalling(null);
      setProgress(null);
    }
  }

  async function onCheckUpdates() {
    setChecking(true);
    try {
      await checkUpdates();
    } finally {
      setChecking(false);
    }
  }

  function componentCard(component: "zapret" | "tgproxy") {
    const installed = component === "zapret" ? components?.zapretInstalled : components?.tgInstalled;
    const version = component === "zapret" ? components?.zapretVersion : components?.tgVersion;
    const upd = updates?.find((u) => u.component === component);
    const name = component === "zapret" ? "Zapret (zapret-discord-youtube)" : "Telegram Proxy (tg-ws-proxy)";
    const busy = installing === component;
    const pct =
      busy && progress?.component === component && progress.phase === "downloading" && progress.total > 0
        ? Math.round((progress.downloaded / progress.total) * 100)
        : null;

    return (
      <div className="flex items-center justify-between gap-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {name}
            {installed ? (
              <Badge tone="ok">{version ?? t("common.installed")}</Badge>
            ) : (
              <Badge tone="off">{t("common.notInstalled")}</Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {upd?.updateAvailable ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                {t("settings.updateAvailable", { version: upd.latest })}
                {upd.releaseUrl && (
                  <button
                    className="ml-2 underline"
                    onClick={() => openUrl(upd.releaseUrl!).catch(() => {})}
                  >
                    {t("settings.openRelease")}
                  </button>
                )}
              </span>
            ) : upd?.latest ? (
              t("settings.upToDate")
            ) : (
              t("settings.notChecked")
            )}
          </div>
        </div>
        <Button
          variant={upd?.updateAvailable || !installed ? "primary" : "secondary"}
          disabled={installing !== null}
          onClick={() => install(component)}
        >
          {busy ? <Spinner /> : null}
          {busy
            ? pct !== null
              ? t("setup.downloading", { percent: pct })
              : progress?.phase === "extracting"
                ? t("setup.extracting")
                : t("common.loading")
            : !installed
              ? t("common.install")
              : upd?.updateAvailable
                ? t("common.update")
                : t("settings.reinstall")}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("settings.title")} />

      <Card className="mb-4 divide-y divide-slate-100 dark:divide-slate-800">
        <FieldRow title={t("settings.language")}>
          <Segmented
            value={settings?.language ?? "auto"}
            options={[
              { value: "auto", label: t("settings.langAuto") },
              { value: "ru", label: "Русский" },
              { value: "en", label: "English" },
            ]}
            onChange={(v) => updateSettings({ language: v === "auto" ? null : (v as "ru" | "en") })}
          />
        </FieldRow>
        <FieldRow title={t("settings.theme")}>
          <Segmented
            value={settings?.theme ?? "system"}
            options={[
              { value: "system", label: t("settings.themeSystem") },
              { value: "light", label: t("settings.themeLight") },
              { value: "dark", label: t("settings.themeDark") },
            ]}
            onChange={(theme) => updateSettings({ theme })}
          />
        </FieldRow>
        <FieldRow title={t("settings.dataDir")} description={t("settings.dataDirNote")}>
          <code className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {appInfo?.dataDir ?? "C:\\EasyZapret"}
          </code>
        </FieldRow>
      </Card>

      <Card className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-400">
            {t("settings.components")}
          </h3>
          <Button variant="ghost" onClick={onCheckUpdates} disabled={checking}>
            {checking ? <Spinner /> : null}
            {t("settings.checkUpdates")}
          </Button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {componentCard("zapret")}
          {componentCard("tgproxy")}
        </div>
        <FieldRow title={t("settings.checkUpdatesOnStart")}>
          <Switch
            checked={settings?.checkUpdatesOnStart ?? true}
            onChange={(v) => updateSettings({ checkUpdatesOnStart: v })}
          />
        </FieldRow>
      </Card>

      <div className="space-y-3">
        <Note tone="info" title={t("settings.secureDns")}>
          {t("settings.secureDnsText")}
        </Note>
        <Note tone="warn" title={t("settings.antivirus")}>
          {t("settings.antivirusText")}
        </Note>
        <Note tone="fail" title={t("settings.fakeRepos")}>
          {t("settings.fakeReposText")}
        </Note>
        <Note tone="info" title={t("settings.about")}>
          {t("settings.aboutText", { version: appInfo?.version ?? "0.1.0" })}{" "}
          <button
            className="underline"
            onClick={() => openUrl("https://github.com/Flowseal/zapret-discord-youtube").catch(() => {})}
          >
            zapret-discord-youtube
          </button>
          {" · "}
          <button
            className="underline"
            onClick={() => openUrl("https://github.com/Flowseal/tg-ws-proxy").catch(() => {})}
          >
            tg-ws-proxy
          </button>
        </Note>
      </div>
    </div>
  );
}
