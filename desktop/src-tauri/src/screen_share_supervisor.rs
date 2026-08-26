use std::{
    collections::VecDeque,
    sync::Arc,
    time::Duration,
};

use tauri::AppHandle;
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};
use tokio::sync::{oneshot, watch, Mutex};
use voople_screen_share_protocol::{
    DesktopCaptureSource, StartProcessAudioInput, WorkerCommand, WorkerEvent,
};

const SIDECAR_NAME: &str = "voople-screen-share-worker";
const SOURCE_TIMEOUT: Duration = Duration::from_secs(15);
const START_TIMEOUT: Duration = Duration::from_secs(15);
const STOP_TIMEOUT: Duration = Duration::from_millis(1_500);
const KILL_CONFIRM_TIMEOUT: Duration = Duration::from_secs(2);
const CANCELLED_SESSION_CACHE: usize = 64;

#[derive(Clone)]
struct WorkerProcess {
    child: Arc<Mutex<Option<CommandChild>>>,
    terminated: watch::Receiver<bool>,
}

#[derive(Clone)]
struct ActiveWorker {
    screen_session_id: String,
    process: WorkerProcess,
}

#[derive(Default)]
struct SupervisorState {
    active: Option<ActiveWorker>,
    cancelled_sessions: VecDeque<String>,
}

pub struct ScreenShareSupervisor {
    // Serializes START requests, but does not block STOP while START is waiting for READY.
    start_gate: Mutex<()>,
    // Serializes "old worker is gone -> new worker is spawned" transitions.
    shutdown_gate: Mutex<()>,
    state: Arc<Mutex<SupervisorState>>,
}

impl Default for ScreenShareSupervisor {
    fn default() -> Self {
        Self {
            start_gate: Mutex::new(()),
            shutdown_gate: Mutex::new(()),
            state: Arc::new(Mutex::new(SupervisorState::default())),
        }
    }
}

impl ScreenShareSupervisor {
    pub async fn list_sources(
        &self,
        app: &AppHandle,
    ) -> Result<Vec<DesktopCaptureSource>, String> {
        let (mut events, mut child) = app
            .shell()
            .sidecar(SIDECAR_NAME)
            .map_err(|error| format!("Screen-share worker is unavailable: {error}"))?
            .spawn()
            .map_err(|error| format!("Failed to start screen-share worker: {error}"))?;

        write_command(
            &mut child,
            &WorkerCommand::ListSources {
                host_process_id: std::process::id(),
            },
        )?;

        let mut sources: Option<Vec<DesktopCaptureSource>> = None;

        let result = tokio::time::timeout(SOURCE_TIMEOUT, async {
            while let Some(event) = events.recv().await {
                match event {
                    CommandEvent::Stdout(bytes) => {
                        let line = String::from_utf8(bytes)
                            .map_err(|error| format!("Worker stdout is not UTF-8: {error}"))?;
                        match serde_json::from_str::<WorkerEvent>(line.trim()) {
                            Ok(WorkerEvent::Sources { sources: value }) => {
                                sources = Some(value);
                            }
                            Ok(WorkerEvent::Error { message, .. }) => return Err(message),
                            Ok(_) => {}
                            Err(error) => {
                                return Err(format!(
                                    "Invalid screen-share worker protocol: {error}"
                                ));
                            }
                        }
                    }
                    CommandEvent::Stderr(bytes) => {
                        eprintln!(
                            "[screen-share-worker] {}",
                            String::from_utf8_lossy(&bytes).trim()
                        );
                    }
                    CommandEvent::Error(error) => return Err(error),
                    CommandEvent::Terminated(payload) => {
                        if let Some(value) = sources.take() {
                            return Ok(value);
                        }
                        return Err(format!(
                            "Screen-share source worker terminated early (code: {:?})",
                            payload.code
                        ));
                    }
                    _ => {}
                }
            }

            sources.take().ok_or_else(|| {
                "Screen-share source worker closed without a response".to_owned()
            })
        })
        .await;

        match result {
            Ok(result) => result,
            Err(_) => {
                let _ = child.kill();
                Err("Screen-share source worker timed out".to_owned())
            }
        }
    }

