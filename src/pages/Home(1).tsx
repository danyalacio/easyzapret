import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { errText } from "../lib/errors";
import { useStore } from "../lib/store";
import { Badge, Button, Card, Spinner, Switch } from "../components/ui";

function BigToggleCard({
  icon,
  title,
  description,
  on,
  busy,
  error,
  subtitle,
  disabled,
  onToggle,
  footer,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  on: boolean;
  busy: boolean;
  error?: string | null;
  subtitle?: React.ReactNode;
  disabled?: boolean;
  onToggle: (value: boolean) => void;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const tone = error ? "fail" : busy ? "warn" : on ? "ok" : "off";
  const label = error
    ? t("home.statusError")
    : busy
      ? t("home.statusStarting")
      : on
        ? t("home.statusConnected")
        : t("home.statusDisconnected");

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={
              "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors " +
              (on
                ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800")
            }
          >
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
              <Badge tone={tone}>{busy ? <Spinner className="h-3 w-3" /> : null}{label}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
          </div>
        </div>
        <Switch size="lg" checked={on} disabled={busy || disabled} onChange={onToggle} />
      </div>
      {subtitle && <div className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</div>}
      {error && (
        <div className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-red-700 ring-1 ring-red-500/25 dark:text-red-300">
          {error}
        </div>
      )}
      {footer}
    </Card>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { status, settings, components, updates, updatesCheckedAt, updatesError, refreshStatus, checkUpdates, setPage } =
    useStore();

  const [zapretBusy, setZapretBusy] = useState(false);
  const [tgBusy, setTgBusy] = useState(false);
  const [zapretError, setZapretError] = useState<string | null>(null);
  const [tgError, setTgError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const zapret = status?.zapret;
  const tg = status?.tg;
  const zapretOn = !!(zapret?.running || zapret?.serviceState === "RUNNING");
  const viaService = !zapret?.running && zapret?.serviceState === "RUNNING";

  async function toggleZapret(value: boolean) {
    setZapretError(null);
    if (!components?.zapretInstalled) {
      setZapretError(t("errors.not_installed"));
      setPage("settings");
      return;
    }
    setZapretBusy(true);
    try {
      if (value) {
        const strategy = settings?.selectedStrategy;
        if (!strategy) {
          setZapretError(t("home.noStrategy"));
          return;
        }
        await api.startZapret(strategy);
      } else {
        await api.stopZapret();
      }
      await refreshStatus();
    } catch (e) {
      setZapretError(errText(t, e));
    } finally {
      setZapretBusy(false);
    }
  }

  async function toggleTg(value: boolean) {
    setTgError(null);
    if (!components?.tgInstalled) {
      setTgError(t("errors.not_installed"));
      setPage("telegram");
      return;
    }
    setTgBusy(true);
    try {
      if (value) {
        await api.startTg();
        // proxy takes a moment to spin up
        await new Promise((r) => setTimeout(r, 1200));
      } else {
        await api.stopTg();
      }
      await refreshStatus();
    } catch (e) {
      setTgError(errText(t, e));
    } finally {
      setTgBusy(false);
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

  const updatesAvailable = updates?.some((u) => u.updateAvailable);
  const updatesLabel = !updatesCheckedAt
    ? t("home.updatesUnknown")
    : updatesError
      ? t("home.updatesError")
      : updatesAvailable
        ? t("home.updatesAvailable")
        : t("home.updatesNone");

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-5">
      <BigToggleCard
        icon={
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        }
        title={t("home.zapretTitle")}
        description={t("home.zapretDesc")}
        on={zapretOn}
        busy={zapretBusy}
        error={zapretError}
        disabled={!components?.zapretInstalled && !zapretOn}
        onToggle={toggleZapret}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t("home.strategy")}:
            </span>
            <button
              className="text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
              onClick={() => setPage("strategies")}
            >
              {viaService
                ? (zapret?.serviceStrategy ?? t("home.noStrategy"))
                : (settings?.selectedStrategy?.replace(/\.bat$/i, "") ?? t("home.noStrategy"))}
            </button>
            {viaService && <Badge tone="info">{t("home.viaService")}</Badge>}
            {!components?.zapretInstalled && <Badge tone="warn">{t("home.installFirst")}</Badge>}
          </span>
        }
      />

      <BigToggleCard
        icon={
          <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.5 4.5L2.8 11.7c-.8.3-.8 1.4.05 1.7l4.7 1.6 1.8 5.5c.25.75 1.2.9 1.7.3l2.5-2.9 4.9 3.6c.6.45 1.5.1 1.65-.65l3-15c.2-.9-.7-1.65-1.6-1.35z" />
          </svg>
        }
        title={t("home.tgTitle")}
        description={t("home.tgDesc")}
        on={!!tg?.running}
        busy={tgBusy}
        error={tgError}
        disabled={!components?.tgInstalled && !tg?.running}
        onToggle={toggleTg}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t("telegram.server")}:
            </span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">
              {tg?.host ?? "127.0.0.1"}:{tg?.port ?? 1443}
            </code>
            <button
              className="text-teal-600 underline-offset-2 hover:underline dark:text-teal-400"
              onClick={() => setPage("telegram")}
            >
              {t("common.details")}
            </button>
            {!components?.tgInstalled && <Badge tone="warn">{t("home.installFirst")}</Badge>}
          </span>
        }
      />

      <div className="mt-auto flex items-center justify-between rounded-2xl bg-white/60 px-5 py-3.5 text-sm ring-1 ring-slate-200/70 dark:bg-slate-900/60 dark:ring-slate-800">
        <span
          className={
            updatesAvailable
              ? "font-medium text-amber-600 dark:text-amber-400"
              : "text-slate-500 dark:text-slate-400"
          }
        >
          {t("home.lastUpdateCheck", { result: updatesLabel })}
          {updatesCheckedAt && (
            <span className="ml-1 text-xs text-slate-400">
              ({updatesCheckedAt.toLocaleTimeString()})
            </span>
          )}
        </span>
        <Button variant="ghost" onClick={onCheckUpdates} disabled={checking}>
          {checking ? <Spinner /> : null}
          {t("home.checkNow")}
        </Button>
      </div>
    </div>
  );
}
