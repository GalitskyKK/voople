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

struct PublisherTask {
    handle: tauri::async_runtime::JoinHandle<()>,
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
        let handle = tauri::async_runtime::spawn(async move {
            if let Err(error) = publish_process_audio(input, ready_tx).await {
                eprintln!("process audio publisher stopped: {error}");
            }
        });
        {
            let mut tasks = self
                .0
                .lock()
                .map_err(|_| "Состояние аудиозахвата недоступно")?;
            if let Some(previous) = tasks.insert(task_id, PublisherTask { handle }) {
                previous.handle.abort();
            }
        }
        let ready = match tokio::time::timeout(std::time::Duration::from_secs(12), ready_rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err("Аудиомодуль завершился до публикации трека".to_owned()),
            Err(_) => Err("Аудиомодуль не подтвердил публикацию трека за 12 секунд".to_owned()),
        };
        if let Err(error) = ready {
            let _ = self.stop(&session_id);
            return Err(error);
        }
        Ok(())
    }

    pub fn stop(&self, screen_session_id: &str) -> Result<(), String> {
        let mut tasks = self
            .0
            .lock()
            .map_err(|_| "Состояние аудиозахвата недоступно")?;
        if let Some(task) = tasks.remove(screen_session_id) {
            task.handle.abort();
        }
        Ok(())
    }
}

#[cfg(target_os = "windows")]
async fn publish_process_audio(
    input: StartProcessAudioInput,
    ready: tokio::sync::oneshot::Sender<Result<(), String>>,
) -> Result<(), String> {
    use livekit::{
        options::TrackPublishOptions,
        prelude::{LocalAudioTrack, LocalTrack, LocalVideoTrack, TrackSource},
        webrtc::{
            audio_source::native::NativeAudioSource,
            native::yuv_helper,
            prelude::{
                AudioSourceOptions, I420Buffer, RtcAudioSource, RtcVideoSource, VideoFrame,
                VideoResolution, VideoRotation,
            },
            video_source::native::NativeVideoSource,
        },
        Room, RoomOptions,
    };

    let initialized = async {
        let mut room_options = RoomOptions::default();
        room_options.auto_subscribe = false;
        let (room, _events) = Room::connect(&input.livekit_url, &input.token, room_options)
            .await
            .map_err(|error| error.to_string())?;
        let room = std::sync::Arc::new(room);
        let stream = input.screen_session_id.clone();
        let captures_system_audio = input.capture_source.as_ref().is_some_and(|source| {
            matches!(
                source.kind,
                crate::desktop_capture::DesktopCaptureKind::Screen
            )
        });
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
        let video_source = input.capture_source.as_ref().map(|_| {
            NativeVideoSource::new(
                VideoResolution {
                    width: input.capture_width.clamp(320, 3840),
                    height: input.capture_height.clamp(180, 2160),
                },
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
    }
    .await;
    let (room, audio_source, video_source, captures_system_audio) = match initialized {
        Ok(value) => value,
        Err(error) => {
            let _ = ready.send(Err(error.clone()));
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
    let (video_capture, mut video_receiver) = if let Some(selection) = input.capture_source {
        let (sender, receiver) = tokio::sync::mpsc::channel(2);
        let capture = crate::desktop_capture::spawn_desktop_capture(
            selection,
            input.capture_frame_rate,
            sender,
        );
        (Some(capture), Some(receiver))
    } else {
        (None, None)
    };
    let mut audio_ready = audio_source.is_none();
    let mut video_ready = video_source.is_none();
    let mut ready = Some(ready);

    while audio_receiver.is_some() || video_receiver.is_some() {
        tokio::select! {
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
                if frame.width <= 0 || frame.height <= 0 {
                    continue;
                }
                if let Some(source) = video_source.as_ref() {
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
) -> Result<(), String> {
    let _ = ready.send(Err(
        "Захват звука приложений поддерживается только в Windows".to_owned(),
    ));
    Err("Захват звука приложений поддерживается только в Windows".to_owned())
}
