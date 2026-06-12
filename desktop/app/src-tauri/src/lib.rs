#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineStatus {
    engine_status: String,
    message: String,
}

#[tauri::command]
fn engine_status() -> EngineStatus {
    EngineStatus {
        engine_status: "ready".to_string(),
        message: "Tauri shell is ready. Python engine is not connected yet.".to_string(),
    }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![engine_status])
        .run(tauri::generate_context!())
        .expect("error while running NeuroCursor");
}
