mod admin;
mod autopilot;
mod logs;
mod paths;
mod settings;
mod tests;
mod tg_proxy;
mod tray;
mod updates;
mod util;
mod warp;
mod zapret;

use std::process::Child;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

pub struct AppState {
    /// winws.exe child started by us in this session
    pub zapret_child: Mutex<Option<Child>>,
    /// strategy bat used for the manual start
    pub current_strategy: Mutex<Option<String>>,
    pub tests_cancel: Arc<AtomicBool>,
    pub tests_running: AtomicBool,
    pub tray: Mutex<Option<tray::TrayHandles>>,
    /// Whether the user wants WARP connected. Used to auto-disconnect WARP when
    /// Zapret stops, since WARP is only allowed to run alongside Zapret.
    pub warp_active: AtomicBool,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            zapret_child: Mutex::new(None),
            current_strategy: Mutex::new(None),
            tests_cancel: Arc::new(AtomicBool::new(false)),
            tests_running: AtomicBool::new(false),
            tray: Mutex::new(None),
            warp_active: AtomicBool::new(false),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub data_dir: String,
    pub is_admin: bool,
    pub is_windows: bool,
}

#[tauri::command]
fn get_app_info(app: AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        data_dir: paths::data_dir().to_string_lossy().to_string(),
        is_admin: admin::is_admin(),
        is_windows: cfg!(windows),
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct FullStatus {
    zapret: zapret::service::ZapretStatus,
    tg: tg_proxy::TgStatus,
    warp: warp::WarpStatus,
    autopilot: autopilot::AutopilotStatus,
    tests_running: bool,
}

/// Single polling endpoint for the frontend; also keeps the tray in sync.
#[tauri::command]
fn get_status(app: AppHandle, state: State<'_, AppState>) -> FullStatus {
    // Reap the child if winws died on its own (e.g. driver blocked).
    {
        let mut guard = state.zapret_child.lock().unwrap();
        if let Some(child) = guard.as_mut() {
            if let Ok(Some(_)) = child.try_wait() {
                *guard = None;
                *state.current_strategy.lock().unwrap() = None;
            }
        }
    }
    // WARP is only allowed alongside Zapret; drop it if Zapret went away.
    warp::enforce_dependency(&state);
    let status = FullStatus {
        zapret: zapret::service::zapret_status(state.clone()),
        tg: tg_proxy::tg_status(),
        warp: warp::quick_status(),
        autopilot: autopilot::status(),
        tests_running: state.tests_running.load(std::sync::atomic::Ordering::SeqCst),
    };
    tray::update_tray_now(&app);
    status
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserLists {
    files: Vec<UserListFile>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct UserListFile {
    name: String,
    content: String,
    exists: bool,
}

const EDITABLE_LISTS: &[&str] = &[
    "list-general-user.txt",
    "list-exclude-user.txt",
    "ipset-all.txt",
    "ipset-exclude-user.txt",
];

#[tauri::command]
fn read_user_lists() -> UserLists {
    let dir = paths::zapret_lists_dir();
    let files = EDITABLE_LISTS
        .iter()
        .map(|name| {
            let path = dir.join(name);
            UserListFile {
                name: name.to_string(),
                exists: path.exists(),
                content: std::fs::read_to_string(&path).unwrap_or_default(),
            }
        })
        .collect();
    UserLists { files }
}

#[tauri::command]
fn save_user_list(name: String, content: String) -> Result<(), String> {
    if !EDITABLE_LISTS.contains(&name.as_str()) {
        return Err(format!("not an editable list: {name}"));
    }
    let dir = paths::zapret_lists_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join(&name), content).map_err(|e| e.to_string())?;
    logs::append("app", &format!("User list saved: {name}"));
    Ok(())
}

#[tauri::command]
fn refresh_tray(app: AppHandle) {
    tray::update_tray_now(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = paths::ensure_dirs();
    logs::append("app", "EasyZapret starting");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Second launch focuses the existing window instead.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .manage(AppState::default())
        .setup(|app| {
            tray::setup_tray(app.handle())?;
            autopilot::start_background_loop(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window hides to tray; real exit is via tray menu.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_status,
            refresh_tray,
            read_user_lists,
            save_user_list,
            settings::get_settings,
            settings::save_settings,
            updates::install_component,
            updates::get_components_state,
            updates::check_updates,
            updates::check_app_update,
            zapret::strategy::list_strategies,
            zapret::process::start_zapret,
            zapret::process::stop_zapret,
            zapret::service::zapret_status,
            zapret::service::install_zapret_service,
            zapret::service::remove_zapret_services,
            zapret::service::get_service_settings,
            zapret::service::set_game_filter,
            zapret::service::set_ipset_mode,
            zapret::service::set_auto_update_check,
            zapret::service::update_ipset_list,
            zapret::service::check_hosts_file,
            zapret::diagnostics::run_diagnostics,
            zapret::diagnostics::remove_conflicting_services,
            zapret::diagnostics::clear_discord_cache,
            tests::run_tests,
            tests::cancel_tests,
            tg_proxy::tg_status,
            tg_proxy::start_tg,
            tg_proxy::stop_tg,
            warp::warp_details,
            warp::warp_connect,
            warp::warp_disconnect,
            warp::warp_reset_keys,
            warp::warp_set_mode,
            autopilot::get_autopilot_status,
            autopilot::run_autopilot_check_now,
            logs::read_log,
            logs::clear_log,
            logs::logs_dir_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running EasyZapret");
}
