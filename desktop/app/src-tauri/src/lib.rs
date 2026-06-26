use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

/// Managed Tauri state that holds the running engine child process.
struct EngineProcess(Mutex<Option<Child>>);

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
struct EngineStatus {
    engine_status: String,
    message: String,
}

/// A generic JSON-lines message from the Python engine.
/// The frontend listens for "engine-telemetry" events carrying this payload.
#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
struct EngineEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[serde(flatten)]
    data: serde_json::Value,
}

/// Locate the Python engine directory by probing known relative paths.
fn find_engine_dir() -> Result<std::path::PathBuf, String> {
    let cwd = std::env::current_dir().unwrap_or_default();
    let exe_dir = std::env::current_exe()
        .unwrap_or_default()
        .parent()
        .unwrap_or(std::path::Path::new(""))
        .to_path_buf();

    let possible_paths = vec![
        // Dev: when running from desktop/app via `npm run tauri dev`
        cwd.join("../engine"),
        // Dev: when running from desktop/app/src-tauri
        cwd.join("../../engine"),
        // Prod / Packaged: if placed next to the executable
        exe_dir.join("engine"),
        // Prod macOS: if placed in Resources folder next to MacOS folder
        exe_dir.join("../Resources/engine"),
    ];

    possible_paths
        .into_iter()
        .find(|p| p.join("src/neurocursor/__main__.py").exists())
        .ok_or_else(|| {
            "Could not locate Python engine directory. Make sure it is bundled correctly."
                .to_string()
        })
}

#[tauri::command]
fn start_engine(
    app: tauri::AppHandle,
    state: tauri::State<'_, EngineProcess>,
) -> Result<EngineStatus, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    // If a process is already running, report that instead of spawning another.
    if let Some(ref mut child) = *guard {
        match child.try_wait() {
            Ok(None) => {
                // Still running
                return Ok(EngineStatus {
                    engine_status: "running".into(),
                    message: "Engine is already running.".into(),
                });
            }
            _ => {
                // Exited or errored — clear the slot so we can respawn below.
                *guard = None;
            }
        }
    }

    let engine_dir = find_engine_dir()?;

    let mut child = Command::new("python3")
        .arg("-m")
        .arg("neurocursor")
        .env("PYTHONPATH", "src")
        .current_dir(&engine_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start python process: {}", e))?;

    // Take ownership of stdout so we can read from it.
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let mut reader = BufReader::new(stdout);

    // Read the first JSON line — the startup handshake.
    let mut first_line = String::new();
    reader
        .read_line(&mut first_line)
        .map_err(|e| format!("Failed to read stdout: {}", e))?;

    if first_line.is_empty() {
        return Err("Python engine exited without printing status".to_string());
    }

    // Parse the startup line (which now has a "type" field alongside engineStatus/message).
    let startup_event: serde_json::Value = serde_json::from_str(&first_line)
        .map_err(|e| format!("Failed to parse JSON: {}. Output was: {}", e, first_line))?;

    let engine_status = startup_event["engineStatus"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();
    let message = startup_event["message"]
        .as_str()
        .unwrap_or("")
        .to_string();

    // Spawn a background thread that reads subsequent JSON lines from stdout
    // and emits them as Tauri events so the React frontend can receive them.
    let app_handle = app.clone();
    std::thread::spawn(move || {
        use tauri::Emitter;

        let mut line = String::new();
        loop {
            line.clear();
            match reader.read_line(&mut line) {
                Ok(0) => break, // EOF — engine exited
                Ok(_) => {
                    if let Ok(event) = serde_json::from_str::<EngineEvent>(&line) {
                        let _ = app_handle.emit("engine-event", &event);
                    }
                }
                Err(_) => break,
            }
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

    match guard.take() {
        Some(mut child) => {
            // Try graceful kill first, then force if needed.
            let _ = child.kill();
            let _ = child.wait(); // Reap the zombie process
            Ok(EngineStatus {
                engine_status: "stopped".into(),
                message: "Engine process terminated.".into(),
            })
        }
        None => Ok(EngineStatus {
            engine_status: "stopped".into(),
            message: "No engine process was running.".into(),
        }),
    }
}

#[tauri::command]
fn engine_status(state: tauri::State<'_, EngineProcess>) -> Result<EngineStatus, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|e| format!("Lock poisoned: {}", e))?;

    match *guard {
        Some(ref mut child) => match child.try_wait() {
            Ok(None) => Ok(EngineStatus {
                engine_status: "running".into(),
                message: "Engine is running.".into(),
            }),
            Ok(Some(exit)) => {
                // Process has exited — clear the slot.
                *guard = None;
                Ok(EngineStatus {
                    engine_status: "exited".into(),
                    message: format!("Engine exited with {}.", exit),
                })
            }
            Err(e) => {
                *guard = None;
                Err(format!("Failed to check engine status: {}", e))
            }
        },
        None => Ok(EngineStatus {
            engine_status: "idle".into(),
            message: "No engine process is running.".into(),
        }),
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(EngineProcess(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![
            start_engine,
            stop_engine,
            engine_status
        ])
        .run(tauri::generate_context!())
        .expect("error while running NeuroCursor");
}
