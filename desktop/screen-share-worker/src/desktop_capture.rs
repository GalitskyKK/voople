use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};

use livekit::webrtc::desktop_capturer::{
    CaptureError, DesktopCaptureSourceType, DesktopCapturer, DesktopCapturerOptions,
};
use voople_screen_share_protocol::{
    DesktopCaptureKind, DesktopCaptureSelection, DesktopCaptureSource,
};

pub struct DesktopCaptureFrame {
    pub width: i32,
    pub height: i32,
    pub stride: u32,
    pub data: Vec<u8>,
}

pub struct DesktopCaptureHandle {
    running: Arc<AtomicBool>,
    thread: std::thread::Thread,
    join: Option<std::thread::JoinHandle<Result<(), String>>>,
}

impl DesktopCaptureHandle {
    pub fn cancel(&self) {
        self.running.store(false, Ordering::Release);
        self.thread.unpark();
    }

    pub fn join(mut self) -> Result<(), String> {
        self.cancel();
        self.join
            .take()
            .expect("desktop capture thread is missing")
            .join()
            .map_err(|_| "Поток видеозахвата завершился аварийно".to_owned())?
    }
}

fn source_type(kind: DesktopCaptureKind) -> DesktopCaptureSourceType {
    match kind {
        DesktopCaptureKind::Screen => DesktopCaptureSourceType::Screen,
        DesktopCaptureKind::Window => DesktopCaptureSourceType::Window,
    }
}

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

pub fn list_desktop_capture_sources(
    host_process_id: u32,
) -> Result<Vec<DesktopCaptureSource>, String> {
    let audio_sources = crate::process_audio::list_process_audio_sources(host_process_id)?;
    let audio_by_process = audio_sources
        .into_iter()
        .map(|source| (source.process_id, source.active))
        .collect::<std::collections::HashMap<_, _>>();
    let excluded = crate::process_audio::process_tree(host_process_id);
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
) -> DesktopCaptureHandle {
    let running = Arc::new(AtomicBool::new(true));
    let thread_running = running.clone();

    let join = std::thread::spawn(move || {
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

        let callback_running = thread_running.clone();
        capturer.start_capture(Some(source), move |result| {
            if !callback_running.load(Ordering::Acquire) {
                return;
            }

            let frame = match result {
                Ok(frame) => frame,
                Err(CaptureError::Temporary) => return,
                Err(CaptureError::Permanent) => {
                    callback_running.store(false, Ordering::Release);
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
                callback_running.store(false, Ordering::Release);
            }
        });

        let interval =
            std::time::Duration::from_millis(1_000 / frame_rate.clamp(1, 60) as u64);

        while thread_running.load(Ordering::Acquire) {
            capturer.capture_frame();
            if !thread_running.load(Ordering::Acquire) {
                break;
            }
            std::thread::park_timeout(interval);
        }

        Ok(())
    });

    let thread = join.thread().clone();
    DesktopCaptureHandle {
        running,
        thread,
        join: Some(join),
    }
}
