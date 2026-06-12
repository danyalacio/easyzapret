import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { errText } from "../lib/errors";
import { toast } from "../lib/toast";
import { useStore } from "../lib/store";
import { Badge, Button, Card, Note, PageHeader, cn } from "../components/ui";

export function StrategiesPage() {
  const { t } = useTranslation();
  const { strategies, settings, status, updateSettings, refreshStatus } = useStore();
  const [restarting, setRestarting] = useState(false);

  const selected = settings?.selectedStrategy;
  const zapretRunning = !!status?.zapret.running;

  async function select(name: string) {
    await updateSettings({ selectedStrategy: name });
  }

  async function restartWithSelected() {
    if (!selected) return;
    setRestarting(true);
    try {
      await api.stopZapret();
      await api.startZapret(selected);
      await refreshStatus();
      toast(t("common.saved"), "ok");
    } catch (e) {
      toast(errText(t, e), "fail");
    } finally {
      setRestarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={t("strategies.title")} description={t("strategies.description")} />

      {zapretRunning && status?.zapret.currentStrategy !== selected && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-500/25 dark:text-amber-200">
          <span>{t("strategies.restartHint")}</span>
          <Button variant="primary" onClick={restartWithSelected} disabled={restarting}>
            {t("strategies.restartNow")}
          </Button>
        </div>
      )}

      {strategies.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">{t("strategies.empty")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {strategies.map((name) => {
            const isSelected = name === selected;
            const pretty = name.replace(/\.bat$/i, "");
            return (
              <button
                key={name}
                onClick={() => select(name)}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-2xl p-4 text-left ring-1 transition-all",
                  isSelected
                    ? "bg-teal-500/10 ring-2 ring-teal-500"
                    : "bg-white ring-slate-200/70 hover:ring-slate-300 dark:bg-slate-900 dark:ring-slate-800 dark:hover:ring-slate-700",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {pretty}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">{name}</div>
                </div>
                {isSelected && <Badge tone="ok">{t("strategies.current")}</Badge>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <Note tone="info">{t("strategies.editorSoon")}</Note>
      </div>
    </div>
  );
}
