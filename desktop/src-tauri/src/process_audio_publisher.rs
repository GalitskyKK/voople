use serde::Deserialize;
use std::{collections::HashMap, sync::Mutex};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessAudioInput {
    #[serde(default)]
    pub process_id: Option<u32>,
    #[serde(default)]
    pub capture_source: Option<crate::desktop_capture::DesktopCaptureSelection>,
    #[serde(default = "default_capture_width")]
    pub capture_width: u32,
    #[serde(default = "default_capture_height")]
    pub capture_height: u32,
    #[serde(default = "default_capture_frame_rate")]
    pub capture_frame_rate: u32,
    pub livekit_url: String,
    pub token: String,
    pub screen_session_id: String,
}

fn default_capture_width() -> u32 {
    1920
}

fn default_capture_height() -> u32 {
    1080
}

fn default_capture_frame_rate() -> u32 {
    30
}

#[cfg(target_os = "windows")]
fn fitted_capture_resolution(
    source_width: i32,
    source_height: i32,
    max_width: u32,
    max_height: u32,
) -> (u32, u32) {
    let source_width = source_width.max(2) as f64;
    let source_height = source_height.max(2) as f64;
    let max_width = max_width.clamp(320, 3840) as f64;
    let max_height = max_height.clamp(180, 2160) as f64;
    let scale = (max_width / source_width)
        .min(max_height / source_height)
        .min(1.0);
    let even = |value: f64| ((value.floor() as u32).max(2)) & !1;
    (even(source_width * scale), even(source_height * scale))
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::fitted_capture_resolution;

    #[test]
    fn capture_resolution_keeps_landscape_window_ratio() {
        assert_eq!(
            fitted_capture_resolution(1_000, 700, 1_280, 720),
            (1_000, 700)
        );
    }

    #[test]
    fn capture_resolution_fits_portrait_window_without_cropping() {
        assert_eq!(
            fitted_capture_resolution(900, 1_200, 1_280, 720),
            (540, 720)
        );
    }

    #[test]
    fn capture_resolution_caps_large_sixteen_by_nine_sources() {
        assert_eq!(
            fitted_capture_resolution(3_840, 2_160, 1_280, 720),
            (1_280, 720)
        );
    }
}

#[cfg(target_os = "windows")]
fn capture_desktop_frame(
    source: &livekit::webrtc::video_source::native::NativeVideoSource,
    frame: crate::desktop_capture::DesktopCaptureFrame,
) {
    use livekit::webrtc::{
        native::yuv_helper,
        prelude::{I420Buffer, VideoFrame, VideoRotation},
    };

    if frame.width <= 0 || frame.height <= 0 {
        return;
    }
    let mut buffer = I420Buffer::new(frame.width as u32, frame.height as u32);
    let (stride_y, stride_u, stride_v) = buffer.strides();
    let (data_y, data_u, data_v) = buffer.data_mut();
    yuv_helper::argb_to_i420(
        &frame.data,
        frame.stride,
        data_y,
        stride_y,
        data_u,
        stride_u,
        data_v,
        stride_v,
        frame.width,
        frame.height,
    );
    source.capture_frame(&VideoFrame::new(VideoRotation::VideoRotation0, buffer));
}

struct PublisherTask {
    stop: tokio::sync::oneshot::Sender<()>,
    handle: tauri::async_runtime::JoinHandle<Result<(), String>>,
}

#[derive(Default)]
pub struct ProcessAudioPublishers(Mutex<HashMap<String, PublisherTask>>);

impl ProcessAudioPublishers {
    pub async fn start(&self, input: StartProcessAudioInput) -> Result<(), String> {
        if input.process_id == Some(0)
            || (input.process_id.is_none() && input.capture_source.is_none())
            || input.token.is_empty()
            || input.livekit_url.is_empty()
        {
            return Err("Некорректные параметры звука демонстрации".to_owned());
        }
        let session_id = input.screen_session_id.clone();
        let task_id = session_id.clone();
        let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
        let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();
        let handle = tauri::async_runtime::spawn(publish_process_audio(input, ready_tx, stop_rx));
        let previous = {
            let mut tasks = self
                .0
                .lock()
                .map_err(|_| "Состояние аудиозахвата недоступно")?;
            tasks.insert(
                task_id,
                PublisherTask {
                    stop: stop_tx,
                    handle,
                },
            )
        };
        if let Some(previous) = previous {
            stop_publisher_task(previous).await;
        }
        let ready = match tokio::time::timeout(std::time::Duration::from_secs(12), ready_rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err("Аудиомодуль завершился до публикации трека".to_owned()),
            Err(_) => Err("Аудиомодуль не подтвердил публикацию трека за 12 секунд".to_owned()),
        };
        if let Err(error) = ready {
            let _ = self.stop(&session_id).await;
            return Err(error);
        }
        Ok(())
    }

