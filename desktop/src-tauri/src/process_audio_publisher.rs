use serde::Deserialize;
use std::{collections::HashMap, sync::Mutex};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessAudioInput {
    pub process_id: u32,
    pub livekit_url: String,
    pub token: String,
    pub screen_session_id: String,
}

struct PublisherTask {
    handle: tauri::async_runtime::JoinHandle<()>,
}

#[derive(Default)]
pub struct ProcessAudioPublishers(Mutex<HashMap<String, PublisherTask>>);

impl ProcessAudioPublishers {
    pub fn start(&self, input: StartProcessAudioInput) -> Result<(), String> {
        if input.process_id == 0 || input.token.is_empty() || input.livekit_url.is_empty() {
            return Err("Некорректные параметры звука демонстрации".to_owned());
        }
        let session_id = input.screen_session_id.clone();
        let task_id = session_id.clone();
        let handle = tauri::async_runtime::spawn(async move {
            if let Err(error) = publish_process_audio(input).await {
                eprintln!("process audio publisher stopped: {error}");
            }
        });
        let mut tasks = self
            .0
            .lock()
            .map_err(|_| "Состояние аудиозахвата недоступно")?;
        if let Some(previous) = tasks.insert(task_id, PublisherTask { handle }) {
            previous.handle.abort();
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
async fn publish_process_audio(input: StartProcessAudioInput) -> Result<(), String> {
    use livekit::{
        options::TrackPublishOptions,
        prelude::{LocalAudioTrack, LocalTrack, TrackSource},
        webrtc::{
            audio_source::native::NativeAudioSource,
            prelude::{AudioSourceOptions, RtcAudioSource},
        },
        Room, RoomOptions,
    };

    let mut room_options = RoomOptions::default();
    room_options.auto_subscribe = false;
    let (room, mut events) = Room::connect(&input.livekit_url, &input.token, room_options)
        .await
        .map_err(|error| error.to_string())?;
    let room = std::sync::Arc::new(room);
    let source = NativeAudioSource::new(AudioSourceOptions::default(), 48_000, 2, 100);
    let track = LocalAudioTrack::create_audio_track(
        &format!("screen-audio:{}", input.screen_session_id),
        RtcAudioSource::Native(source.clone()),
    );
    room.local_participant()
        .publish_track(
            LocalTrack::Audio(track),
            TrackPublishOptions {
                source: TrackSource::ScreenshareAudio,
                ..Default::default()
            },
        )
        .await
        .map_err(|error| error.to_string())?;

    let (sender, mut receiver) = tokio::sync::mpsc::channel::<Vec<i16>>(24);
    let process_id = input.process_id;
    let capture = std::thread::spawn(move || {
        crate::process_audio_capture::capture_process_loopback(process_id, sender)
    });
    while let Some(samples) = receiver.recv().await {
        let frame = livekit::webrtc::prelude::AudioFrame {
            samples_per_channel: (samples.len() / 2) as u32,
            data: samples.into(),
            sample_rate: 48_000,
            num_channels: 2,
        };
        source
            .capture_frame(&frame)
            .await
            .map_err(|error| error.to_string())?;
    }
    capture
        .join()
        .map_err(|_| "Поток аудиозахвата завершился аварийно".to_owned())??;
    room.close().await.map_err(|error| error.to_string())?;
    while events.recv().await.is_some() {}
    Ok(())
}

#[cfg(not(target_os = "windows"))]
async fn publish_process_audio(_input: StartProcessAudioInput) -> Result<(), String> {
    Err("Захват звука приложений поддерживается только в Windows".to_owned())
}