    pub async fn start(
        &self,
        app: &AppHandle,
        input: StartProcessAudioInput,
    ) -> Result<(), String> {
        let _start_guard = self.start_gate.lock().await;
        let session_id = input.screen_session_id.clone();

        let _shutdown_guard = self.shutdown_gate.lock().await;

        let previous = {
            let mut state = self.state.lock().await;
            if take_cancelled(&mut state, &session_id) {
                return Err("Запуск демонстрации был отменён".to_owned());
            }
            state.active.take()
        };

        if let Some(previous) = previous {
            shutdown_worker(previous).await?;
        }

        {
            let mut state = self.state.lock().await;
            if take_cancelled(&mut state, &session_id) {
                return Err("Запуск демонстрации был отменён".to_owned());
            }
        }

        let (mut events, mut child) = app
            .shell()
            .sidecar(SIDECAR_NAME)
            .map_err(|error| format!("Screen-share worker is unavailable: {error}"))?
            .spawn()
            .map_err(|error| format!("Failed to start screen-share worker: {error}"))?;

        let worker_pid = child.pid();
        let (ready_tx, ready_rx) = oneshot::channel::<Result<(), String>>();
        let (terminated_tx, terminated_rx) = watch::channel(false);
        let child = Arc::new(Mutex::new(Some(child)));

        let process = WorkerProcess {
            child: child.clone(),
            terminated: terminated_rx,
        };
        let active = ActiveWorker {
            screen_session_id: session_id.clone(),
            process: process.clone(),
        };

        let state_for_events = self.state.clone();
        let event_session = session_id.clone();

        tauri::async_runtime::spawn(async move {
            let mut ready_tx = Some(ready_tx);

            while let Some(event) = events.recv().await {
                match event {
                    CommandEvent::Stdout(bytes) => {
                        let line = match String::from_utf8(bytes) {
                            Ok(line) => line,
                            Err(error) => {
                                if let Some(sender) = ready_tx.take() {
                                    let _ = sender.send(Err(format!(
                                        "Worker stdout is not UTF-8: {error}"
                                    )));
                                }
                                continue;
                            }
                        };

                        match serde_json::from_str::<WorkerEvent>(line.trim()) {
                            Ok(WorkerEvent::Ready { screen_session_id })
                                if screen_session_id == event_session =>
                            {
                                if let Some(sender) = ready_tx.take() {
                                    let _ = sender.send(Ok(()));
                                }
                            }

                            Ok(WorkerEvent::Error {
                                screen_session_id,
                                message,
                            }) if screen_session_id.as_deref() == Some(event_session.as_str())
                                || screen_session_id.is_none() =>
                            {
                                if let Some(sender) = ready_tx.take() {
                                    let _ = sender.send(Err(message.clone()));
                                } else {
                                    eprintln!(
                                        "[screen-share-worker:{event_session}] {message}"
                                    );
                                }
                            }

                            Ok(_) => {}

                            Err(error) => {
                                if let Some(sender) = ready_tx.take() {
                                    let _ = sender.send(Err(format!(
                                        "Invalid worker protocol: {error}"
                                    )));
                                }
                            }
                        }
                    }

                    CommandEvent::Stderr(bytes) => {
                        eprintln!(
                            "[screen-share-worker:{event_session}] {}",
                            String::from_utf8_lossy(&bytes).trim()
                        );
                    }

                    CommandEvent::Error(error) => {
                        if let Some(sender) = ready_tx.take() {
                            let _ = sender.send(Err(error.clone()));
                        }
                        eprintln!(
                            "[screen-share-worker:{event_session}] process error: {error}"
                        );
                    }

                    CommandEvent::Terminated(payload) => {
                        if let Some(sender) = ready_tx.take() {
                            let _ = sender.send(Err(format!(
                                "Screen-share worker terminated before READY (code: {:?})",
                                payload.code
                            )));
                        }
                        let _ = terminated_tx.send(true);
                        break;
                    }

                    _ => {}
                }
            }

            let _ = terminated_tx.send(true);

            let mut state = state_for_events.lock().await;
            if state
                .active
                .as_ref()
                .is_some_and(|worker| worker.screen_session_id == event_session)
            {
                state.active = None;
            }
        });

        {
            let mut state = self.state.lock().await;

            if take_cancelled(&mut state, &session_id) {
                drop(state);
                let cancelled = active.clone();
                drop(_shutdown_guard);
                shutdown_worker(cancelled).await?;
                return Err("Запуск демонстрации был отменён".to_owned());
            }

            state.active = Some(active.clone());
        }

        {
            let mut child = child.lock().await;
            let child = child
                .as_mut()
                .ok_or_else(|| "Screen-share worker is already terminated".to_owned())?;

            write_command(
                child,
                &WorkerCommand::Start {
                    input,
                    host_process_id: std::process::id(),
                },
            )?;
        }

        eprintln!(
            "[screen-share] worker started pid={worker_pid} session={session_id}"
        );

        // Important: STOP may proceed while START waits for READY.
        drop(_shutdown_guard);

        let ready = match tokio::time::timeout(START_TIMEOUT, ready_rx).await {
            Ok(Ok(result)) => result,
            Ok(Err(_)) => Err("Screen-share worker closed READY channel".to_owned()),
            Err(_) => Err("Screen-share worker did not become ready within 15 seconds".to_owned()),
        };

        if let Err(error) = ready {
            self.cleanup_failed_start(&session_id, active).await;
            return Err(error);
        }

        let still_active = {
            let state = self.state.lock().await;
            state
                .active
                .as_ref()
                .is_some_and(|worker| worker.screen_session_id == session_id)
        };

        if !still_active {
            return Err("Запуск демонстрации был отменён".to_owned());
        }

        Ok(())
    }