    pub async fn stop(&self, screen_session_id: &str) -> Result<(), String> {
        let task = self
            .0
            .lock()
            .map_err(|_| "Состояние аудиозахвата недоступно")?
            .remove(screen_session_id);
        if let Some(task) = task {
            stop_publisher_task(task).await;
        }
        Ok(())
    }
}

async fn stop_publisher_task(task: PublisherTask) {
    let PublisherTask { stop, mut handle } = task;
    let _ = stop.send(());
    // Dropping a Tokio JoinHandle detaches the task; it does not cancel it.
    // Never abort here: destructing LiveKit/WebRTC while its native callbacks
    // are running was the crash path reported when a share was stopped. The
    // stop signal closes capture receivers first and lets the detached task
    // finish room.close() if a native dependency needs longer than five seconds.
    let _ = tokio::time::timeout(std::time::Duration::from_secs(5), &mut handle).await;
}

#[cfg(target_os = "windows")]
async fn publish_process_audio(
    input: StartProcessAudioInput,
    ready: tokio::sync::oneshot::Sender<Result<(), String>>,
    mut stop: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), String> {
    use livekit::{
        options::TrackPublishOptions,
        prelude::{LocalAudioTrack, LocalTrack, LocalVideoTrack, TrackSource},
        webrtc::{
            audio_source::native::NativeAudioSource,
            prelude::{AudioSourceOptions, RtcAudioSource, RtcVideoSource, VideoResolution},
            video_source::native::NativeVideoSource,
        },
        Room, RoomOptions,
    };

    let captures_system_audio = input.capture_source.as_ref().is_some_and(|source| {
        matches!(
            source.kind,
            crate::desktop_capture::DesktopCaptureKind::Screen
        )
    });
    let (video_capture, mut video_receiver, first_video_frame) = if let Some(selection) =
        input.capture_source.clone()
    {
        let (sender, mut receiver) = tokio::sync::mpsc::channel(2);
        let capture = crate::desktop_capture::spawn_desktop_capture(
            selection,
            input.capture_frame_rate,
            sender,
        );
        let first_frame_result = tokio::select! {
            _ = &mut stop => {
                drop(receiver);
                let _ = capture.join();
                return Ok(());
            }
            result = tokio::time::timeout(std::time::Duration::from_secs(10), receiver.recv()) => {
                result
                    .map_err(|_| "Нативный захват не вернул первый кадр за 10 секунд".to_owned())
                    .and_then(|frame| {
                        frame.ok_or_else(|| "Выбранное окно или экран больше недоступны".to_owned())
                    })
            }
        };
        let first_frame = match first_frame_result {
            Ok(frame) => frame,
            Err(error) => {
                drop(receiver);
                let _ = capture.join();
                let _ = ready.send(Err(error.clone()));
                return Err(error);
            }
        };
        (Some(capture), Some(receiver), Some(first_frame))
    } else {
        (None, None, None)
    };
    let capture_resolution = first_video_frame.as_ref().map(|frame| {
        fitted_capture_resolution(
            frame.width,
            frame.height,
            input.capture_width,
            input.capture_height,
        )
    });

    let initialized = tokio::select! {
      _ = &mut stop => {
        drop(video_receiver);
        if let Some(capture) = video_capture {
            let _ = capture.join();
        }
        return Ok(());
      }
      initialized = async {
        let mut room_options = RoomOptions::default();
        room_options.auto_subscribe = false;
        let (room, _events) = Room::connect(&input.livekit_url, &input.token, room_options)
            .await
            .map_err(|error| error.to_string())?;
        let room = std::sync::Arc::new(room);
        let stream = input.screen_session_id.clone();
        let audio_source = (input.process_id.is_some() || captures_system_audio)
            .then(|| NativeAudioSource::new(AudioSourceOptions::default(), 48_000, 2, 100));
        if let Some(source) = audio_source.as_ref() {
            let track = LocalAudioTrack::create_audio_track(
                &format!("screen-audio:{stream}"),
                RtcAudioSource::Native(source.clone()),
            );
            room.local_participant()
                .publish_track(
                    LocalTrack::Audio(track),
                    TrackPublishOptions {
                        source: TrackSource::ScreenshareAudio,
                        stream: stream.clone(),
                        dtx: false,
                        ..Default::default()
                    },
                )
                .await
                .map_err(|error| error.to_string())?;
        }
        let video_source = capture_resolution.map(|(width, height)| {
            NativeVideoSource::new(
                VideoResolution { width, height },
                true,
            )
        });
        if let Some(source) = video_source.as_ref() {
            let track = LocalVideoTrack::create_video_track(
                &format!("screen-video:{stream}"),
                RtcVideoSource::Native(source.clone()),
            );
            room.local_participant()
                .publish_track(
                    LocalTrack::Video(track),
                    TrackPublishOptions {
                        source: TrackSource::Screenshare,
                        stream,
                        ..Default::default()
                    },
                )
                .await
                .map_err(|error| error.to_string())?;
        }
        Ok::<_, String>((room, audio_source, video_source, captures_system_audio))
      } => initialized,
    };
    let (room, audio_source, video_source, captures_system_audio) = match initialized {
        Ok(value) => value,
        Err(error) => {
            let _ = ready.send(Err(error.clone()));
            drop(video_receiver);
            if let Some(capture) = video_capture {
                let _ = capture.join();
            }
            return Err(error);
        }
    };

    let audio_target = if captures_system_audio {
        Some(
            crate::process_audio_capture::ProcessLoopbackTarget::ExcludeProcessTree(
                std::process::id(),
            ),
        )
    } else {
        input
            .process_id
            .map(crate::process_audio_capture::ProcessLoopbackTarget::IncludeProcessTree)
    };
    let (audio_capture, mut audio_receiver) = if let Some(target) = audio_target {
        let (sender, receiver) = tokio::sync::mpsc::channel::<Vec<i16>>(24);
        let capture = std::thread::spawn(move || {
            crate::process_audio_capture::capture_process_loopback(target, sender)
        });
        (Some(capture), Some(receiver))
    } else {
        (None, None)
    };
    let mut audio_ready = audio_source.is_none();
    let mut video_ready = video_source.is_none();
    let mut ready = Some(ready);
    if let (Some(source), Some(frame)) = (video_source.as_ref(), first_video_frame) {
        capture_desktop_frame(source, frame);
        video_ready = true;
    }

    while audio_receiver.is_some() || video_receiver.is_some() {
        tokio::select! {
            _ = &mut stop => {
                // Dropping the receivers makes both native capture threads
                // leave their blocking_send loops and release OS resources.
                audio_receiver = None;
                video_receiver = None;
            }
            samples = receive_optional(&mut audio_receiver) => {
                let Some(samples) = samples else {
                    audio_receiver = None;
                    continue;
                };
                if let Some(source) = audio_source.as_ref() {
                    let frame = livekit::webrtc::prelude::AudioFrame {
                        samples_per_channel: (samples.len() / 2) as u32,
                        data: samples.into(),
                        sample_rate: 48_000,
                        num_channels: 2,
                    };
                    source.capture_frame(&frame).await.map_err(|error| error.to_string())?;
                    audio_ready = true;
                }
            }
            frame = receive_optional(&mut video_receiver) => {
                let Some(frame) = frame else {
                    video_receiver = None;
                    continue;
                };
                if let Some(source) = video_source.as_ref() {
                    capture_desktop_frame(source, frame);
                    video_ready = true;
                }
            }
        }
        if audio_ready && video_ready {
            if let Some(sender) = ready.take() {
                let _ = sender.send(Ok(()));
            }
        }
    }
    if let Some(sender) = ready.take() {
        let _ = sender.send(Err("Нативный захват завершился до первого кадра".to_owned()));
    }
    if let Some(capture) = audio_capture {
        capture
            .join()
            .map_err(|_| "Поток аудиозахвата завершился аварийно".to_owned())??;
    }
    if let Some(capture) = video_capture {
        capture
            .join()
            .map_err(|_| "Поток видеозахвата завершился аварийно".to_owned())??;
    }
    room.close().await.map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(target_os = "windows")]
async fn receive_optional<T>(receiver: &mut Option<tokio::sync::mpsc::Receiver<T>>) -> Option<T> {
    match receiver {
        Some(receiver) => receiver.recv().await,
        None => std::future::pending().await,
    }
}

#[cfg(not(target_os = "windows"))]
async fn publish_process_audio(
    _input: StartProcessAudioInput,
    ready: tokio::sync::oneshot::Sender<Result<(), String>>,
    _stop: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), String> {
    let _ = ready.send(Err(
        "Захват звука приложений поддерживается только в Windows".to_owned(),
    ));
    Err("Захват звука приложений поддерживается только в Windows".to_owned())
}
