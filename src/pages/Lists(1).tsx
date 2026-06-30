import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";
import { errText } from "../lib/errors";
import { toast } from "../lib/toast";
import { Button, Card, Note, PageHeader, Spinner, cn } from "../components/ui";
import type { UserListFile } from "../lib/types";

export function ListsPage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<UserListFile[]>([]);
  const [active, setActive] = useState<string>("list-general-user.txt");
  // Unsaved edits are kept per file so switching tabs never loses changes.
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    const { files } = await api.readUserLists();
    setFiles(files);
  }

  useEffect(() => {
    load();
  }, []);

  const activeFile = files.find((f) => f.name === active);
  const content = edits[active] ?? activeFile?.content ?? "";
  const dirty = edits[active] !== undefined && edits[active] !== (activeFile?.content ?? "");

  function switchFile(name: string) {
    setActive(name);
  }

  async function save() {
    setSaving(true);
    try {
      await api.saveUserList(active, content);
      toast(t("common.saved"), "ok");
      setEdits((e) => {
        const next = { ...e };
        delete next[active];
        return next;
      });
      await load();
    } catch (e) {
      toast(errText(t, e), "fail");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      <PageHeader title={t("lists.title")} description={t("lists.description")} />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {files.map((f) => (
          <button
            key={f.name}
            onClick={() => switchFile(f.name)}
            className={cn(
              "rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors",
              active === f.name
                ? "bg-teal-500/15 text-teal-700 dark:text-teal-300"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            {f.name}
            {!f.exists && " *"}
          </button>
        ))}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            {t(`lists.hint.${active}` as never, { defaultValue: "" })}
            {activeFile && !activeFile.exists && ` — ${t("lists.fileMissing")}`}
          </span>
          <Button variant="primary" onClick={save} disabled={!dirty || saving}>
            {saving ? <Spinner /> : null}
            {t("common.save")}
          </Button>
        </div>
        <textarea
          value={content}
          onChange={(e) => {
            const value = e.target.value;
            setEdits((prev) => ({ ...prev, [active]: value }));
          }}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700 outline-none ring-1 ring-slate-200 focus:ring-teal-500 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800"
        />
      </Card>

      <div className="mt-3">
        <Note tone="info">{t("strategies.restartHint")}</Note>
      </div>
    </div>
  );
}
