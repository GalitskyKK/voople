use std::{mem::size_of, sync::mpsc, time::Duration};

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

#[cfg_attr(not(feature = "process-audio-publisher"), allow(dead_code))]
pub(crate) enum ProcessLoopbackTarget {
    IncludeProcessTree(u32),
    ExcludeProcessTree(u32),
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

#[cfg_attr(not(feature = "process-audio-publisher"), allow(dead_code))]
pub(crate) fn capture_process_loopback(
    target: ProcessLoopbackTarget,
    sender: tokio::sync::mpsc::Sender<Vec<i16>>,
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
        // Confirm that WASAPI activation and the LiveKit producer path are
        // ready even while the selected application is temporarily silent.
        // Real packets replace this 10 ms silent probe as soon as playback starts.
        if sender.blocking_send(vec![0i16; 480 * 2]).is_err() {
            let _ = client.Stop();
            return Ok(());
        }

        loop {
            let mut packet_frames = capture
                .GetNextPacketSize()
                .map_err(|error| error.to_string())?;
            if packet_frames == 0 {
                std::thread::sleep(Duration::from_millis(4));
                continue;
            }
            while packet_frames > 0 {
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
    }
}
