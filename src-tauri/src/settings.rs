use serde::{Deserialize, Serialize};

use crate::paths;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AutopilotSettings {
    pub enabled: bool,
    /// How often to run health probes while the app is open (minutes).
    pub interval_minutes: u32,
    /// stability | speed | gaming — used when switch_mode is rotate_policy
    pub policy: String,
    /// rotate_policy | rotate_custom | best_by_tests
    pub switch_mode: String,
    /// Strategy .bat files allowed when switch_mode is rotate_custom or filters best_by_tests
    pub allowed_strategies: Vec<String>,
    /// Max strategies to benchmark in best_by_tests mode
    pub max_test_strategies: u32,
    pub auto_switch_strategy: bool,
    /// Switch when health score drops below this (0–100).
    pub min_health_percent: u32,
    pub probe_discord: bool,
    pub probe_youtube: bool,
    pub probe_cloudflare: bool,
    pub probe_google: bool,
    pub auto_enable_warp: bool,
    pub notify_on_switch: bool,
    pub notify_on_degraded: bool,
    /// Cap automatic strategy rotations per hour.
    pub max_switches_per_hour: u32,
    pub only_when_zapret_running: bool,
}

impl Default for AutopilotSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            interval_minutes: 15,
            policy: "stability".into(),
            switch_mode: "rotate_policy".into(),
            allowed_strategies: Vec::new(),
            max_test_strategies: 6,
            auto_switch_strategy: true,
            min_health_percent: 60,
            probe_discord: true,
            probe_youtube: true,
            probe_cloudflare: true,
            probe_google: false,
            auto_enable_warp: false,
            notify_on_switch: true,
            notify_on_degraded: true,
            max_switches_per_hour: 3,
            only_when_zapret_running: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    /// "ru" | "en" | null -> follow system locale
    pub language: Option<String>,
    /// "light" | "dark" | "purple" | "system"
    pub theme: String,
    /// File name of the selected strategy bat, e.g. "general (ALT5).bat"
    pub selected_strategy: Option<String>,
    /// Installed release tags, used for update checks (compare to GitHub tag)
    pub zapret_version: Option<String>,
    pub tg_version: Option<String>,
    /// Check both components for updates on app start
    pub check_updates_on_start: bool,
    pub autopilot: AutopilotSettings,
    /// Last app version for which the user dismissed the "what's new" modal.
    pub last_seen_changelog_version: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: None,
            theme: "system".into(),
            selected_strategy: None,
            zapret_version: None,
            tg_version: None,
            check_updates_on_start: true,
            autopilot: AutopilotSettings::default(),
            last_seen_changelog_version: None,
        }
    }
}

pub fn load() -> Settings {
    std::fs::read_to_string(paths::settings_file())
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

pub fn save(settings: &Settings) -> Result<(), String> {
    paths::ensure_dirs().map_err(|e| e.to_string())?;
    let text = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(paths::settings_file(), text).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_settings() -> Settings {
    load()
}

#[tauri::command]
pub fn save_settings(settings: Settings) -> Result<(), String> {
    save(&settings)
}
