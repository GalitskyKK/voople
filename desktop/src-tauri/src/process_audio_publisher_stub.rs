use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessAudioInput {
    #[serde(default)]
    pub process_id: Option<u32>,
    #[serde(default)]
    pub capture_source: Option<crate::desktop_capture::DesktopCaptureSelection>,
    #[serde(default)]
    pub capture_width: Option<u32>,
    #[serde(default)]
    pub capture_height: Option<u32>,
    #[serde(default)]
    pub capture_frame_rate: Option<u32>,
    pub livekit_url: String,
    pub token: String,
    pub screen_session_id: String,
}

#[derive(Default)]
pub struct ProcessAudioPublishers;

impl ProcessAudioPublishers {
    pub async fn start(&self, input: StartProcessAudioInput) -> Result<(), String> {
        // Read every field so disabled-feature builds still validate the IPC shape.
        let _ = (
            input.process_id,
            input.capture_source.map(|source| (source.id, source.kind)),
            input.capture_width,
            input.capture_height,
            input.capture_frame_rate,
            input.livekit_url,
            input.token,
            input.screen_session_id,
        );
        Err("Native process audio publisher is not included in this build".to_owned())
    }

    pub fn stop(&self, _screen_session_id: &str) -> Result<(), String> {
        Ok(())
    }
}
