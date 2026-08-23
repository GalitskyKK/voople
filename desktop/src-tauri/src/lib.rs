use serde::Serialize;
use std::{
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    time::Duration,
};
use tauri::{
    ipc::{InvokeBody, Request},
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

mod process_audio;
#[cfg(target_os = "windows")]
mod process_audio_capture;
#[cfg(feature = "process-audio-publisher")]
mod process_audio_publisher;
#[cfg(not(feature = "process-audio-publisher"))]
#[path = "process_audio_publisher_stub.rs"]
mod process_audio_publisher;
mod release_notes;

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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessAudioCapabilities {
    publisher_included: bool,
    publisher_supported: bool,
    current_windows_build: Option<u32>,
    minimum_windows_build: u32,
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

#[tauri::command]
fn process_audio_capabilities() -> ProcessAudioCapabilities {
    const MINIMUM_WINDOWS_BUILD: u32 = 20_348;
    let current_windows_build = windows_build_number();
    ProcessAudioCapabilities {
        publisher_included: cfg!(feature = "process-audio-publisher"),
        publisher_supported: cfg!(feature = "process-audio-publisher")
            && current_windows_build.is_some_and(|build| build >= MINIMUM_WINDOWS_BUILD),
        current_windows_build,
        minimum_windows_build: MINIMUM_WINDOWS_BUILD,
    }
}

#[cfg(target_os = "windows")]
fn windows_build_number() -> Option<u32> {
    #[repr(C)]
    struct RtlOsVersionInfo {
        size: u32,
        major: u32,
        minor: u32,
        build: u32,
        platform: u32,
        service_pack: [u16; 128],
    }
    #[link(name = "ntdll")]
    unsafe extern "system" {
        fn RtlGetVersion(info: *mut RtlOsVersionInfo) -> i32;
    }
    let mut info = RtlOsVersionInfo {
        size: std::mem::size_of::<RtlOsVersionInfo>() as u32,
        major: 0,
        minor: 0,
        build: 0,
        platform: 0,
        service_pack: [0; 128],
    };
    (unsafe { RtlGetVersion(&mut info) } >= 0).then_some(info.build)
}

#[cfg(not(target_os = "windows"))]
fn windows_build_number() -> Option<u32> {
    None
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
fn list_process_audio_sources() -> Result<Vec<process_audio::ProcessAudioSource>, String> {
    process_audio::list_process_audio_sources()
}

#[tauri::command]
async fn start_process_audio_share(
    state: tauri::State<'_, process_audio_publisher::ProcessAudioPublishers>,
    input: process_audio_publisher::StartProcessAudioInput,
) -> Result<(), String> {
    state.start(input).await
}

#[tauri::command]
fn stop_process_audio_share(
    state: tauri::State<'_, process_audio_publisher::ProcessAudioPublishers>,
    screen_session_id: String,
) -> Result<(), String> {
    state.stop(&screen_session_id)
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let parsed = reqwest::Url::parse(&url).map_err(|error| error.to_string())?;
    if parsed.scheme() != "https" && parsed.scheme() != "http" {
        return Err("External URL must use HTTP or HTTPS".to_owned());
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
async fn upload_presigned_media(request: Request<'_>) -> Result<(), String> {
    const MAX_UPLOAD_BYTES: usize = 100 * 1024 * 1024;

    let bytes = match request.body() {
        InvokeBody::Raw(bytes) if !bytes.is_empty() && bytes.len() <= MAX_UPLOAD_BYTES => {
            bytes.clone()
        }
        InvokeBody::Raw(_) => return Err("Upload size must be between 1 byte and 40 MB".to_owned()),
        InvokeBody::Json(_) => return Err("Upload must use a binary IPC body".to_owned()),
    };
    let upload_url = request
        .headers()
        .get("x-voople-upload-url")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "Upload URL is missing".to_owned())?
        .to_owned();
    let content_type = request
        .headers()
        .get("x-voople-content-type")
        .and_then(|value| value.to_str().ok())
        .filter(|value| {
            value.starts_with("image/")
                || value.starts_with("video/")
                || value.starts_with("audio/")
        })
        .ok_or_else(|| "Unsupported upload content type".to_owned())?
        .to_owned();

    let parsed = reqwest::Url::parse(&upload_url).map_err(|_| "Invalid upload URL".to_owned())?;
    let host = parsed.host_str().unwrap_or_default();
    let selectel_host =
        host == "s3.ru-3.storage.selcloud.ru" || host.ends_with(".storage.selcloud.ru");
    let local_development = cfg!(debug_assertions)
        && parsed.scheme() == "http"
        && matches!(host, "127.0.0.1" | "localhost");
    if !(parsed.scheme() == "https" && selectel_host) && !local_development {
        return Err("Upload URL host is not allowed".to_owned());
    }
    if !local_development
        && !parsed
            .query_pairs()
            .any(|(key, _)| key.eq_ignore_ascii_case("x-amz-signature"))
    {
        return Err("Upload URL is not signed".to_owned());
    }

    let response = reqwest::Client::new()
        .put(parsed)
        .header(reqwest::header::CONTENT_TYPE, content_type)
        .body(bytes)
        .timeout(Duration::from_secs(90))
        .send()
        .await
        .map_err(|error| format!("Upload request failed: {error}"))?;
    if !response.status().is_success() {
        return Err(format!("Upload failed with status {}", response.status()));
    }
    Ok(())
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

    let mut current = state
        .0
        .lock()
        .map_err(|_| "Heartbeat state is unavailable")?;
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
    let mut current = state
        .0
        .lock()
        .map_err(|_| "Heartbeat state is unavailable")?;
    if current.as_ref().is_some_and(|task| task.id == heartbeat_id) {
        if let Some(task) = current.take() {
            task.handle.abort();
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(WindowBehavior::default())
        .manage(VoiceHeartbeat::default())
        .manage(process_audio_publisher::ProcessAudioPublishers::default())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::default().build());

    #[cfg(not(debug_assertions))]
    let builder = builder.plugin(tauri_plugin_updater::Builder::new().build());

    builder
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
            process_audio_capabilities,
            show_main_window,
            restart_application,
            list_process_audio_sources,
            start_process_audio_share,
            stop_process_audio_share,
            open_external_url,
            upload_presigned_media,
            set_window_behavior,
            start_voice_heartbeat,
            stop_voice_heartbeat,
            release_notes::record_installed_update,
            release_notes::desktop_release_notes,
            release_notes::acknowledge_desktop_release
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Voople desktop");
}