    pub async fn stop(&self, screen_session_id: &str) -> Result<(), String> {
        let _shutdown_guard = self.shutdown_gate.lock().await;

        let worker = {
            let mut state = self.state.lock().await;

            match state.active.as_ref() {
                Some(worker) if worker.screen_session_id == screen_session_id => {
                    state.active.take()
                }
                _ => {
                    remember_cancelled(&mut state, screen_session_id);
                    None
                }
            }
        };

        if let Some(worker) = worker {
            shutdown_worker(worker).await?;
        }

        Ok(())
    }

    async fn cleanup_failed_start(
        &self,
        session_id: &str,
        fallback: ActiveWorker,
    ) {
        let _shutdown_guard = self.shutdown_gate.lock().await;

        let worker = {
            let mut state = self.state.lock().await;
            if state
                .active
                .as_ref()
                .is_some_and(|worker| worker.screen_session_id == session_id)
            {
                state.active.take()
            } else {
                None
            }
        };

        let _ = shutdown_worker(worker.unwrap_or(fallback)).await;
    }
}

fn remember_cancelled(state: &mut SupervisorState, session_id: &str) {
    if state
        .cancelled_sessions
        .iter()
        .any(|value| value == session_id)
    {
        return;
    }

    state.cancelled_sessions.push_back(session_id.to_owned());

    while state.cancelled_sessions.len() > CANCELLED_SESSION_CACHE {
        state.cancelled_sessions.pop_front();
    }
}

fn take_cancelled(state: &mut SupervisorState, session_id: &str) -> bool {
    let Some(index) = state
        .cancelled_sessions
        .iter()
        .position(|value| value == session_id)
    else {
        return false;
    };

    state.cancelled_sessions.remove(index);
    true
}

async fn shutdown_worker(worker: ActiveWorker) -> Result<(), String> {
    if *worker.process.terminated.borrow() {
        return Ok(());
    }

    {
        let mut child = worker.process.child.lock().await;
        if let Some(child) = child.as_mut() {
            let _ = write_command(
                child,
                &WorkerCommand::Stop {
                    screen_session_id: worker.screen_session_id.clone(),
                },
            );
        }
    }

    if wait_terminated(worker.process.terminated.clone(), STOP_TIMEOUT).await {
        eprintln!(
            "[screen-share] worker stopped gracefully session={}",
            worker.screen_session_id
        );
        return Ok(());
    }

    eprintln!(
        "[screen-share] worker stop timed out; killing session={}",
        worker.screen_session_id
    );

    let child = {
        let mut child = worker.process.child.lock().await;
        child.take()
    };

    if let Some(child) = child {
        child
            .kill()
            .map_err(|error| format!("Failed to kill stuck screen-share worker: {error}"))?;
    }

    if wait_terminated(
        worker.process.terminated.clone(),
        KILL_CONFIRM_TIMEOUT,
    )
    .await
    {
        Ok(())
    } else {
        Err("Screen-share worker did not confirm termination after kill".to_owned())
    }
}

async fn wait_terminated(
    mut terminated: watch::Receiver<bool>,
    timeout: Duration,
) -> bool {
    if *terminated.borrow() {
        return true;
    }

    tokio::time::timeout(timeout, async {
        loop {
            if terminated.changed().await.is_err() {
                return;
            }

            if *terminated.borrow() {
                return;
            }
        }
    })
    .await
    .is_ok()
}

fn write_command(
    child: &mut CommandChild,
    command: &WorkerCommand,
) -> Result<(), String> {
    let mut payload = serde_json::to_vec(command)
        .map_err(|error| format!("Failed to encode worker command: {error}"))?;
    payload.push(b'\n');

    child
        .write(&payload)
        .map_err(|error| format!("Failed to write to screen-share worker: {error}"))
}
