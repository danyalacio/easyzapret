use std::path::PathBuf;

/// Fixed data directory. Everything EasyZapret manages lives here so that the
/// path never contains cyrillic or special characters (zapret requirement).
pub fn data_dir() -> PathBuf {
    #[cfg(windows)]
    {
        PathBuf::from("C:\\EasyZapret")
    }
    #[cfg(not(windows))]
    {
        // Non-Windows builds exist only for development.
        dirs::home_dir().unwrap_or_default().join("EasyZapret")
    }
}

pub fn zapret_dir() -> PathBuf {
    data_dir().join("zapret")
}

pub fn zapret_bin_dir() -> PathBuf {
    zapret_dir().join("bin")
}

pub fn zapret_lists_dir() -> PathBuf {
    zapret_dir().join("lists")
}

pub fn zapret_utils_dir() -> PathBuf {
    zapret_dir().join("utils")
}

pub fn tg_dir() -> PathBuf {
    data_dir().join("tg-ws-proxy")
}

pub fn tg_exe() -> PathBuf {
    tg_dir().join("TgWsProxy_windows.exe")
}

pub fn logs_dir() -> PathBuf {
    data_dir().join("logs")
}

pub fn tmp_dir() -> PathBuf {
    data_dir().join("tmp")
}

pub fn settings_file() -> PathBuf {
    data_dir().join("config.json")
}

pub fn ensure_dirs() -> std::io::Result<()> {
    for dir in [data_dir(), zapret_dir(), tg_dir(), logs_dir(), tmp_dir()] {
        std::fs::create_dir_all(dir)?;
    }
    Ok(())
}
