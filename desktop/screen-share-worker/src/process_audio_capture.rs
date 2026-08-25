use std::{
    mem::size_of,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc,
        Arc,
    },
    time::{Duration, Instant},
};

use windows::Win32::{
    Media::Audio::{
        ActivateAudioInterfaceAsync, IActivateAudioInterfaceAsyncOperation,
        IActivateAudioInterfaceCompletionHandler, IActivateAudioInterfaceCompletionHandler_Impl,
        IAudioCaptureClient, IAudioClient, AUDCLNT_BUFFERFLAGS_SILENT, AUDCLNT_SHAREMODE_SHARED,
        AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM, AUDCLNT_STREAMFLAGS_LOOPBACK,
        AUDIOCLIENT_ACTIVATION_PARAMS, AUDIOCLIENT_ACTIVATION_PARAMS_0,
        AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK, AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS,
        PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE,
        PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE, VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
        WAVEFORMATEX, WAVE_FORMAT_PCM,
    },
    System::{
        Com::StructuredStorage::{PROPVARIANT, PROPVARIANT_0, PROPVARIANT_0_0, PROPVARIANT_0_0_0},
        Com::{CoInitializeEx, BLOB, COINIT_MULTITHREADED},
        Variant::VT_BLOB,
    },
};
use windows_core::{implement, Interface};

pub(crate) enum ProcessLoopbackTarget {
    IncludeProcessTree(u32),
    ExcludeProcessTree(u32),
}

pub struct ProcessAudioCaptureHandle {
    running: Arc<AtomicBool>,
    thread: std::thread::Thread,
    join: Option<std::thread::JoinHandle<Result<(), String>>>,
}

impl ProcessAudioCaptureHandle {
    pub fn cancel(&self) {
        self.running.store(false, Ordering::Release);
        self.thread.unpark();
    }

    pub fn join(mut self) -> Result<(), String> {
        self.cancel();
        self.join
            .take()
            .expect("process audio capture thread is missing")
            .join()
            .map_err(|_| "Поток аудиозахвата завершился аварийно".to_owned())?
    }
}

#[implement(IActivateAudioInterfaceCompletionHandler)]
struct CompletionHandler {
    sender: mpsc::Sender<Result<IAudioClient, String>>,
}

impl IActivateAudioInterfaceCompletionHandler_Impl for CompletionHandler_Impl {
    fn ActivateCompleted(
        &self,
        operation: windows_core::Ref<'_, IActivateAudioInterfaceAsyncOperation>,
    ) -> windows_core::Result<()> {
        let result = unsafe {
            let mut activation_result = windows_core::HRESULT::default();
            let mut interface = None;
            operation
                .unwrap()
                .GetActivateResult(&mut activation_result, &mut interface)?;
            activation_result.ok()?;
            interface
                .ok_or_else(|| {
                    windows_core::Error::from_hresult(windows_core::HRESULT(0x80004005u32 as i32))
                })?
                .cast::<IAudioClient>()
        };
        let _ = self.sender.send(result.map_err(|error| error.to_string()));
        Ok(())
    }
}

pub fn spawn_process_loopback(
    target: ProcessLoopbackTarget,
    sender: tokio::sync::mpsc::Sender<Vec<i16>>,
) -> ProcessAudioCaptureHandle {
    let running = Arc::new(AtomicBool::new(true));
    let thread_running = running.clone();

    let join = std::thread::spawn(move || {
        capture_process_loopback(target, sender, thread_running)
    });

    let thread = join.thread().clone();
    ProcessAudioCaptureHandle {
        running,
        thread,
        join: Some(join),
    }
}

