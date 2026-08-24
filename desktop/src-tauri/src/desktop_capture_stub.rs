use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DesktopCaptureKind {
    Screen,
    Window,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCaptureSelection {
    pub id: String,
    pub kind: DesktopCaptureKind,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopCaptureSource {
    pub id: String,
    pub kind: DesktopCaptureKind,
    pub title: String,
    pub process_id: Option<u32>,
    pub can_share_audio: bool,
    pub audio_active: bool,
}

pub fn list_desktop_capture_sources() -> Result<Vec<DesktopCaptureSource>, String> {
    Ok(Vec::new())
}
