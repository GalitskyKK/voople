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
pub(crate) fn process_details(process_id: u32) -> (String, Option<String>) {
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
pub(crate) fn voople_process_tree() -> std::collections::HashSet<u32> {
    use std::collections::{HashMap, HashSet, VecDeque};
    use windows::Win32::{
        Foundation::CloseHandle,
        System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Process32FirstW, Process32NextW, PROCESSENTRY32W,
            TH32CS_SNAPPROCESS,
        },
    };

    let root = std::process::id();
    let mut excluded = HashSet::from([root]);
    unsafe {
        let Ok(snapshot) = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) else {
            return excluded;
        };
        let mut entry = PROCESSENTRY32W {
            dwSize: std::mem::size_of::<PROCESSENTRY32W>() as u32,
            ..Default::default()
        };
        let mut children = HashMap::<u32, Vec<u32>>::new();
        if Process32FirstW(snapshot, &mut entry).is_ok() {
            loop {
                children
                    .entry(entry.th32ParentProcessID)
                    .or_default()
                    .push(entry.th32ProcessID);
                if Process32NextW(snapshot, &mut entry).is_err() {
                    break;
                }
            }
        }
        let _ = CloseHandle(snapshot);
        let mut pending = VecDeque::from([root]);
        while let Some(parent) = pending.pop_front() {
            for child in children.get(&parent).into_iter().flatten() {
                if excluded.insert(*child) {
                    pending.push_back(*child);
                }
            }
        }
    }
    excluded
}

#[cfg(target_os = "windows")]
pub fn list_process_audio_sources() -> Result<Vec<ProcessAudioSource>, String> {
    use std::collections::BTreeMap;
    use windows::{
        core::Interface,
        Win32::{
            Media::Audio::{
                eRender, AudioSessionStateActive, IAudioSessionControl2, IAudioSessionManager2,
                IMMDeviceEnumerator, MMDeviceEnumerator, DEVICE_STATE_ACTIVE,
            },
            System::Com::{CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED},
        },
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)
                .map_err(|error| error.to_string())?;
        let devices = enumerator
            .EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)
            .map_err(|error| error.to_string())?;
        let mut unique = BTreeMap::new();
        let excluded_processes = voople_process_tree();

        for device_index in 0..devices.GetCount().map_err(|error| error.to_string())? {
            let device = devices
                .Item(device_index)
                .map_err(|error| error.to_string())?;
            let manager: IAudioSessionManager2 = device
                .Activate(CLSCTX_ALL, None)
                .map_err(|error| error.to_string())?;
            let sessions = manager
                .GetSessionEnumerator()
                .map_err(|error| error.to_string())?;

            for session_index in 0..sessions.GetCount().map_err(|error| error.to_string())? {
                let control = sessions
                    .GetSession(session_index)
                    .map_err(|error| error.to_string())?;
                let control2: IAudioSessionControl2 = match control.cast() {
                    Ok(value) => value,
                    Err(_) => continue,
                };
                // IsSystemSoundsSession returns S_OK for the system session and
                // S_FALSE for every regular application. `is_ok()` treats both
                // HRESULTs as success and used to discard every normal source.
                if control2.IsSystemSoundsSession() == windows_core::HRESULT(0) {
                    continue;
                }
                let process_id = match control2.GetProcessId() {
                    Ok(value) if value != 0 && !excluded_processes.contains(&value) => value,
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
