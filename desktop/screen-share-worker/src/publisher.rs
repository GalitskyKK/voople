use voople_screen_share_protocol::{DesktopCaptureKind, StartProcessAudioInput};

#[derive(Debug, PartialEq)]
struct NativeVideoPublishProfile {
    max_bitrate: u64,
    max_framerate: f64,
    low_bitrate: u64,
    low_framerate: f64,
    mid_bitrate: u64,
    mid_framerate: f64,
}

fn native_video_publish_profile(frame_rate: u32) -> NativeVideoPublishProfile {
    if frame_rate >= 60 {
        NativeVideoPublishProfile {
            max_bitrate: 8_000_000,
            max_framerate: 60.0,
            low_bitrate: 900_000,
            low_framerate: 15.0,
            mid_bitrate: 2_500_000,
            mid_framerate: 30.0,
        }
    } else {
        NativeVideoPublishProfile {
            max_bitrate: 4_000_000,
            max_framerate: 30.0,
            low_bitrate: 500_000,
            low_framerate: 15.0,
            mid_bitrate: 1_500_000,
            mid_framerate: 30.0,
        }
    }
}

fn scaled_even(value: u32, divisor: u32) -> u32 {
    ((value / divisor).max(2)) & !1
}

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

fn capture_desktop_frame(
    source: &livekit::webrtc::video_source::native::NativeVideoSource,
    frame: crate::desktop_capture::DesktopCaptureFrame,
    target_width: u32,
    target_height: u32,
) {
    use livekit::webrtc::{
        native::yuv_helper,
        prelude::{I420Buffer, VideoFrame, VideoRotation},
    };

    if frame.width <= 0 || frame.height <= 0 {
        return;
    }

    let source_width = frame.width as u32;
    let source_height = frame.height as u32;
    let mut buffer = I420Buffer::new(source_width, source_height);
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

    let output = if source_width != target_width || source_height != target_height {
        buffer.scale(target_width as i32, target_height as i32)
    } else {
        buffer
    };

    source.capture_frame(&VideoFrame::new(VideoRotation::VideoRotation0, output));
}

