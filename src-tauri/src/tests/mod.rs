use std::process::Stdio;
use std::sync::atomic::Ordering;

use futures_util::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, Manager};

use crate::zapret::strategy;
use crate::{logs, paths, AppState};

const CURL_TIMEOUT_SECS: u64 = 5;
const MAX_PARALLEL: usize = 8;
const DPI_RANGE_BYTES: usize = 65536;
const DPI_SUITE_URL: &str = "https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/suite.v2.json";

fn curl_bin() -> &'static str {
    if cfg!(windows) { "curl.exe" } else { "curl" }
}

fn devnull() -> &'static str {
    if cfg!(windows) { "NUL" } else { "/dev/null" }
}

#[derive(Debug, Clone)]
struct StandardTarget {
    name: String,
    url: Option<String>,
    ping: Option<String>,
}

/// Parses `utils/targets.txt` (Key = "https://..." or Key = "PING:ip"),
/// falling back to the same defaults the PowerShell script uses.
fn load_targets() -> Vec<StandardTarget> {
    let mut targets = Vec::new();
    if let Ok(content) = std::fs::read_to_string(paths::zapret_utils_dir().join("targets.txt")) {
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((key, value)) = line.split_once('=') else { continue };
            let key = key.trim();
            if key.is_empty() || !key.chars().all(|c| c.is_alphanumeric() || c == '_') {
                continue;
            }
            let value = value.trim().trim_matches('"');
            targets.push(convert_target(key, value));
        }
    }
    if targets.is_empty() {
        for (name, value) in [
            ("Discord Main", "https://discord.com"),
            ("Discord Gateway", "https://gateway.discord.gg"),
            ("Discord CDN", "https://cdn.discordapp.com"),
            ("YouTube Web", "https://www.youtube.com"),
            ("YouTube Image", "https://i.ytimg.com"),
            ("YouTube Video Redirect", "https://redirector.googlevideo.com"),
            ("Google Main", "https://www.google.com"),
            ("Cloudflare Web", "https://www.cloudflare.com"),
            ("Cloudflare DNS 1.1.1.1", "PING:1.1.1.1"),
            ("Google DNS 8.8.8.8", "PING:8.8.8.8"),
        ] {
            targets.push(convert_target(name, value));
        }
    }
    targets
}

fn convert_target(name: &str, value: &str) -> StandardTarget {
    if let Some(ip) = value.strip_prefix("PING:") {
        StandardTarget { name: name.into(), url: None, ping: Some(ip.trim().into()) }
    } else {
        let host = value
            .trim_start_matches("https://")
            .trim_start_matches("http://")
            .split('/')
            .next()
            .unwrap_or("")
            .to_string();
        StandardTarget { name: name.into(), url: Some(value.into()), ping: Some(host) }
    }
}

/// One curl HTTP/TLS probe; returns OK | UNSUP | SSL | ERROR.
async fn curl_probe(url: &str, proto_args: &[&str]) -> String {
    let mut cmd = crate::util::hidden_command_async(curl_bin());
    cmd.args(["-I", "-s", "-m", &CURL_TIMEOUT_SECS.to_string(), "-o", devnull(), "-w", "%{http_code}", "--show-error"])
        .args(proto_args)
        .arg(url)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let result = tokio::time::timeout(
        std::time::Duration::from_secs(CURL_TIMEOUT_SECS + 5),
        cmd.output(),
    )
    .await;

    let output = match result {
        Ok(Ok(out)) => out,
        _ => return "ERROR".into(),
    };
    let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
    let exit = output.status.code().unwrap_or(-1);

    if stderr.contains("could not resolve host")
        || stderr.contains("certificate")
        || stderr.contains("self-signed")
        || stderr.contains("self signed")
    {
        return "SSL".into();
    }
    if exit == 35
        || stderr.contains("not supported")
        || stderr.contains("does not support")
        || stderr.contains("unsupported")
        || stderr.contains("unknown option")
        || stderr.contains("unrecognized option")
        || stderr.contains("schannel")
    {
        return "UNSUP".into();
    }
    if exit == 0 { "OK".into() } else { "ERROR".into() }
}

