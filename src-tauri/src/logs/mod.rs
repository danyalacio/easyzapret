use std::io::Write;
use std::path::PathBuf;

use crate::paths;

const MAX_READ_BYTES: u64 = 2 * 1024 * 1024;

fn log_file(name: &str) -> Result<PathBuf, String> {
    match name {
        "app" | "zapret" | "tgproxy" | "tests" | "warp" => {
            Ok(paths::logs_dir().join(format!("{name}.log")))
        }
        _ => Err(format!("unknown log: {name}")),
    }
}

/// Appends a timestamped line to one of the app log files.
pub fn append(name: &str, line: &str) {
    let Ok(path) = log_file(name) else {
        return;
    };
    let _ = std::fs::create_dir_all(paths::logs_dir());
    let stamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S");
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = writeln!(f, "[{stamp}] {line}");
    }
}

/// Appends a raw line (already formatted by an external process).
pub fn append_raw(name: &str, line: &str) {
    let Ok(path) = log_file(name) else {
        return;
    };
    let _ = std::fs::create_dir_all(paths::logs_dir());
    if let Ok(mut f) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
    {
        let _ = writeln!(f, "{line}");
    }
}

#[tauri::command]
pub fn read_log(name: String, max_lines: usize) -> Result<String, String> {
    // The Telegram proxy keeps its own log inside %APPDATA%/TgWsProxy.
    let path = if name == "tgproxy-own" {
        match crate::tg_proxy::own_log_file() {
            Some(p) => p,
            None => return Ok(String::new()),
        }
    } else {
        log_file(&name)?
    };

    if !path.exists() {
        return Ok(String::new());
    }
    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    let text = if meta.len() > MAX_READ_BYTES {
        use std::io::{Read, Seek, SeekFrom};
        let mut f = std::fs::File::open(&path).map_err(|e| e.to_string())?;
        f.seek(SeekFrom::End(-(MAX_READ_BYTES as i64)))
            .map_err(|e| e.to_string())?;
        let mut buf = Vec::new();
        f.read_to_end(&mut buf).map_err(|e| e.to_string())?;
        String::from_utf8_lossy(&buf).to_string()
    } else {
        String::from_utf8_lossy(&std::fs::read(&path).map_err(|e| e.to_string())?).to_string()
    };

    let lines: Vec<&str> = text.lines().collect();
    let start = lines.len().saturating_sub(max_lines);
    Ok(lines[start..].join("\n"))
}

#[tauri::command]
pub fn clear_log(name: String) -> Result<(), String> {
    let path = log_file(&name)?;
    if path.exists() {
        std::fs::write(path, "").map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn logs_dir_path() -> String {
    paths::logs_dir().to_string_lossy().to_string()
}
