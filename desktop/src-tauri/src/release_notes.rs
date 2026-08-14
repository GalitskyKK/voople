use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::ErrorKind,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

const HISTORY_LIMIT: usize = 20;
const NOTES_LIMIT: usize = 20_000;

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseNoteEntry {
    previous_version: String,
    installed_version: String,
    notes: Option<String>,
    installed_at_unix: u64,
    acknowledged_at_unix: Option<u64>,
}

#[derive(Default, Deserialize, Serialize)]
struct ReleaseNotesStore {
    entries: Vec<ReleaseNoteEntry>,
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn validate_version(version: &str) -> Result<(), String> {
    let valid = !version.is_empty()
        && version.len() <= 64
        && version
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'+'));
    valid
        .then_some(())
        .ok_or_else(|| "Update version contains unsupported characters".to_owned())
}

fn store_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("release-notes.json"))
}

fn load_store(app: &tauri::AppHandle) -> Result<ReleaseNotesStore, String> {
    let path = store_path(app)?;
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return Ok(ReleaseNotesStore::default())
        }
        Err(error) => return Err(error.to_string()),
    };
    serde_json::from_slice(&bytes).map_err(|error| error.to_string())
}

fn save_store(app: &tauri::AppHandle, store: &ReleaseNotesStore) -> Result<(), String> {
    let path = store_path(app)?;
    let temporary = path.with_extension("json.tmp");
    let backup = path.with_extension("json.bak");
    let bytes = serde_json::to_vec_pretty(store).map_err(|error| error.to_string())?;
    fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
    if path.exists() {
        if backup.exists() {
            fs::remove_file(&backup).map_err(|error| error.to_string())?;
        }
        fs::rename(&path, &backup).map_err(|error| error.to_string())?;
    }
    if let Err(error) = fs::rename(&temporary, &path) {
        if backup.exists() {
            let _ = fs::rename(&backup, &path);
        }
        return Err(error.to_string());
    }
    if backup.exists() {
        fs::remove_file(backup).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn record_installed_update(
    app: tauri::AppHandle,
    previous_version: String,
    installed_version: String,
    notes: Option<String>,
) -> Result<(), String> {
    validate_version(&previous_version)?;
    validate_version(&installed_version)?;
    let notes = notes
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    if notes
        .as_ref()
        .is_some_and(|value| value.len() > NOTES_LIMIT)
    {
        return Err("Release notes are too large".to_owned());
    }

    let mut store = load_store(&app)?;
    store
        .entries
        .retain(|entry| entry.installed_version != installed_version);
    store.entries.insert(
        0,
        ReleaseNoteEntry {
            previous_version,
            installed_version,
            notes,
            installed_at_unix: now_unix(),
            acknowledged_at_unix: None,
        },
    );
    store.entries.truncate(HISTORY_LIMIT);
    save_store(&app, &store)
}

#[tauri::command]
pub fn desktop_release_notes(app: tauri::AppHandle) -> Result<Vec<ReleaseNoteEntry>, String> {
    Ok(load_store(&app)?.entries)
}

#[tauri::command]
pub fn acknowledge_desktop_release(
    app: tauri::AppHandle,
    installed_version: String,
) -> Result<(), String> {
    validate_version(&installed_version)?;
    let mut store = load_store(&app)?;
    if let Some(entry) = store
        .entries
        .iter_mut()
        .find(|entry| entry.installed_version == installed_version)
    {
        entry.acknowledged_at_unix.get_or_insert_with(now_unix);
        save_store(&app, &store)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_version;

    #[test]
    fn version_validation_accepts_updater_versions() {
        assert!(validate_version("0.1.17").is_ok());
        assert!(validate_version("1.0.0-beta.2+desktop").is_ok());
    }

    #[test]
    fn version_validation_rejects_paths_and_whitespace() {
        assert!(validate_version("../0.1.17").is_err());
        assert!(validate_version("0.1.17 next").is_err());
    }
}
