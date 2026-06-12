import { useTranslation } from "react-i18next";
import { useStore, type Page } from "../lib/store";
import { Logo } from "./Logo";
import { cn, StatusDot } from "./ui";

const ICONS: Record<Page, string> = {
  home: "M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10",
  strategies: "M4 6h16M4 12h16M4 18h10",
  service: "M10.325 4.317a1.724 1.724 0 013.35 0 1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572 1.724 1.724 0 010 3.35 1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065 1.724 1.724 0 01-3.35 0 1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572 1.724 1.724 0 010-3.35 1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  tests: "M9 5h6m-3 0v6m-5.196 3.804L4 17.804A2 2 0 005.789 21h12.422a2 2 0 001.789-3.196l-2.804-3M9 5a2 2 0 00-2 2v4l-4 6m12-12a2 2 0 012 2v4l4 6",
  lists: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  telegram: "M21.5 4.5L2.8 11.7c-.8.3-.8 1.4.05 1.7l4.7 1.6 1.8 5.5c.25.75 1.2.9 1.7.3l2.5-2.9 4.9 3.6c.6.45 1.5.1 1.65-.65l3-15c.2-.9-.7-1.65-1.6-1.35z",
  logs: "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33h0a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51h0a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v0a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export function Sidebar() {
  const { t } = useTranslation();
  const { page, setPage, status } = useStore();

  const items: { id: Page; label: string }[] = [
    { id: "home", label: t("nav.home") },
    { id: "strategies", label: t("nav.strategies") },
    { id: "service", label: t("nav.service") },
    { id: "tests", label: t("nav.tests") },
    { id: "lists", label: t("nav.lists") },
    { id: "telegram", label: t("nav.telegram") },
    { id: "logs", label: t("nav.logs") },
    { id: "settings", label: t("nav.settings") },
  ];

  const zapretOn =
    status?.zapret.running || status?.zapret.serviceState === "RUNNING";
  const tgOn = status?.tg.running;

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3 px-5 pb-4 pt-5">
        <Logo size={38} />
        <div>
          <div className="text-base font-bold leading-tight text-slate-900 dark:text-white">
            EasyZapret
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <StatusDot tone={zapretOn ? "ok" : "off"} /> Zapret
            </span>
            <span className="flex items-center gap-1">
              <StatusDot tone={tgOn ? "ok" : "off"} /> TG
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              page === item.id
                ? "bg-teal-500/10 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
          >
            <NavIcon d={ICONS[item.id]} />
            {item.label}
          </button>
        ))}

        <div
          className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400 dark:text-slate-600"
          title={t("nav.soon")}
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
          <span className="flex-1">{t("nav.warp")}</span>
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {t("nav.soon")}
          </span>
        </div>
      </nav>

      <div className="px-5 py-4 text-[11px] text-slate-400 dark:text-slate-500">
        v0.1.0 · FlowSeal zapret &amp; tg-ws-proxy
      </div>
    </aside>
  );
}
