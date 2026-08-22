use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessAudioSource {
    pub process_id: u32,
    pub name: String,
    pub executable_path: Option<String>,
    pub active: bool,
}

#[cfg(target_os = "windows")]
fn process_details(process_id: u32) -> (String, Option<String>) {
    use windows::{
        core::PWSTR,
        Win32::{
            Foundation::CloseHandle,
            System::Threading::{
                OpenProcess, QueryFullProcessImageNameW, PROCESS_NAME_WIN32,
                PROCESS_QUERY_LIMITED_INFORMATION,
            },
        },
    };

    unsafe {
        let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, process_id) else {
            return (format!("Процесс {process_id}"), None);
        };
        let mut buffer = vec![0u16; 32_768];
        let mut length = buffer.len() as u32;
        let result = QueryFullProcessImageNameW(
            handle,
            PROCESS_NAME_WIN32,
            PWSTR(buffer.as_mut_ptr()),
            &mut length,
        );
        let _ = CloseHandle(handle);
        if result.is_err() || length == 0 {
            return (format!("Процесс {process_id}"), None);
        }
        let path = String::from_utf16_lossy(&buffer[..length as usize]);
        let name = std::path::Path::new(&path)
            .file_stem()
            .and_then(|value| value.to_str())
            .filter(|value| !value.is_empty())
            .unwrap_or("Приложение")
            .to_owned();
        (name, Some(path))
    }
}

#[cfg(target_os = "windows")]
pub fn list_process_audio_sources() -> Result<Vec<ProcessAudioSource>, String> {
    use std::collections::BTreeMap;
    use windows::{
        core::Interface,
        Win32::{
            Media::Audio::{
                eMultimedia, eRender, AudioSessionStateActive, IAudioSessionControl2,
                IAudioSessionManager2, IMMDeviceEnumerator, MMDeviceEnumerator,
            },
            System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
        },
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|error| error.to_string())?;
        let device = enumerator
            .GetDefaultAudioEndpoint(eRender, eMultimedia)
            .map_err(|error| error.to_string())?;
        let manager: IAudioSessionManager2 = device
            .Activate(CLSCTX_ALL, None)
            .map_err(|error| error.to_string())?;
        let sessions = manager
            .GetSessionEnumerator()
            .map_err(|error| error.to_string())?;
        let mut unique = BTreeMap::new();
        let current_process = std::process::id();

        for index in 0..sessions.GetCount().map_err(|error| error.to_string())? {
            let control = sessions
                .GetSession(index)
                .map_err(|error| error.to_string())?;
            let control2: IAudioSessionControl2 = match control.cast() {
                Ok(value) => value,
                Err(_) => continue,
            };
            if control2.IsSystemSoundsSession().is_ok() {
                continue;
            }
            let process_id = match control2.GetProcessId() {
                Ok(value) if value != 0 && value != current_process => value,
                _ => continue,
            };
            let active = control
                .GetState()
                .is_ok_and(|state| state == AudioSessionStateActive);
            let (name, executable_path) = process_details(process_id);
            unique
                .entry(process_id)
                .and_modify(|source: &mut ProcessAudioSource| source.active |= active)
                .or_insert(ProcessAudioSource {
                    process_id,
                    name,
                    executable_path,
                    active,
                });
        }

        let mut sources = unique.into_values().collect::<Vec<_>>();
        sources.sort_by(|left, right| {
            right
                .active
                .cmp(&left.active)
                .then_with(|| left.name.to_lowercase().cmp(&right.name.to_lowercase()))
        });
        Ok(sources)
    }
}

#[cfg(not(target_os = "windows"))]
pub fn list_process_audio_sources() -> Result<Vec<ProcessAudioSource>, String> {
    Ok(Vec::new())
}
