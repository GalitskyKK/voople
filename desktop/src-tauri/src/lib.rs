use serde::Serialize;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

struct WindowBehavior {
    close_to_tray: AtomicBool,
    minimize_to_tray: AtomicBool,
    quitting: AtomicBool,
}

struct VoiceHeartbeatTask {
    id: String,
    handle: tauri::async_runtime::JoinHandle<()>,
}

#[derive(Default)]
struct VoiceHeartbeat(Mutex<Option<VoiceHeartbeatTask>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VoiceHeartbeatBody {
    chat_id: String,
    mic_muted: bool,
}

impl Default for WindowBehavior {
    fn default() -> Self {
        Self {
            close_to_tray: AtomicBool::new(true),
            minimize_to_tray: AtomicBool::new(false),
            quitting: AtomicBool::new(false),
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeInfo {
    app_version: &'static str,
    arch: &'static str,
    os: &'static str,
    runtime: &'static str,
}

#[tauri::command]
fn runtime_info() -> RuntimeInfo {
    RuntimeInfo {
        app_version: env!("CARGO_PKG_VERSION"),
        arch: std::env::consts::ARCH,
        os: std::env::consts::OS,
        runtime: "tauri",
    }
}

fn restore_main_window(app: &tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window is unavailable".to_owned())?;

    window.show().map_err(|error| error.to_string())?;
    window.unminimize().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    restore_main_window(&app)
}

#[tauri::command]
fn restart_application(app: tauri::AppHandle) {
    app.restart();
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let parsed = reqwest::Url::parse(&url).map_err(|error| error.to_string())?;
    if parsed.scheme() != "https" {
        return Err("External URL must use HTTPS".to_owned());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32.exe")
            .arg("url.dll,FileProtocolHandler")
            .arg(parsed.as_str())
            .spawn()
            .map_err(|error| error.to_string())?;
        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    Err("Opening external URLs is not supported on this platform".to_owned())
}

#[tauri::command]
fn set_window_behavior(
    state: tauri::State<'_, WindowBehavior>,
    close_to_tray: bool,
    minimize_to_tray: bool,
) {
    state.close_to_tray.store(close_to_tray, Ordering::Relaxed);
    state
        .minimize_to_tray
        .store(minimize_to_tray, Ordering::Relaxed);
}

#[tauri::command]
fn start_voice_heartbeat(
    state: tauri::State<'_, VoiceHeartbeat>,
    heartbeat_id: String,
    api_url: String,
    access_token: String,
    chat_id: String,
    mic_muted: bool,
) -> Result<(), String> {
    let base_url = reqwest::Url::parse(&api_url).map_err(|error| error.to_string())?;
    let local_development = matches!(base_url.host_str(), Some("127.0.0.1" | "localhost"));
    if base_url.scheme() != "https" && !(base_url.scheme() == "http" && local_development) {
        return Err("Voice heartbeat API must use HTTPS".to_owned());
    }
    let endpoint = base_url
        .join("/api/desktop/voice/heartbeat")
        .map_err(|error| error.to_string())?;
    let client = reqwest::Client::new();
    let body = VoiceHeartbeatBody { chat_id, mic_muted };
    let handle = tauri::async_runtime::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_secs(25));
        loop {
            interval.tick().await;
            match client
                .post(endpoint.clone())
                .bearer_auth(&access_token)
                .json(&body)
                .timeout(Duration::from_secs(15))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {}
                Ok(response) if matches!(response.status().as_u16(), 401 | 409) => break,
                Ok(response) => {
                    eprintln!("voice heartbeat returned status {}", response.status());
                }
                Err(error) => eprintln!("voice heartbeat request failed: {error}"),
            }
        }
    });

    let mut current = state.0.lock().map_err(|_| "Heartbeat state is unavailable")?;
    if let Some(previous) = current.replace(VoiceHeartbeatTask {
        id: heartbeat_id,
        handle,
    }) {
        previous.handle.abort();
    }
    Ok(())
}

#[tauri::command]
fn stop_voice_heartbeat(
    state: tauri::State<'_, VoiceHeartbeat>,
    heartbeat_id: String,
) -> Result<(), String> {
    let mut current = state.0.lock().map_err(|_| "Heartbeat state is unavailable")?;
    if current.as_ref().is_some_and(|task| task.id == heartbeat_id) {
        if let Some(task) = current.take() {
            task.handle.abort();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(WindowBehavior::default())
        .manage(VoiceHeartbeat::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let _ = restore_main_window(app);
        }))
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Открыть Voople", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Выйти", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            let mut tray = TrayIconBuilder::with_id("voople-tray")
                .tooltip("Voople")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        let _ = restore_main_window(app);
                    }
                    "quit" => {
                        app.state::<WindowBehavior>()
                            .quitting
                            .store(true, Ordering::Relaxed);
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = restore_main_window(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() {
                tray = tray.icon(icon.clone());
            }
            tray.build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            let state = window.app_handle().state::<WindowBehavior>();
            match event {
                WindowEvent::CloseRequested { api, .. }
                    if !state.quitting.load(Ordering::Relaxed) =>
                {
                    api.prevent_close();
                    if state.close_to_tray.load(Ordering::Relaxed) {
                        let _ = window.hide();
                    } else {
                        state.quitting.store(true, Ordering::Relaxed);
                        window.app_handle().exit(0);
                    }
                }
                WindowEvent::Resized(_)
                    if state.minimize_to_tray.load(Ordering::Relaxed)
                        && window.is_minimized().unwrap_or(false) =>
                {
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![
            runtime_info,
            show_main_window,
            restart_application,
            open_external_url,
            set_window_behavior,
            start_voice_heartbeat,
            stop_voice_heartbeat
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Voople desktop");
}
