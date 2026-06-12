export interface AppInfo {
  version: string;
  dataDir: string;
  isAdmin: boolean;
  isWindows: boolean;
}

export interface Settings {
  language: "ru" | "en" | null;
  theme: "light" | "dark" | "system";
  selectedStrategy: string | null;
  zapretVersion: string | null;
  tgVersion: string | null;
  checkUpdatesOnStart: boolean;
}

export interface ComponentsState {
  zapretInstalled: boolean;
  zapretVersion: string | null;
  tgInstalled: boolean;
  tgVersion: string | null;
  dataDir: string;
}

export interface ZapretStatus {
  running: boolean;
  currentStrategy: string | null;
  serviceInstalled: boolean;
  serviceState: string | null;
  serviceStrategy: string | null;
  windivertState: string | null;
  windivertSysPresent: boolean;
}

export interface TgStatus {
  installed: boolean;
  running: boolean;
  host: string;
  port: number;
  secret: string | null;
  tgLink: string | null;
  shareLink: string | null;
}

export interface FullStatus {
  zapret: ZapretStatus;
  tg: TgStatus;
  testsRunning: boolean;
}

export interface ServiceSettings {
  gameFilterMode: "off" | "all" | "tcp" | "udp";
  ipsetMode: "none" | "loaded" | "any";
  autoUpdateCheck: boolean;
}

export interface UpdateStatus {
  component: "zapret" | "tgproxy";
  installed: string | null;
  latest: string | null;
  updateAvailable: boolean;
  releaseUrl: string | null;
  error: string | null;
}

export interface DiagItem {
  id: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface HostsCheck {
  upToDate: boolean;
  tempFile: string;
  hostsFile: string;
}

export interface UserListFile {
  name: string;
  content: string;
  exists: boolean;
}

export interface InstallProgress {
  component: string;
  phase: "downloading" | "extracting" | "done" | "error";
  downloaded: number;
  total: number;
}

export interface TestTargetResult {
  config: string;
  name: string;
  status: "ok" | "warn" | "fail" | "timeout" | "skipped";
  detail: string;
}

export type TestEvent =
  | { kind: "started"; mode: string; configs: string[]; targetsPerConfig: number }
  | { kind: "config-start"; config: string; index: number; total: number }
  | { kind: "target-result"; result: TestTargetResult }
  | { kind: "config-done"; config: string; ok: number; fail: number; error?: string }
  | { kind: "finished"; best: string | null; summary: { config: string; ok: number; fail: number }[] }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };
