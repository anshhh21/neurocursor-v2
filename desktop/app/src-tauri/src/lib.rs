use serde_json::Value;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};
use tauri::async_runtime::spawn;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[derive(serde::Serialize)]
struct EngineStatus {
    #[serde(rename = "engineStatus")]
    engine_status: String,
    message: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct EngineEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(flatten)]
    payload: Value,
}

struct EngineProcess(Arc<Mutex<Option<CommandChild>>>);

#[tauri::command]
fn start_engine(
    app_handle: AppHandle,
    state: tauri::State<'_, EngineProcess>,
) -> Result<EngineStatus, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    if guard.is_some() {
        return Ok(EngineStatus {
            engine_status: "running".into(),
            message: "Engine is already running.".into(),
        });
    }

    let sidecar_command = app_handle
        .shell()
        .sidecar("engine")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn engine sidecar: {}", e))?;

    let app_handle_clone = app_handle.clone();
    let state_clone = Arc::clone(&state.0);

    spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line_bytes) => {
                    let line = String::from_utf8_lossy(&line_bytes);
                    if let Ok(event) = serde_json::from_str::<EngineEvent>(&line) {
                        let _ = app_handle_clone.emit("engine-event", &event);
                    }
                }
                CommandEvent::Terminated(_) => {
                    // Automatically clear the child reference when it dies
                    if let Ok(mut guard) = state_clone.lock() {
                        *guard = None;
                    }
                    break;
                }
                _ => {}
            }
        }
    });

    *guard = Some(child);

    Ok(EngineStatus {
        engine_status: "ready".into(),
        message: "Engine sidecar started successfully.".into(),
    })
}

#[tauri::command]
fn stop_engine(state: tauri::State<'_, EngineProcess>) -> Result<EngineStatus, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    if let Some(child) = guard.take() {
        let _ = child.kill();
        return Ok(EngineStatus {
            engine_status: "exited".into(),
            message: "Engine stopped successfully.".into(),
        });
    }

    Ok(EngineStatus {
        engine_status: "idle".into(),
        message: "Engine was not running.".into(),
    })
}

#[tauri::command]
fn engine_status(state: tauri::State<'_, EngineProcess>) -> Result<EngineStatus, String> {
    let guard = state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    if guard.is_some() {
        Ok(EngineStatus {
            engine_status: "running".into(),
            message: "Engine sidecar is active.".into(),
        })
    } else {
        Ok(EngineStatus {
            engine_status: "idle".into(),
            message: "Engine sidecar is completely stopped.".into(),
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(EngineProcess(Arc::new(Mutex::new(None))))
        .invoke_handler(tauri::generate_handler![
            start_engine,
            stop_engine,
            engine_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
