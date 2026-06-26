use serde_json::Value;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter};

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

struct EngineProcess(Arc<Mutex<Option<Child>>>);
struct PauseState(Arc<Mutex<bool>>);

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

    // Resolve the engine directory relative to the Tauri app.
    // In development: the engine source lives at ../../engine relative to src-tauri
    // We need the absolute path to the engine's src directory for PYTHONPATH.
    let engine_dir = std::env::current_dir()
        .unwrap_or_default()
        .join("../../engine");
    let engine_dir = engine_dir
        .canonicalize()
        .unwrap_or_else(|_| engine_dir.clone());
    let engine_src = engine_dir.join("src");

    let mut child = Command::new("python3")
        .arg("-m")
        .arg("neurocursor")
        .env("PYTHONPATH", &engine_src)
        .current_dir(&engine_dir)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to spawn engine: {}", e))?;

    // Read the first line to confirm startup.
    let stdout = child.stdout.take().ok_or("No stdout from engine")?;
    let mut reader = BufReader::new(stdout);
    let mut first_line = String::new();
    let engine_status;
    let message;

    match reader.read_line(&mut first_line) {
        Ok(0) => {
            return Err("Engine exited immediately without output.".into());
        }
        Ok(_) => {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&first_line) {
                engine_status = parsed
                    .get("engineStatus")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown")
                    .to_string();
                message = parsed
                    .get("message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("No message.")
                    .to_string();

                // Forward the first line as an event too.
                if let Ok(event) = serde_json::from_str::<EngineEvent>(&first_line) {
                    let _ = app_handle.emit("engine-event", &event);
                }
            } else {
                engine_status = "unknown".to_string();
                message = format!("Unexpected first line: {}", first_line.trim());
            }
        }
        Err(e) => {
            return Err(format!("Failed to read engine output: {}", e));
        }
    }

    // Spawn a background thread to continuously read stdout and emit events.
    let app_handle_clone = app_handle.clone();
    let state_clone = Arc::clone(&state.0);
    std::thread::spawn(move || {
        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, // EOF — engine exited
                Ok(_) => {
                    if let Ok(event) = serde_json::from_str::<EngineEvent>(&line) {
                        let _ = app_handle_clone.emit("engine-event", &event);
                    }
                }
                Err(_) => break,
            }
        }
        // Engine process ended, clear the reference
        if let Ok(mut guard) = state_clone.lock() {
            *guard = None;
        }
    });

    // Store the child process so we can stop it later.
    *guard = Some(child);

    Ok(EngineStatus {
        engine_status,
        message,
    })
}

#[tauri::command]
fn stop_engine(state: tauri::State<'_, EngineProcess>) -> Result<EngineStatus, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
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
            message: "Engine is active.".into(),
        })
    } else {
        Ok(EngineStatus {
            engine_status: "idle".into(),
            message: "Engine is completely stopped.".into(),
        })
    }
}

#[tauri::command]
fn toggle_pause(
    app_handle: AppHandle,
    pause_state: tauri::State<'_, PauseState>,
    engine_state: tauri::State<'_, EngineProcess>,
) -> Result<bool, String> {
    let mut paused = pause_state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;
    *paused = !*paused;
    let is_paused = *paused;

    // Send the pause command to the Python engine via stdin
    if let Ok(mut guard) = engine_state.0.lock() {
        if let Some(ref mut child) = *guard {
            if let Some(ref mut stdin) = child.stdin {
                use std::io::Write;
                let cmd = serde_json::json!({
                    "action": "toggle_pause",
                    "payload": { "paused": is_paused }
                });
                let _ = writeln!(stdin, "{}", cmd);
                let _ = stdin.flush();
            }
        }
    }

    // Emit the pause state to the frontend
    let _ = app_handle.emit("engine-event", &serde_json::json!({
        "type": "pause_state",
        "is_paused": is_paused
    }));

    Ok(is_paused)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(EngineProcess(Arc::new(Mutex::new(None))))
        .manage(PauseState(Arc::new(Mutex::new(false))))
        .invoke_handler(tauri::generate_handler![
            start_engine,
            stop_engine,
            engine_status,
            toggle_pause
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
