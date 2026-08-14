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

struct PublisherTask { handle: tauri::async_runtime::JoinHandle<()> }

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
        let mut tasks = self.0.lock().map_err(|_| "Состояние аудиозахвата недоступно")?;
        if let Some(previous) = tasks.insert(task_id, PublisherTask { handle }) {
            previous.handle.abort();
        }
        Ok(())
    }

    pub fn stop(&self, screen_session_id: &str) -> Result<(), String> {
        let mut tasks = self.0.lock().map_err(|_| "Состояние аудиозахвата недоступно")?;
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

    let (room, mut events) = Room::connect(
        &input.livekit_url,
        &input.token,
        RoomOptions { auto_subscribe: false, ..Default::default() },
    )
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
            TrackPublishOptions { source: TrackSource::ScreenshareAudio, ..Default::default() },
        )
        .await
        .map_err(|error| error.to_string())?;

    let (sender, mut receiver) = tokio::sync::mpsc::channel::<Vec<i16>>(24);
    let process_id = input.process_id;
    let capture = std::thread::spawn(move || capture_process_loopback(process_id, sender));
    while let Some(samples) = receiver.recv().await {
        let frame = livekit::webrtc::prelude::AudioFrame {
            samples_per_channel: (samples.len() / 2) as u32,
            data: samples.into(),
            sample_rate: 48_000,
            num_channels: 2,
        };
        source.capture_frame(&frame).await.map_err(|error| error.to_string())?;
    }
    capture.join().map_err(|_| "Поток аудиозахвата завершился аварийно".to_owned())??;
    room.close().await.map_err(|error| error.to_string())?;
    while events.recv().await.is_some() {}
    Ok(())
}

#[cfg(target_os = "windows")]
fn capture_process_loopback(
    process_id: u32,
    sender: tokio::sync::mpsc::Sender<Vec<i16>>,
) -> Result<(), String> {
    use std::{mem::size_of, sync::mpsc, time::Duration};
    use windows::{
        core::{implement, Interface},
        Win32::{
            Media::Audio::{
                ActivateAudioInterfaceAsync, IActivateAudioInterfaceAsyncOperation,
                IActivateAudioInterfaceCompletionHandler,
                IActivateAudioInterfaceCompletionHandler_Impl, IAudioCaptureClient, IAudioClient,
                AUDIOCLIENT_ACTIVATION_PARAMS, AUDIOCLIENT_ACTIVATION_PARAMS_0,
                AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK, AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS,
                AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM, AUDCLNT_STREAMFLAGS_LOOPBACK,
                PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
                VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK, WAVEFORMATEX, WAVE_FORMAT_PCM,
            },
            System::{
                Com::{BLOB, CoInitializeEx, COINIT_MULTITHREADED},
                Com::StructuredStorage::{PROPVARIANT, PROPVARIANT_0, PROPVARIANT_0_0, PROPVARIANT_0_0_0},
                Variant::VT_BLOB,
            },
        },
    };

    #[implement(IActivateAudioInterfaceCompletionHandler)]
    struct CompletionHandler { sender: mpsc::Sender<Result<IAudioClient, String>> }

    impl IActivateAudioInterfaceCompletionHandler_Impl for CompletionHandler_Impl {
        fn ActivateCompleted(&self, operation: windows::core::Ref<'_, IActivateAudioInterfaceAsyncOperation>) -> windows::core::Result<()> {
            let result = unsafe {
                let mut activation_result = windows::core::HRESULT::default();
                let mut interface = None;
                operation.unwrap().GetActivateResult(&mut activation_result, &mut interface)?;
                activation_result.ok()?;
                interface.ok_or_else(|| windows::core::Error::from_hresult(windows::core::HRESULT(0x80004005u32 as i32)))?.cast::<IAudioClient>()
            };
            let _ = self.sender.send(result.map_err(|error| error.to_string()));
            Ok(())
        }
    }

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let mut activation = AUDIOCLIENT_ACTIVATION_PARAMS {
            ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
            Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 {
                ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
                    TargetProcessId: process_id,
                    ProcessLoopbackMode: PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
                },
            },
        };
        let variant = PROPVARIANT {
            Anonymous: PROPVARIANT_0 {
                Anonymous: std::mem::ManuallyDrop::new(PROPVARIANT_0_0 {
                    vt: VT_BLOB,
                    wReserved1: 0,
                    wReserved2: 0,
                    wReserved3: 0,
                    Anonymous: PROPVARIANT_0_0_0 {
                        blob: BLOB {
                            cbSize: size_of::<AUDIOCLIENT_ACTIVATION_PARAMS>() as u32,
                            pBlobData: (&mut activation as *mut AUDIOCLIENT_ACTIVATION_PARAMS).cast(),
                        },
                    },
                }),
            },
        };
        let (activation_sender, activation_receiver) = mpsc::channel();
        let handler: IActivateAudioInterfaceCompletionHandler = CompletionHandler { sender: activation_sender }.into();
        let operation = ActivateAudioInterfaceAsync(
            VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
            &IAudioClient::IID,
            Some(&variant),
            &handler,
        ).map_err(|error| error.to_string())?;
        let client = activation_receiver
            .recv_timeout(Duration::from_secs(10))
            .map_err(|_| "Windows не подтвердил захват звука за 10 секунд".to_owned())??;
        drop(operation);

        let format = WAVEFORMATEX {
            wFormatTag: WAVE_FORMAT_PCM as u16,
            nChannels: 2,
            nSamplesPerSec: 48_000,
            nAvgBytesPerSec: 48_000 * 2 * 2,
            nBlockAlign: 4,
            wBitsPerSample: 16,
            cbSize: 0,
        };
        client.Initialize(
            AUDCLNT_SHAREMODE_SHARED,
            AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
            0,
            0,
            &format,
            None,
        ).map_err(|error| error.to_string())?;
        let capture: IAudioCaptureClient = client.GetService().map_err(|error| error.to_string())?;
        client.Start().map_err(|error| error.to_string())?;

        loop {
            let mut packet_frames = capture.GetNextPacketSize().map_err(|error| error.to_string())?;
            if packet_frames == 0 {
                std::thread::sleep(Duration::from_millis(4));
                continue;
            }
            while packet_frames > 0 {
                let mut data = std::ptr::null_mut();
                let mut frames = 0u32;
                let mut flags = 0u32;
                capture.GetBuffer(&mut data, &mut frames, &mut flags, None, None).map_err(|error| error.to_string())?;
                let samples = if (flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32) != 0 {
                    vec![0i16; frames as usize * 2]
                } else {
                    std::slice::from_raw_parts(data.cast::<i16>(), frames as usize * 2).to_vec()
                };
                capture.ReleaseBuffer(frames).map_err(|error| error.to_string())?;
                if sender.blocking_send(samples).is_err() {
                    let _ = client.Stop();
                    return Ok(());
                }
                packet_frames = capture.GetNextPacketSize().map_err(|error| error.to_string())?;
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
async fn publish_process_audio(_input: StartProcessAudioInput) -> Result<(), String> {
    Err("Захват звука приложений поддерживается только в Windows".to_owned())
}