fn capture_process_loopback(
    target: ProcessLoopbackTarget,
    sender: tokio::sync::mpsc::Sender<Vec<i16>>,
    running: Arc<AtomicBool>,
) -> Result<(), String> {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);

        let (process_id, loopback_mode) = match target {
            ProcessLoopbackTarget::IncludeProcessTree(process_id) => (
                process_id,
                PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE,
            ),
            ProcessLoopbackTarget::ExcludeProcessTree(process_id) => (
                process_id,
                PROCESS_LOOPBACK_MODE_EXCLUDE_TARGET_PROCESS_TREE,
            ),
        };

        let mut activation = AUDIOCLIENT_ACTIVATION_PARAMS {
            ActivationType: AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK,
            Anonymous: AUDIOCLIENT_ACTIVATION_PARAMS_0 {
                ProcessLoopbackParams: AUDIOCLIENT_PROCESS_LOOPBACK_PARAMS {
                    TargetProcessId: process_id,
                    ProcessLoopbackMode: loopback_mode,
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
                            pBlobData: (&mut activation as *mut AUDIOCLIENT_ACTIVATION_PARAMS)
                                .cast(),
                        },
                    },
                }),
            },
        };

        let (activation_sender, activation_receiver) = mpsc::channel();
        let handler: IActivateAudioInterfaceCompletionHandler = CompletionHandler {
            sender: activation_sender,
        }
        .into();

        let operation = ActivateAudioInterfaceAsync(
            VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
            &IAudioClient::IID,
            Some(&variant),
            &handler,
        )
        .map_err(|error| error.to_string())?;

        let activation_deadline = Instant::now() + Duration::from_secs(10);
        let client = loop {
            if !running.load(Ordering::Acquire) {
                drop(operation);
                return Ok(());
            }

            match activation_receiver.recv_timeout(Duration::from_millis(100)) {
                Ok(result) => break result?,
                Err(mpsc::RecvTimeoutError::Timeout) if Instant::now() < activation_deadline => {
                    continue;
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {
                    return Err("Windows не подтвердил захват звука за 10 секунд".to_owned());
                }
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    return Err("Windows закрыл инициализацию захвата звука".to_owned());
                }
            }
        };
        drop(operation);

        if !running.load(Ordering::Acquire) {
            return Ok(());
        }

        let format = WAVEFORMATEX {
            wFormatTag: WAVE_FORMAT_PCM as u16,
            nChannels: 2,
            nSamplesPerSec: 48_000,
            nAvgBytesPerSec: 48_000 * 2 * 2,
            nBlockAlign: 4,
            wBitsPerSample: 16,
            cbSize: 0,
        };

        client
            .Initialize(
                AUDCLNT_SHAREMODE_SHARED,
                AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
                0,
                0,
                &format,
                None,
            )
            .map_err(|error| error.to_string())?;

        let capture: IAudioCaptureClient =
            client.GetService().map_err(|error| error.to_string())?;

        client.Start().map_err(|error| error.to_string())?;

        if sender.blocking_send(vec![0i16; 480 * 2]).is_err() {
            let _ = client.Stop();
            return Ok(());
        }

        while running.load(Ordering::Acquire) {
            let mut packet_frames = capture
                .GetNextPacketSize()
                .map_err(|error| error.to_string())?;

            if packet_frames == 0 {
                std::thread::park_timeout(Duration::from_millis(4));
                continue;
            }

            while packet_frames > 0 && running.load(Ordering::Acquire) {
                let mut data = std::ptr::null_mut();
                let mut frames = 0u32;
                let mut flags = 0u32;

                capture
                    .GetBuffer(&mut data, &mut frames, &mut flags, None, None)
                    .map_err(|error| error.to_string())?;

                let samples = if (flags & AUDCLNT_BUFFERFLAGS_SILENT.0 as u32) != 0 {
                    vec![0i16; frames as usize * 2]
                } else {
                    std::slice::from_raw_parts(data.cast::<i16>(), frames as usize * 2).to_vec()
                };

                capture
                    .ReleaseBuffer(frames)
                    .map_err(|error| error.to_string())?;

                if sender.blocking_send(samples).is_err() {
                    let _ = client.Stop();
                    return Ok(());
                }

                packet_frames = capture
                    .GetNextPacketSize()
                    .map_err(|error| error.to_string())?;
            }
        }

        let _ = client.Stop();
        Ok(())
    }
}
