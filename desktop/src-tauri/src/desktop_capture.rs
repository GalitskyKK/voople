use serde::{Deserialize, Serialize};

use livekit::webrtc::desktop_capturer::{
    CaptureError, DesktopCaptureSourceType, DesktopCapturer, DesktopCapturerOptions,
};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DesktopCaptureKind {
    Screen,
    Window,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCaptureSelection {
    pub id: String,
    pub kind: DesktopCaptureKind,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCaptureSource {
    pub id: String,
    pub kind: DesktopCaptureKind,
    pub title: String,
    pub process_id: Option<u32>,
    pub can_share_audio: bool,
    pub audio_active: bool,
}

pub struct DesktopCaptureFrame {
    pub width: i32,
    pub height: i32,
    pub stride: u32,
    pub data: Vec<u8>,
}

fn source_type(kind: DesktopCaptureKind) -> DesktopCaptureSourceType {
    match kind {
        DesktopCaptureKind::Screen => DesktopCaptureSourceType::Screen,
        DesktopCaptureKind::Window => DesktopCaptureSourceType::Window,
    }
}

#[cfg(target_os = "windows")]
fn source_process_id(kind: DesktopCaptureKind, source_id: u64) -> Option<u32> {
    use windows::Win32::{Foundation::HWND, UI::WindowsAndMessaging::GetWindowThreadProcessId};

    if !matches!(kind, DesktopCaptureKind::Window) {
        return None;
    }
    let mut process_id = 0;
    unsafe {
        GetWindowThreadProcessId(HWND(source_id as usize as *mut _), Some(&mut process_id));
    }
    (process_id != 0).then_some(process_id)
}

#[cfg(not(target_os = "windows"))]
fn source_process_id(_kind: DesktopCaptureKind, _source_id: u64) -> Option<u32> {
    None
}

pub fn list_desktop_capture_sources() -> Result<Vec<DesktopCaptureSource>, String> {
    let audio_sources = crate::process_audio::list_process_audio_sources()?;
    let audio_by_process = audio_sources
        .into_iter()
        .map(|source| (source.process_id, source.active))
        .collect::<std::collections::HashMap<_, _>>();
    let excluded = crate::process_audio::voople_process_tree();
    let system_audio_active = audio_by_process.values().any(|active| *active);
    let mut result = Vec::new();

    for kind in [DesktopCaptureKind::Window, DesktopCaptureKind::Screen] {
        let mut options = DesktopCapturerOptions::new(source_type(kind));
        options.set_include_cursor(true);
        let Some(capturer) = DesktopCapturer::new(options) else {
            continue;
        };
        for (index, source) in capturer.get_source_list().into_iter().enumerate() {
            let process_id = source_process_id(kind, source.id());
            if process_id.is_some_and(|id| excluded.contains(&id)) {
                continue;
            }
            let title = source.title().trim().to_owned();
            result.push(DesktopCaptureSource {
                id: source.id().to_string(),
                kind,
                title: if title.is_empty() {
                    match kind {
                        DesktopCaptureKind::Screen => format!("Экран {}", index + 1),
                        DesktopCaptureKind::Window => "Окно приложения".to_owned(),
                    }
                } else {
                    title
                },
                process_id,
                can_share_audio: matches!(kind, DesktopCaptureKind::Screen)
                    || process_id.is_some_and(|id| audio_by_process.contains_key(&id)),
                audio_active: if matches!(kind, DesktopCaptureKind::Screen) {
                    system_audio_active
                } else {
                    process_id
                        .and_then(|id| audio_by_process.get(&id).copied())
                        .unwrap_or(false)
                },
            });
        }
    }

    result.sort_by(|left, right| {
        matches!(left.kind, DesktopCaptureKind::Screen)
            .cmp(&matches!(right.kind, DesktopCaptureKind::Screen))
            .then_with(|| right.audio_active.cmp(&left.audio_active))
            .then_with(|| left.title.to_lowercase().cmp(&right.title.to_lowercase()))
    });
    Ok(result)
}

pub fn spawn_desktop_capture(
    selection: DesktopCaptureSelection,
    frame_rate: u32,
    sender: tokio::sync::mpsc::Sender<DesktopCaptureFrame>,
) -> std::thread::JoinHandle<Result<(), String>> {
    std::thread::spawn(move || {
        let mut options = DesktopCapturerOptions::new(source_type(selection.kind));
        options.set_include_cursor(true);
        let mut capturer = DesktopCapturer::new(options)
            .ok_or_else(|| "Нативный захват выбранной поверхности недоступен".to_owned())?;
        let source_id = selection
            .id
            .parse::<u64>()
            .map_err(|_| "Некорректный источник демонстрации".to_owned())?;
        let source = capturer
            .get_source_list()
            .into_iter()
            .find(|source| source.id() == source_id)
            .ok_or_else(|| "Выбранное окно или экран больше недоступны".to_owned())?;
        let running = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(true));
        let callback_running = running.clone();
        capturer.start_capture(Some(source), move |result| {
            let frame = match result {
                Ok(frame) => frame,
                Err(CaptureError::Temporary) => return,
                Err(CaptureError::Permanent) => {
                    callback_running.store(false, std::sync::atomic::Ordering::Release);
                    return;
                }
            };
            if sender
                .blocking_send(DesktopCaptureFrame {
                    width: frame.width(),
                    height: frame.height(),
                    stride: frame.stride(),
                    data: frame.data().to_vec(),
                })
                .is_err()
            {
                callback_running.store(false, std::sync::atomic::Ordering::Release);
            }
        });

        let interval = std::time::Duration::from_millis(1_000 / frame_rate.clamp(1, 60) as u64);
        while running.load(std::sync::atomic::Ordering::Acquire) {
            capturer.capture_frame();
            std::thread::sleep(interval);
        }
        Ok(())
    })
}
