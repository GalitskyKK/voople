use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartProcessAudioInput {
    pub process_id: u32,
    pub livekit_url: String,
    pub token: String,
    pub screen_session_id: String,
}

#[derive(Default)]
pub struct ProcessAudioPublishers;

impl ProcessAudioPublishers {
    pub fn start(&self, input: StartProcessAudioInput) -> Result<(), String> {
        // Read every field so disabled-feature builds still validate the IPC shape.
        let _ = (
            input.process_id,
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
