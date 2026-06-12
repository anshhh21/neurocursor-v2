import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

type EngineStatusResponse = {
  engineStatus: "ready";
  message: string;
};

type Status = "idle" | "checking" | "ready" | "unavailable";

function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Python engine is not connected yet.");

  const handleStartEngine = async () => {
    setStatus("checking");
    setMessage("Checking the Tauri shell...");

    try {
      const response = await invoke<EngineStatusResponse>("engine_status");
      setStatus("ready");
      setMessage(response.message);
    } catch {
      setStatus("unavailable");
      setMessage("Run this screen inside Tauri to call native commands.");
    }
  };

  return (
    <main className="app-shell">
      <section className="control-center" aria-labelledby="app-title">
        <div className="title-row">
          <div>
            <p className="eyebrow">Desktop Alpha</p>
            <h1 id="app-title">NeuroCursor V2</h1>
          </div>
          <span className={`status-pill status-${status}`}>
            {status === "idle" && "Idle"}
            {status === "checking" && "Checking"}
            {status === "ready" && "Ready"}
            {status === "unavailable" && "Unavailable"}
          </span>
        </div>

        <div className="status-panel">
          <span className="panel-label">Engine</span>
          <p>{message}</p>
        </div>

        <div className="actions-row">
          <button className="primary-button" onClick={handleStartEngine}>
            Start Engine
          </button>
          <button className="secondary-button" disabled>
            Settings
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
