use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum DesktopCaptureKind {
    Screen,
    Window,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCaptureSelection {
    pub id: String,
    pub kind: DesktopCaptureKind,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCaptureSource {
    pub id: String,
    pub kind: DesktopCaptureKind,
    pub title: String,
    pub process_id: Option<u32>,
    pub can_share_audio: bool,
    pub audio_active: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessAudioInput {
    #[serde(default)]
    pub process_id: Option<u32>,
    #[serde(default)]
    pub capture_source: Option<DesktopCaptureSelection>,
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

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkerCommand {
    ListSources {
        host_process_id: u32,
    },
    Start {
        input: StartProcessAudioInput,
        host_process_id: u32,
    },
    Stop {
        screen_session_id: String,
    },
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum WorkerEvent {
    Sources {
        sources: Vec<DesktopCaptureSource>,
    },
    Ready {
        screen_session_id: String,
    },
    Error {
        screen_session_id: Option<String>,
        message: String,
    },
}