/// 3-packet ping; returns ("23 ms") or None on timeout.
async fn ping_probe(target: &str) -> Option<String> {
    let mut cmd = crate::util::hidden_command_async("ping");
    if cfg!(windows) {
        cmd.args(["-n", "3", target]);
    } else {
        cmd.args(["-c", "3", target]);
    }
    cmd.stdout(Stdio::piped()).stderr(Stdio::null());

    let output = tokio::time::timeout(std::time::Duration::from_secs(15), cmd.output())
        .await
        .ok()?
        .ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    // Windows: "Average = 23ms" / localized "Среднее = 23мсек";
    // Unix: "min/avg/max/... = a/b/c/d ms"
    let avg = text
        .lines()
        .rev()
        .find_map(|line| {
            let pos = line.rfind('=')?;
            let tail = line[pos + 1..].trim();
            if cfg!(windows) {
                // Take leading digits so the localized unit suffix is ignored.
                let digits: String = tail.chars().take_while(|c| c.is_ascii_digit()).collect();
                digits.parse::<f64>().ok()
            } else {
                tail.split('/').nth(1).and_then(|v| v.parse::<f64>().ok())
            }
        })
        .unwrap_or(0.0);
    Some(format!("{avg:.0} ms"))
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TargetOutcome {
    config: String,
    name: String,
    /// ok | warn | fail | timeout
    status: String,
    detail: String,
}

async fn run_standard_target(config: &str, t: &StandardTarget) -> TargetOutcome {
    let mut pieces = Vec::new();
    let mut any_fail = false;
    let mut any_ok = false;

    if let Some(url) = &t.url {
        for (label, args) in [
            ("HTTP", vec!["--http1.1"]),
            ("TLS1.2", vec!["--tlsv1.2", "--tls-max", "1.2"]),
            ("TLS1.3", vec!["--tlsv1.3", "--tls-max", "1.3"]),
        ] {
            let status = curl_probe(url, &args).await;
            match status.as_str() {
                "OK" => any_ok = true,
                "UNSUP" => {}
                _ => any_fail = true,
            }
            pieces.push(format!("{label}:{status}"));
        }
    }

    let ping_text = match &t.ping {
        Some(target) => match ping_probe(target).await {
            Some(ms) => {
                any_ok = true;
                ms
            }
            None => {
                if t.url.is_none() {
                    any_fail = true;
                }
                "Timeout".into()
            }
        },
        None => "n/a".into(),
    };
    pieces.push(format!("Ping: {ping_text}"));

    let status = if any_fail && any_ok {
        "warn"
    } else if any_fail {
        if ping_text == "Timeout" && !any_ok { "timeout" } else { "fail" }
    } else {
        "ok"
    };

    TargetOutcome {
        config: config.into(),
        name: t.name.clone(),
        status: status.into(),
        detail: pieces.join("  "),
    }
}

// ---------------- DPI checkers ----------------

#[derive(Debug, Clone, Deserialize)]
struct DpiEntry {
    id: String,
    provider: Option<String>,
    country: Option<String>,
    host: String,
}

async fn fetch_dpi_suite() -> Result<Vec<DpiEntry>, String> {
    let resp = reqwest::Client::builder()
        .user_agent("EasyZapret/0.1")
        .timeout(std::time::Duration::from_secs(CURL_TIMEOUT_SECS + 5))
        .build()
        .map_err(|e| e.to_string())?
        .get(DPI_SUITE_URL)
        .send()
        .await
        .map_err(|e| format!("failed to fetch DPI suite: {e}"))?;
    resp.json::<Vec<DpiEntry>>().await.map_err(|e| e.to_string())
}

/// POST a random payload with --range, detecting the 16-20KB freeze pattern.
async fn run_dpi_target(config: &str, entry: &DpiEntry, payload_file: &std::path::Path) -> TargetOutcome {
    let mut pieces = Vec::new();
    let mut blocked = false;
    let mut any_fail = false;

    for (label, proto_args) in [
        ("HTTP", vec!["--http1.1"]),
        ("TLS1.2", vec!["--tlsv1.2", "--tls-max", "1.2"]),
        ("TLS1.3", vec!["--tlsv1.3", "--tls-max", "1.3"]),
    ] {
        let mut cmd = crate::util::hidden_command_async(curl_bin());
        cmd.args([
            "--range", &format!("0-{}", DPI_RANGE_BYTES - 1),
            "-m", &CURL_TIMEOUT_SECS.to_string(),
            "-w", "%{http_code} %{size_upload} %{size_download} %{time_total}",
            "-o", devnull(),
            "-X", "POST",
            "--data-binary", &format!("@{}", payload_file.display()),
            "-s",
        ])
        .args(&proto_args)
        .arg(format!("https://{}", entry.host))
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

        let result = tokio::time::timeout(
            std::time::Duration::from_secs(CURL_TIMEOUT_SECS + 8),
            cmd.output(),
        )
        .await;

        let Some(output) = result.ok().and_then(|r| r.ok()) else {
            pieces.push(format!("{label}:FAIL"));
            any_fail = true;
            continue;
        };
        let exit = output.status.code().unwrap_or(-1);
        let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let parts: Vec<&str> = text.split_whitespace().collect();

        if parts.len() == 4 {
            let up: i64 = parts[1].parse().unwrap_or(0);
            let down: i64 = parts[2].parse().unwrap_or(0);
            let time: f64 = parts[3].parse().unwrap_or(-1.0);
            if up > 0 && down == 0 && time >= CURL_TIMEOUT_SECS as f64 && exit != 0 {
                blocked = true;
                pieces.push(format!("{label}:BLOCKED(up {}K, down 0)", up / 1024));
            } else if exit == 0 {
                pieces.push(format!("{label}:OK({:.1}s)", time));
            } else {
                any_fail = true;
                pieces.push(format!("{label}:FAIL(code {})", parts[0]));
            }
        } else if exit == 35 {
            pieces.push(format!("{label}:UNSUP"));
        } else {
            any_fail = true;
            pieces.push(format!("{label}:FAIL"));
        }
    }

    let status = if blocked { "fail" } else if any_fail { "warn" } else { "ok" };
    let provider = entry.provider.clone().unwrap_or_default();
    let country = entry.country.clone().unwrap_or_default();
    TargetOutcome {
        config: config.into(),
        name: format!("{country} {provider} {}", entry.id).trim().to_string(),
        status: status.into(),
        detail: pieces.join("  "),
    }
}

// ---------------- ipset helpers (parity with the PS script) ----------------

fn ipset_test_backup() -> std::path::PathBuf {
    paths::zapret_lists_dir().join("ipset-all.test-backup.txt")
}

fn ipset_switch_to_any() -> bool {
    let file = paths::zapret_lists_dir().join("ipset-all.txt");
    if crate::zapret::service::ipset_mode() == "any" {
        return false;
    }
    if file.exists() {
        let _ = std::fs::copy(&file, ipset_test_backup());
    }
    let _ = std::fs::write(&file, "");
    true
}

fn ipset_restore() {
    let backup = ipset_test_backup();
    if backup.exists() {
        let file = paths::zapret_lists_dir().join("ipset-all.txt");
        let _ = std::fs::remove_file(&file);
        let _ = std::fs::rename(&backup, &file);
    }
}

// ---------------- runner ----------------

fn emit(app: &AppHandle, payload: serde_json::Value) {
    let _ = app.emit("test-event", payload);
}

/// Runs configuration tests, mirroring `utils/test zapret.ps1`:
/// for each selected strategy bat — start winws, probe targets, stop.
/// Results stream to the UI via `test-event` and into logs/tests.log.
#[tauri::command]
pub async fn run_tests(app: AppHandle, mode: String, configs: Vec<String>) -> Result<(), String> {
    let state = app.state::<AppState>();
    if state.tests_running.swap(true, Ordering::SeqCst) {
        return Err("tests_already_running".into());
    }
    state.tests_cancel.store(false, Ordering::SeqCst);

    // The PS script refuses to run while the zapret service is installed.
    if crate::zapret::service::query_service_state("zapret").is_some() {
        state.tests_running.store(false, Ordering::SeqCst);
        return Err("service_installed".into());
    }
    if configs.is_empty() {
        state.tests_running.store(false, Ordering::SeqCst);
        return Err("no_configs".into());
    }

    let app2 = app.clone();
    tauri::async_runtime::spawn(async move {
        let result = run_tests_inner(&app2, &mode, &configs).await;
        let state = app2.state::<AppState>();
        state.tests_running.store(false, Ordering::SeqCst);
        if let Err(e) = result {
            logs::append("tests", &format!("ERROR: {e}"));
            emit(&app2, json!({ "kind": "error", "message": e }));
        }
    });
    Ok(())
}

async fn run_tests_inner(app: &AppHandle, mode: &str, configs: &[String]) -> Result<(), String> {
    let state = app.state::<AppState>();
    let was_running_strategy = state.current_strategy.lock().unwrap().clone();

    logs::append("tests", &format!("=== Test run started: mode={mode}, configs={configs:?} ==="));

    // winws references *-user.txt lists that the release does not ship.
    let _ = strategy::ensure_user_lists();

    // DPI tests are only meaningful with ipset switched to "any" (PS parity).
    let mut ipset_switched = false;
    if mode == "dpi" {
        ipset_switched = ipset_switch_to_any();
    }

    let standard_targets = load_targets();
    let dpi_targets = if mode == "dpi" { fetch_dpi_suite().await.unwrap_or_default() } else { Vec::new() };
    if mode == "dpi" && dpi_targets.is_empty() {
        if ipset_switched {
            ipset_restore();
        }
        return Err("dpi_suite_unavailable".into());
    }

    // Random payload reused by every DPI probe.
    let payload_file = paths::tmp_dir().join("dpi_payload.bin");
    if mode == "dpi" {
        use rand::RngCore;
        let mut payload = vec![0u8; DPI_RANGE_BYTES];
        rand::thread_rng().fill_bytes(&mut payload);
        std::fs::create_dir_all(paths::tmp_dir()).map_err(|e| e.to_string())?;
        std::fs::write(&payload_file, &payload).map_err(|e| e.to_string())?;
    }

    let total_targets = if mode == "dpi" { dpi_targets.len() } else { standard_targets.len() };
    emit(app, json!({
        "kind": "started",
        "mode": mode,
        "configs": configs,
        "targetsPerConfig": total_targets,
    }));

    let mut summary: Vec<(String, usize, usize)> = Vec::new();

    'configs: for (i, config) in configs.iter().enumerate() {
        if state.tests_cancel.load(Ordering::SeqCst) {
            break 'configs;
        }
        emit(app, json!({ "kind": "config-start", "config": config, "index": i, "total": configs.len() }));
        logs::append("tests", &format!("--- Config: {config} ---"));

        // Fresh start for each config.
        crate::zapret::process::kill_all_winws();

        let args = match strategy::winws_args(config) {
            Ok(a) => a,
            Err(e) => {
                logs::append("tests", &format!("{config}: cannot parse strategy: {e}"));
                emit(app, json!({ "kind": "config-done", "config": config, "ok": 0, "fail": 0, "error": e }));
                continue;
            }
        };
        let exe = paths::zapret_bin_dir().join("winws.exe");
        let child = crate::util::hidden_command(&exe.to_string_lossy())
            .args(&args)
            .current_dir(paths::zapret_bin_dir())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn();
        let mut child = match child {
            Ok(c) => c,
            Err(e) => {
                emit(app, json!({ "kind": "config-done", "config": config, "ok": 0, "fail": 0, "error": format!("winws start failed: {e}") }));
                continue;
            }
        };

        // Give winws time to initialize (PS waits 5s).
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        let mut ok_count = 0usize;
        let mut fail_count = 0usize;

        // Each probe logs and emits its result the moment it finishes, so the
        // UI updates live instead of after the whole config completes.
        fn report(app: &AppHandle, outcome: &TargetOutcome) {
            logs::append("tests", &format!("{}: [{}] {} — {}", outcome.config, outcome.status.to_uppercase(), outcome.name, outcome.detail));
            emit(app, json!({ "kind": "target-result", "result": outcome }));
        }

        // Probes run concurrently in chunks of MAX_PARALLEL (PS parity).
        let outcomes: Vec<TargetOutcome> = if mode == "dpi" {
            let mut all = Vec::new();
            for chunk in dpi_targets.chunks(MAX_PARALLEL) {
                let futures = chunk.iter().map(|t| {
                    let config = config.clone();
                    let t = t.clone();
                    let payload = payload_file.clone();
                    let app = app.clone();
                    async move {
                        let outcome = run_dpi_target(&config, &t, &payload).await;
                        report(&app, &outcome);
                        outcome
                    }
                });
                all.extend(join_all(futures).await);
            }
            all
        } else {
            let mut all = Vec::new();
            for chunk in standard_targets.chunks(MAX_PARALLEL) {
                let futures = chunk.iter().map(|t| {
                    let config = config.clone();
                    let t = t.clone();
                    let app = app.clone();
                    async move {
                        let outcome = run_standard_target(&config, &t).await;
                        report(&app, &outcome);
                        outcome
                    }
                });
                all.extend(join_all(futures).await);
            }
            all
        };
        for outcome in &outcomes {
            if outcome.status == "ok" { ok_count += 1 } else { fail_count += 1 }
        }

        let _ = child.kill();
        let _ = child.wait();
        crate::zapret::process::kill_all_winws();

        summary.push((config.clone(), ok_count, fail_count));
        emit(app, json!({ "kind": "config-done", "config": config, "ok": ok_count, "fail": fail_count }));
    }

    if ipset_switched {
        ipset_restore();
    }
    let _ = std::fs::remove_file(&payload_file);

    let cancelled = state.tests_cancel.load(Ordering::SeqCst);

    // Restore the strategy that was running before the tests.
    if let Some(bat) = was_running_strategy {
        let _ = crate::zapret::process::start_strategy(&state, &bat);
    }

    if cancelled {
        logs::append("tests", "=== Test run cancelled ===");
        emit(app, json!({ "kind": "cancelled" }));
        return Ok(());
    }

    let best = summary
        .iter()
        .max_by_key(|(_, ok, _)| *ok)
        .map(|(name, _, _)| name.clone());
    logs::append("tests", &format!("=== Test run finished. Best config: {best:?} ==="));
    emit(app, json!({
        "kind": "finished",
        "best": best,
        "summary": summary.iter().map(|(c, ok, fail)| json!({ "config": c, "ok": ok, "fail": fail })).collect::<Vec<_>>(),
    }));
    Ok(())
}