pub async fn run_publish_session(
    input: StartProcessAudioInput,
    host_process_id: u32,
    ready: tokio::sync::oneshot::Sender<Result<(), String>>,
    mut stop: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), String> {
    use livekit::{
        options::{DegradationPreference, TrackPublishOptions, VideoEncoding, VideoPreset},
        prelude::{LocalAudioTrack, LocalTrack, LocalVideoTrack, TrackSource},
        webrtc::{
            audio_source::native::NativeAudioSource,
            prelude::{AudioSourceOptions, RtcAudioSource, RtcVideoSource, VideoResolution},
            video_source::native::NativeVideoSource,
        },
        Room, RoomOptions,
    };

    if input.process_id == Some(0)
        || input.capture_source.is_none()
        || input.token.is_empty()
        || input.livekit_url.is_empty()
        || input.screen_session_id.is_empty()
    {
        let message = "Некорректные параметры нативной демонстрации".to_owned();
        let _ = ready.send(Err(message.clone()));
        return Err(message);
    }

    let captures_system_audio = input
        .capture_source
        .as_ref()
        .is_some_and(|source| matches!(source.kind, DesktopCaptureKind::Screen));

    let selection = input.capture_source.clone().unwrap();
    let (sender, mut receiver) = tokio::sync::mpsc::channel(2);
    let video_capture =
        crate::desktop_capture::spawn_desktop_capture(selection, input.capture_frame_rate, sender);

    let first_frame_result = tokio::select! {
        _ = &mut stop => {
            video_capture.cancel();
            drop(receiver);
            video_capture.join()?;
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

    let first_video_frame = match first_frame_result {
        Ok(frame) => frame,
        Err(error) => {
            video_capture.cancel();
            drop(receiver);
            let _ = video_capture.join();
            let _ = ready.send(Err(error.clone()));
            return Err(error);
        }
    };

    let capture_resolution = fitted_capture_resolution(
        first_video_frame.width,
        first_video_frame.height,
        input.capture_width,
        input.capture_height,
    );

    let initialized = tokio::select! {
        _ = &mut stop => {
            video_capture.cancel();
            drop(receiver);
            video_capture.join()?;
            return Ok(());
        }
        initialized = async {
            let mut room_options = RoomOptions::default();
            room_options.auto_subscribe = false;

            let (room, _events) = Room::connect(
                &input.livekit_url,
                &input.token,
                room_options,
            )
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

            let video_source = NativeVideoSource::new(
                VideoResolution {
                    width: capture_resolution.0,
                    height: capture_resolution.1,
                },
                true,
            );

            let track = LocalVideoTrack::create_video_track(
                &format!("screen-video:{stream}"),
                RtcVideoSource::Native(video_source.clone()),
            );

            let publish_profile = native_video_publish_profile(input.capture_frame_rate);
            let low_width = scaled_even(capture_resolution.0, 4);
            let low_height = scaled_even(capture_resolution.1, 4);
            let mid_width = scaled_even(capture_resolution.0, 2);
            let mid_height = scaled_even(capture_resolution.1, 2);

            room.local_participant()
                .publish_track(
                    LocalTrack::Video(track),
                    TrackPublishOptions {
                        video_encoding: Some(VideoEncoding {
                            max_bitrate: publish_profile.max_bitrate,
                            max_framerate: publish_profile.max_framerate,
                        }),
                        simulcast: true,
                        simulcast_layers: Some(vec![
                            VideoPreset::new(
                                low_width,
                                low_height,
                                publish_profile.low_bitrate,
                                publish_profile.low_framerate,
                            ),
                            VideoPreset::new(
                                mid_width,
                                mid_height,
                                publish_profile.mid_bitrate,
                                publish_profile.mid_framerate,
                            ),
                        ]),
                        degradation_preference: Some(
                            DegradationPreference::MaintainResolution,
                        ),
                        source: TrackSource::Screenshare,
                        stream,
                        ..Default::default()
                    },
                )
                .await
                .map_err(|error| error.to_string())?;

            Ok::<_, String>((room, audio_source, video_source))
        } => initialized,
    };

    let (room, audio_source, video_source) = match initialized {
        Ok(value) => value,
        Err(error) => {
            video_capture.cancel();
            drop(receiver);
            let _ = video_capture.join();
            let _ = ready.send(Err(error.clone()));
            return Err(error);
        }
    };

    let audio_target = if captures_system_audio {
        Some(
            crate::process_audio_capture::ProcessLoopbackTarget::ExcludeProcessTree(
                host_process_id,
            ),
        )
    } else {
        input
            .process_id
            .map(crate::process_audio_capture::ProcessLoopbackTarget::IncludeProcessTree)
    };

    let (audio_capture, mut audio_receiver) = if let Some(target) = audio_target {
        let (sender, receiver) = tokio::sync::mpsc::channel::<Vec<i16>>(24);
        let capture = crate::process_audio_capture::spawn_process_loopback(target, sender);
        (Some(capture), Some(receiver))
    } else {
        (None, None)
    };

    let mut video_receiver = Some(receiver);
    let mut audio_ready = audio_source.is_none();
    let mut video_ready = false;
    let mut ready = Some(ready);

    capture_desktop_frame(
        &video_source,
        first_video_frame,
        capture_resolution.0,
        capture_resolution.1,
    );
    video_ready = true;

    while audio_receiver.is_some() || video_receiver.is_some() {
        tokio::select! {
            _ = &mut stop => {
                if let Some(capture) = audio_capture.as_ref() {
                    capture.cancel();
                }
                video_capture.cancel();

                // Drop receivers BEFORE joining. This unblocks any producer that is
                // currently inside blocking_send().
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

                    source
                        .capture_frame(&frame)
                        .await
                        .map_err(|error| error.to_string())?;
                    audio_ready = true;
                }
            }

            frame = receive_optional(&mut video_receiver) => {
                let Some(frame) = frame else {
                    video_receiver = None;
                    continue;
                };

                capture_desktop_frame(
                    &video_source,
                    frame,
                    capture_resolution.0,
                    capture_resolution.1,
                );
                video_ready = true;
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
        capture.cancel();
        capture.join()?;
    }

    video_capture.cancel();
    video_capture.join()?;

    eprintln!("[screen-share-worker] capture threads stopped");
    eprintln!("[screen-share-worker] closing LiveKit room");

    room.close().await.map_err(|error| error.to_string())?;

    eprintln!("[screen-share-worker] LiveKit room closed");
    Ok(())
}

async fn receive_optional<T>(receiver: &mut Option<tokio::sync::mpsc::Receiver<T>>) -> Option<T> {
    match receiver {
        Some(receiver) => receiver.recv().await,
        None => std::future::pending().await,
    }
}

#[cfg(test)]
mod tests {
    use super::{fitted_capture_resolution, native_video_publish_profile, scaled_even};

    #[test]
    fn keeps_landscape_ratio() {
        assert_eq!(
            fitted_capture_resolution(1_000, 700, 1_280, 720),
            (1_000, 700)
        );
    }

    #[test]
    fn fits_portrait_without_cropping() {
        assert_eq!(
            fitted_capture_resolution(900, 1_200, 1_280, 720),
            (540, 720)
        );
    }

    #[test]
    fn caps_large_sixteen_by_nine_source() {
        assert_eq!(
            fitted_capture_resolution(3_840, 2_160, 1_280, 720),
            (1_280, 720)
        );
    }

    #[test]
    fn fits_sixteen_by_ten_without_stretching() {
        assert_eq!(
            fitted_capture_resolution(1_920, 1_200, 1_280, 720),
            (1_152, 720)
        );
    }

    #[test]
    fn standard_publish_profile_is_full_rate_720p() {
        let profile = native_video_publish_profile(30);
        assert_eq!(profile.max_bitrate, 4_000_000);
        assert_eq!(profile.max_framerate, 30.0);
    }

    #[test]
    fn plus_publish_profile_is_full_rate_1080p() {
        let profile = native_video_publish_profile(60);
        assert_eq!(profile.max_bitrate, 8_000_000);
        assert_eq!(profile.max_framerate, 60.0);
    }

    #[test]
    fn simulcast_dimensions_remain_even() {
        assert_eq!(scaled_even(1_728, 2), 864);
        assert_eq!(scaled_even(1_080, 4), 270);
    }
}
