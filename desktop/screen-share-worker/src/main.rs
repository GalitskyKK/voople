mod desktop_capture;
mod process_audio;
mod process_audio_capture;
mod publisher;

use std::io::{self, Write};
use std::process::ExitCode;

use tokio::io::{AsyncBufReadExt, BufReader};
use voople_screen_share_protocol::{WorkerCommand, WorkerEvent};

#[tokio::main]
async fn main() -> ExitCode {
    match run().await {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("[screen-share-worker] fatal: {error}");
            ExitCode::FAILURE
        }
    }
}

async fn run() -> Result<(), String> {
    let stdin = tokio::io::stdin();
    let mut lines = BufReader::new(stdin).lines();

    let first = lines
        .next_line()
        .await
        .map_err(|error| error.to_string())?
        .ok_or_else(|| "Parent closed worker stdin before the first command".to_owned())?;

    let command =
        serde_json::from_str::<WorkerCommand>(&first).map_err(|error| error.to_string())?;

    match command {
        WorkerCommand::ListSources { host_process_id } => {
            match desktop_capture::list_desktop_capture_sources(host_process_id) {
                Ok(sources) => emit(&WorkerEvent::Sources { sources })?,
                Err(message) => {
                    emit(&WorkerEvent::Error {
                        screen_session_id: None,
                        message: message.clone(),
                    })?;
                    return Err(message);
                }
            }
            Ok(())
        }

        WorkerCommand::Start {
            input,
            host_process_id,
        } => run_share(input, host_process_id, lines).await,

        WorkerCommand::Stop { .. } => Err("First worker command cannot be STOP".to_owned()),
    }
}

async fn run_share(
    input: voople_screen_share_protocol::StartProcessAudioInput,
    host_process_id: u32,
    mut lines: tokio::io::Lines<BufReader<tokio::io::Stdin>>,
) -> Result<(), String> {
    let session_id = input.screen_session_id.clone();
    let (ready_tx, ready_rx) = tokio::sync::oneshot::channel();
    let (stop_tx, stop_rx) = tokio::sync::oneshot::channel();

    let mut publisher = tokio::spawn(publisher::run_publish_session(
        input,
        host_process_id,
        ready_tx,
        stop_rx,
    ));

    tokio::select! {
        ready = ready_rx => {
            match ready {
                Ok(Ok(())) => {
                    emit(&WorkerEvent::Ready {
                        screen_session_id: session_id.clone(),
                    })?;
                }
                Ok(Err(message)) => {
                    emit(&WorkerEvent::Error {
                        screen_session_id: Some(session_id.clone()),
                        message: message.clone(),
                    })?;
                    return Err(message);
                }
                Err(_) => {
                    return Err("Publisher exited before READY".to_owned());
                }
            }
        }

        result = &mut publisher => {
            return flatten_join_result(result);
        }
    }

    let mut stop_tx = Some(stop_tx);

    loop {
        tokio::select! {
            result = &mut publisher => {
                return flatten_join_result(result);
            }

            line = lines.next_line() => {
                match line.map_err(|error| error.to_string())? {
                    Some(line) => {
                        match serde_json::from_str::<WorkerCommand>(&line)
                            .map_err(|error| error.to_string())?
                        {
                            WorkerCommand::Stop { screen_session_id }
                                if screen_session_id == session_id =>
                            {
                                if let Some(sender) = stop_tx.take() {
                                    let _ = sender.send(());
                                }
                                break;
                            }

                            WorkerCommand::Stop { .. } => {
                                // A stale stop for another UUID is harmless.
                            }

                            _ => {
                                return Err("Unexpected worker command after START".to_owned());
                            }
                        }
                    }

                    None => {
                        // Parent died or exited. Do not leave an orphan native Room.
                        // Immediate process termination lets Windows reclaim all native
                        // WebRTC/DesktopCapturer/WASAPI resources.
                        std::process::exit(0);
                    }
                }
            }
        }
    }

    match publisher.await {
        Ok(result) => result,
        Err(error) => Err(format!("Publisher task failed during shutdown: {error}")),
    }
}

fn flatten_join_result(
    result: Result<Result<(), String>, tokio::task::JoinError>,
) -> Result<(), String> {
    match result {
        Ok(result) => result,
        Err(error) => Err(format!("Publisher task failed: {error}")),
    }
}

fn emit(event: &WorkerEvent) -> Result<(), String> {
    let line = serde_json::to_string(event).map_err(|error| error.to_string())?;
    let stdout = io::stdout();
    let mut stdout = stdout.lock();
    writeln!(stdout, "{line}").map_err(|error| error.to_string())?;
    stdout.flush().map_err(|error| error.to_string())
}
