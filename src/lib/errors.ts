import type { TFunction } from "i18next";

const KNOWN_ERRORS = [
  "already_running",
  "service_running",
  "not_installed",
  "no_backup",
  "tests_already_running",
  "service_installed",
  "dpi_suite_unavailable",
<<<<<<< HEAD
  "zapret_required",
  "warp_not_installed",
=======
>>>>>>> 4c8fd6dce1bc08e1814f72bf7fdd1a10f0f9fbf9
];

export function errText(t: TFunction, e: unknown): string {
  const msg = String(e);
  if (KNOWN_ERRORS.includes(msg)) return t(`errors.${msg}`);
  if (msg.toLowerCase().includes("network")) return t("errors.network");
  return t("errors.generic", { message: msg });
}