#[tauri::command]
pub fn cancel_tests(state: tauri::State<'_, AppState>) {
    state.tests_cancel.store(true, Ordering::SeqCst);
}

/// Score a strategy for autopilot: higher is better. Uses the first few standard targets.
fn score_outcome(status: &str) -> usize {
    match status {
        "ok" => 3,
        "warn" => 2,
        "timeout" => 0,
        _ => 0,
    }
}

/// Quick benchmark used by autopilot `best_by_tests` mode. Starts winws, probes targets, stops.
pub async fn quick_benchmark_strategy(strategy: &str) -> Result<(usize, usize), String> {
    let _ = strategy::ensure_user_lists();
    let args = strategy::winws_args(strategy)?;
    crate::zapret::process::kill_all_winws();

    let exe = paths::zapret_bin_dir().join("winws.exe");
    let mut child = crate::util::hidden_command(&exe.to_string_lossy())
        .args(&args)
        .current_dir(paths::zapret_bin_dir())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("winws start failed: {e}"))?;

    tokio::time::sleep(std::time::Duration::from_secs(4)).await;

    let targets = load_targets();
    let sample: Vec<_> = targets.iter().take(5).collect();
    let mut score = 0usize;
    for t in &sample {
        let outcome = run_standard_target(strategy, t).await;
        score += score_outcome(&outcome.status);
    }
    let total = sample.len() * 3;

    let _ = child.kill();
    let _ = child.wait();
    crate::zapret::process::kill_all_winws();

    Ok((score, total))
}
