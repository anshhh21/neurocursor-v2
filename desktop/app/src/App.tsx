import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

type EngineStatusResponse = {
  engineStatus: string;
  message: string;
};

type EngineEvent = {
  type: string;
  [key: string]: unknown;
};

type Telemetry = {
  fps: number;
  frameCount: number;
  isOpen: boolean;
  resolution: string;
};

type TrackingTelemetry = {
  handsDetected: number;
  confidence: number;
  handedness: string;
  handScale: number;
};

type Status = "idle" | "checking" | "loading" | "ready" | "error" | "stopping";

export default function App() {
  const [currentTab, setCurrentTab] = useState<"main" | "settings">("main");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("Python engine is not connected yet.");
  const [cursorSensitivity, setCursorSensitivity] = useState(2.4);
  const [smoothing, setSmoothing] = useState(60);
  const [telemetry, setTelemetry] = useState<Telemetry>({
    fps: 0,
    frameCount: 0,
    isOpen: false,
    resolution: "0x0",
  });
  const [cameraStatus, setCameraStatus] = useState<string>("offline");
  const [tracking, setTracking] = useState<TrackingTelemetry>({
    handsDetected: 0,
    confidence: 0,
    handedness: "",
    handScale: 0,
  });
  const [trackerStatus, setTrackerStatus] = useState<string>("offline");
  const [videoFrame, setVideoFrame] = useState<string>("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Listen for engine events (telemetry, camera status, video frames) from the Rust backend.
  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      const unlisten = await listen<EngineEvent>("engine-event", (event) => {
        if (cancelled) return;
        const payload = event.payload;

        if (payload.type === "telemetry") {
          setTelemetry({
            fps: (payload.fps as number) ?? 0,
            frameCount: (payload.frame_count as number) ?? 0,
            isOpen: (payload.is_open as boolean) ?? false,
            resolution: (payload.resolution as string) ?? "0x0",
          });
          setTracking({
            handsDetected: (payload.hands_detected as number) ?? 0,
            confidence: (payload.confidence as number) ?? 0,
            handedness: (payload.handedness as string) ?? "",
            handScale: (payload.hand_scale as number) ?? 0,
          });
        } else if (payload.type === "camera") {
          const camStatus = payload.status as string;
          setCameraStatus(camStatus);
          if (camStatus === "failed" || camStatus === "lost") {
            setMessage(payload.message as string);
          }
        } else if (payload.type === "tracker") {
          const trkStatus = payload.status as string;
          setTrackerStatus(trkStatus);
        } else if (payload.type === "video_frame") {
          setVideoFrame(payload.data as string);
        } else if (payload.type === "status") {
          const phase = payload.phase as string;
          if (phase === "loading") {
            setStatus("loading");
            setMessage(payload.message as string);
          } else if (phase === "models_loaded") {
            setStatus("ready");
            setMessage(payload.message as string);
          }
        }
      });

      if (!cancelled) {
        unlistenRef.current = unlisten;
      } else {
        unlisten();
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
    };
  }, []);

  // Poll engine status every 3 seconds while engine is running.
  useEffect(() => {
    if (status === "ready" || status === "loading") {
      pollRef.current = setInterval(async () => {
        try {
          const res = await invoke<EngineStatusResponse>("engine_status");
          if (res.engineStatus === "exited" || res.engineStatus === "idle") {
            setStatus("idle");
            setMessage(res.message);
            setTelemetry({ fps: 0, frameCount: 0, isOpen: false, resolution: "0x0" });
            setTracking({ handsDetected: 0, confidence: 0, handedness: "", handScale: 0 });
            setCameraStatus("offline");
            setTrackerStatus("offline");
            setVideoFrame("");
          }
        } catch {
          setStatus("error");
          setMessage("Lost connection to engine status.");
        }
      }, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status]);

  const handleStartEngine = async () => {
    setStatus("checking");
    setMessage("Starting the Python engine...");

    try {
      const response = await invoke<EngineStatusResponse>("start_engine");
      if (response.engineStatus === "ready" || response.engineStatus === "running") {
        // Don't immediately set "ready" — wait for the "status" event from engine
        // which will transition: checking -> loading -> ready
        setStatus("loading");
      } else {
        setStatus("error");
      }
      setMessage(response.message);
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  const handleStopEngine = async () => {
    setStatus("stopping");
    setMessage("Stopping the engine...");

    try {
      const response = await invoke<EngineStatusResponse>("stop_engine");
      setStatus("idle");
      setMessage(response.message);
      setTelemetry({ fps: 0, frameCount: 0, isOpen: false, resolution: "0x0" });
      setTracking({ handsDetected: 0, confidence: 0, handedness: "", handScale: 0 });
      setCameraStatus("offline");
      setTrackerStatus("offline");
      setVideoFrame("");
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  };

  const statusLabel = {
    idle: "Idle",
    checking: "Starting",
    loading: "Loading",
    ready: "Active",
    error: "Error",
    stopping: "Stopping",
  }[status];

  const statusDotColor = {
    idle: "bg-surface-variant",
    checking: "bg-primary-fixed pulse-dot",
    loading: "bg-tertiary-fixed-dim pulse-dot",
    ready: "bg-secondary-fixed pulse-dot",
    error: "bg-error",
    stopping: "bg-tertiary-fixed-dim pulse-dot",
  }[status];

  const statusTextColor = {
    idle: "text-on-surface-variant",
    checking: "text-primary-fixed",
    loading: "text-tertiary-fixed-dim",
    ready: "text-secondary-fixed",
    error: "text-error",
    stopping: "text-tertiary-fixed-dim",
  }[status];

  const engineActive = status === "ready" || status === "loading";
  const cameraIsLive = status === "ready" && telemetry.isOpen;
  const handDetected = cameraIsLive && tracking.handsDetected > 0;
  const confidencePct = Math.round(tracking.confidence * 100);
  const hasVideoFrame = videoFrame.length > 0;

  return (
    <div className="bg-background text-on-surface h-screen w-screen overflow-hidden flex font-body-md text-body-md selection:bg-surface-tint/30 selection:text-primary relative">
      {/* Background Shader Animation */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen hue-rotate-[45deg]"></div>
      
      {/* SideNavBar */}
      <nav className="docked left-0 w-64 border-r border-white/10 bg-surface-container-low/60 backdrop-blur-2xl flex flex-col h-screen p-4 space-y-8 z-20 shrink-0">
        <div className="flex items-center gap-3 px-2 pt-4">
          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border border-outline-variant">
            <span className="material-symbols-outlined text-primary-fixed" data-weight="fill">terminal</span>
          </div>
          <div>
            <h1 className="font-display text-primary-fixed font-bold tracking-tight text-lg leading-tight">Core Engine</h1>
            <p className="font-label-mono text-label-mono text-on-surface-variant/70">V2.0.4-Stable</p>
          </div>
        </div>

        <div className="flex-1 space-y-2 flex flex-col">
          <button 
            onClick={() => setCurrentTab("main")}
            className={`flex items-center gap-3 rounded-lg p-3 transition-all hover:translate-x-1 duration-300 w-full text-left cursor-pointer ${currentTab === "main" ? "bg-primary-container/20 text-primary-fixed-dim border border-primary-fixed/30" : "text-on-surface-variant hover:bg-white/5"}`}
          >
            <span className="material-symbols-outlined text-xl" data-weight={currentTab === "main" ? "fill" : ""}>dashboard</span>
            <span className="font-medium text-sm">Main</span>
          </button>
          <button 
            onClick={() => setCurrentTab("settings")}
            className={`flex items-center gap-3 rounded-lg p-3 transition-all hover:translate-x-1 duration-300 w-full text-left cursor-pointer ${currentTab === "settings" ? "bg-primary-container/20 text-primary-fixed-dim border border-primary-fixed/30" : "text-on-surface-variant hover:bg-white/5"}`}
          >
            <span className="material-symbols-outlined text-xl" data-weight={currentTab === "settings" ? "fill" : ""}>settings</span>
            <span className="font-medium text-sm">Settings</span>
          </button>
        </div>

        <div className="mt-auto space-y-4 px-2 pb-6">
          <div className="glass-panel p-4 rounded-xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-label-mono text-label-mono text-on-surface-variant uppercase">Engine Status</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${statusDotColor}`}></span>
                <span className={`font-label-mono text-label-mono ${statusTextColor}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
            
            {/* Live telemetry in sidebar when engine is active */}
            {engineActive && (
              <div className="space-y-2 pt-1 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="font-label-mono text-[10px] text-on-surface-variant/60 uppercase">Camera</span>
                  <span className={`font-label-mono text-[10px] ${cameraIsLive ? "text-secondary-fixed" : status === "loading" ? "text-tertiary-fixed-dim" : "text-error"}`}>
                    {cameraIsLive ? "Live" : status === "loading" ? "Loading..." : cameraStatus === "failed" ? "Failed" : "Offline"}
                  </span>
                </div>
                {cameraIsLive && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-label-mono text-[10px] text-on-surface-variant/60 uppercase">FPS</span>
                      <span className="font-label-mono text-[10px] text-primary-fixed">{telemetry.fps}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-label-mono text-[10px] text-on-surface-variant/60 uppercase">Resolution</span>
                      <span className="font-label-mono text-[10px] text-on-surface-variant">{telemetry.resolution}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-label-mono text-[10px] text-on-surface-variant/60 uppercase">Hand</span>
                      <span className={`font-label-mono text-[10px] ${handDetected ? "text-secondary-fixed" : "text-on-surface-variant/40"}`}>
                        {handDetected ? `${tracking.handedness} · ${confidencePct}%` : "No Hand"}
                      </span>
                    </div>
                    {handDetected && (
                      <div className="flex justify-between items-center">
                        <span className="font-label-mono text-[10px] text-on-surface-variant/60 uppercase">Scale</span>
                        <span className="font-label-mono text-[10px] text-on-surface-variant">{tracking.handScale.toFixed(3)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="pt-2 space-y-2">
              {engineActive ? (
                <button 
                  onClick={handleStopEngine}
                  className="w-full py-2 bg-gradient-to-r from-error/80 to-error-container/40 rounded-lg text-on-error-container font-medium text-sm border border-error/50 hover:opacity-90 transition-opacity flex justify-center items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">stop_circle</span>
                  Stop Engine
                </button>
              ) : (
                <button 
                  onClick={handleStartEngine}
                  disabled={status === "checking" || status === "stopping"}
                  className="w-full py-2 bg-gradient-to-r from-surface-tint to-tertiary-container/30 rounded-lg text-surface-container-lowest font-medium text-sm border border-primary-fixed/50 hover:opacity-90 transition-opacity flex justify-center items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-sm">power_settings_new</span>
                  {status === "checking" ? "Starting..." : status === "stopping" ? "Stopping..." : "Start Engine"}
                </button>
              )}
            </div>
            <div className="pt-1">
               <p className="text-xs text-on-surface-variant/70 font-label-mono">{message}</p>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative z-10 h-full overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background z-0 pointer-events-none"></div>
        
        {/* TopNavBar */}
        <header className="docked full-width top-0 border-b border-white/20 bg-surface-container/80 backdrop-blur-xl shadow-[0_0_20px_rgba(59,130,246,0.1)] flex justify-between items-center px-margin py-4 w-full z-30">
          <div className="flex items-center gap-6">
            <h2 className="font-display text-headline-lg font-bold tracking-tight text-primary-fixed-dim">NEUROCURSOR V2</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${engineActive ? "bg-secondary-container/20 border-secondary-fixed/30" : "bg-surface-container-highest border-white/10"}`}>
              <span className={`w-2 h-2 rounded-full ${statusDotColor}`}></span>
              <span className={`font-label-mono text-label-mono ${statusTextColor}`}>
                {status === "ready" ? "Engine Online" : status === "loading" ? "Loading Models..." : status === "checking" ? "Connecting..." : status === "stopping" ? "Shutting Down" : status === "error" ? "Engine Error" : "Engine Offline"}
              </span>
            </div>
            {/* Live FPS badge in header when engine is active */}
            {cameraIsLive && (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-surface-container-highest border-primary-fixed/20">
                  <span className="font-label-mono text-[10px] text-on-surface-variant/60 uppercase">FPS</span>
                  <span className="font-label-mono text-label-mono text-primary-fixed text-glow">{telemetry.fps}</span>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${handDetected ? "bg-secondary-container/20 border-secondary-fixed/30" : "bg-surface-container-highest border-white/10"}`}>
                  <span className={`w-2 h-2 rounded-full ${handDetected ? "bg-secondary-fixed pulse-dot" : "bg-surface-variant"}`}></span>
                  <span className={`font-label-mono text-label-mono ${handDetected ? "text-secondary-fixed" : "text-on-surface-variant/50"}`}>
                    {handDetected ? `${tracking.handedness} ${confidencePct}%` : "No Hand"}
                  </span>
                </div>
              </>
            )}
            <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant ml-2">
              <div className="w-full h-full bg-gradient-to-tr from-primary-container to-tertiary-container opacity-50"></div>
            </div>
          </div>
        </header>

        {/* Content based on tab */}
        {currentTab === "main" ? (
          <div className="flex-1 p-gutter overflow-y-auto flex flex-col gap-gutter z-10">
            {/* Camera Preview Panel */}
            <div className={`glass-panel rounded-xl overflow-hidden relative flex-1 min-h-[400px] border flex flex-col transition-all duration-500 ${cameraIsLive ? "glow-active border-surface-tint/30" : "border-white/5"}`}>
              {/* HUD overlay */}
              <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 pointer-events-none">
                <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-3 py-1 rounded-md border border-white/10">
                  <span className={`w-2 h-2 rounded-full ${cameraIsLive ? "bg-error pulse-dot" : status === "loading" ? "bg-tertiary-fixed-dim pulse-dot" : "bg-surface-variant"}`}></span>
                  <span className="font-label-mono text-label-mono text-on-surface tracking-widest uppercase">
                    {cameraIsLive ? "Live Input" : status === "loading" ? "Loading..." : "Feed Offline"}
                  </span>
                </div>
                {cameraIsLive && (
                  <div className="text-right">
                    <span className={`block font-label-mono text-glow ${handDetected ? "text-secondary-fixed" : "text-primary-fixed"}`}>
                      TRACKING: {handDetected ? `${confidencePct}%` : "No Hand"}
                    </span>
                    <span className="block font-label-mono text-xs text-on-surface-variant/70 mt-1">
                      FPS: {telemetry.fps} · RES: {telemetry.resolution}
                    </span>
                    <span className="block font-label-mono text-xs text-on-surface-variant/70 mt-1">
                      FRAMES: {telemetry.frameCount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Video feed / status content */}
              <div className="w-full h-full relative bg-black flex items-center justify-center">
                {/* Live video preview */}
                {hasVideoFrame && cameraIsLive && (
                  <img
                    src={`data:image/jpeg;base64,${videoFrame}`}
                    alt="Camera preview"
                    className="absolute inset-0 w-full h-full object-cover z-0"
                    style={{ imageRendering: "auto" }}
                  />
                )}

                {/* Overlay content on top of feed */}
                {cameraIsLive ? (
                  <div className="relative z-10 flex flex-col items-center gap-3">
                    {handDetected ? (
                      <>
                        <div className="bg-black/40 backdrop-blur-sm rounded-xl px-6 py-4 flex flex-col items-center gap-2 border border-secondary-fixed/20">
                          <span className="material-symbols-outlined text-4xl text-secondary-fixed/80">back_hand</span>
                          <div className="text-secondary-fixed font-label-mono uppercase tracking-widest text-sm">
                            {tracking.handedness} Hand — {confidencePct}%
                          </div>
                          <div className="w-40 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-secondary-fixed to-primary-fixed rounded-full transition-all duration-300"
                              style={{ width: `${confidencePct}%` }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Show nothing when no hand — the live feed is visible behind */
                      !hasVideoFrame && (
                        <>
                          <span className="material-symbols-outlined text-5xl text-primary-fixed/30 animate-pulse">videocam</span>
                          <div className="text-primary-fixed/50 font-label-mono uppercase tracking-widest text-sm">
                            Camera Active — Waiting for Hand
                          </div>
                          <div className="text-on-surface-variant/40 font-label-mono text-xs">
                            {telemetry.resolution} @ {telemetry.fps} FPS
                          </div>
                        </>
                      )
                    )}
                  </div>
                ) : status === "loading" ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-tertiary-fixed-dim border-t-transparent animate-spin"></div>
                    <div className="text-tertiary-fixed-dim font-label-mono uppercase tracking-widest text-sm">
                      Loading AI Models...
                    </div>
                    <div className="text-on-surface-variant/40 font-label-mono text-xs">
                      This may take a few seconds on first launch
                    </div>
                  </div>
                ) : status === "checking" ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-primary-fixed border-t-transparent animate-spin"></div>
                    <div className="text-primary-fixed/60 font-label-mono uppercase tracking-widest text-sm">
                      Connecting to Engine...
                    </div>
                  </div>
                ) : status === "ready" && cameraStatus === "failed" ? (
                  <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-5xl text-error/40">videocam_off</span>
                    <div className="text-error/60 font-label-mono uppercase tracking-widest text-sm">
                      Camera Unavailable
                    </div>
                    <div className="text-on-surface-variant/40 font-label-mono text-xs">
                      Check camera permissions or device connection
                    </div>
                  </div>
                ) : (
                  <div className="text-on-surface-variant font-label-mono uppercase tracking-widest">
                    Camera Feed Offline
                  </div>
                )}
              </div>
            </div>

            {/* Gesture Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter h-48">
              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between hover:bg-surface-variant/20 group cursor-pointer border border-white/5 hover:border-surface-tint/30 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-fixed group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">pan_tool</span>
                  </div>
                  <span className="font-label-mono text-[10px] text-primary-fixed bg-primary-fixed/10 px-2 py-1 rounded">MAPPED</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-on-surface mb-1 group-hover:text-primary-fixed transition-colors">Move Cursor</h3>
                  <p className="font-body-md text-sm text-on-surface-variant/70">Open palm tracking for continuous XY translation.</p>
                </div>
              </div>
              
              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between hover:bg-surface-variant/20 group cursor-pointer border border-white/5 hover:border-surface-tint/30 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-primary-fixed group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">touch_app</span>
                  </div>
                  <span className="font-label-mono text-[10px] text-primary-fixed bg-primary-fixed/10 px-2 py-1 rounded">MAPPED</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-on-surface mb-1 group-hover:text-primary-fixed transition-colors">Click Action</h3>
                  <p className="font-body-md text-sm text-on-surface-variant/70">Pinch index and thumb for primary execution command.</p>
                </div>
              </div>

              <div className="glass-panel p-6 rounded-xl flex flex-col justify-between hover:bg-surface-variant/20 group cursor-pointer border border-white/5 hover:border-surface-tint/30 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">front_hand</span>
                  </div>
                  <span className="font-label-mono text-[10px] text-on-surface-variant bg-surface-variant px-2 py-1 rounded">STANDBY</span>
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold text-on-surface mb-1 group-hover:text-primary-fixed transition-colors">Pause Engine</h3>
                  <p className="font-body-md text-sm text-on-surface-variant/70">Closed fist gesture to temporarily halt neural processing.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-8 md:px-margin md:py-12 z-10">
            <div className="max-w-4xl mx-auto space-y-gutter">
              <div className="mb-10">
                <h1 className="font-display text-4xl text-primary-fixed mb-2 tracking-tight font-bold">System Configuration</h1>
                <p className="text-on-surface-variant max-w-2xl text-lg">Fine-tune hardware acquisition pipelines and neural network inference parameters.</p>
              </div>

              <section className="bg-[#121214]/60 backdrop-blur-[20px] rounded-xl border border-white/10 p-gutter shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <span className="material-symbols-outlined text-primary-fixed">moving</span>
                  <h2 className="font-display text-2xl text-on-surface font-semibold tracking-tight">Neural Dynamics</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="font-label-mono text-label-mono text-primary-fixed-dim uppercase tracking-wider">Cursor Sensitivity</label>
                      <span className="font-label-mono text-on-surface bg-surface-container-highest px-2 py-0.5 rounded text-xs border border-white/10">{cursorSensitivity}x</span>
                    </div>
                    <div className="relative pt-2 pb-4">
                      <input type="range" className="w-full" min="0.1" max="5.0" step="0.1" value={cursorSensitivity} onChange={e => setCursorSensitivity(parseFloat(e.target.value))} title="Adjust cursor sensitivity" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="font-label-mono text-label-mono text-primary-fixed-dim uppercase tracking-wider">Smoothing (Kalman)</label>
                      <span className="font-label-mono text-on-surface bg-surface-container-highest px-2 py-0.5 rounded text-xs border border-white/10">{smoothing}%</span>
                    </div>
                    <div className="relative pt-2 pb-4">
                      <input type="range" className="w-full" min="0" max="100" value={smoothing} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSmoothing(parseInt(e.target.value))} title="Adjust smoothing (Kalman)" />
                    </div>
                  </div>
                </div>
              </section>
              
              <div className="pt-8 pb-12 flex justify-end items-center border-t border-white/5">
                <button className="px-8 py-3 rounded-lg bg-gradient-to-r from-surface-tint to-tertiary-container text-on-primary-fixed font-label-mono text-label-mono uppercase font-bold tracking-widest shadow-[0_0_20px_rgba(92,135,255,0.3)] hover:shadow-[0_0_30px_rgba(92,135,255,0.5)] hover:brightness-110 transition-all cursor-pointer">
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-surface-container-lowest/90 backdrop-blur-md border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] w-full flex justify-between items-center px-margin py-2 z-20 shrink-0">
          <div className="font-label-mono text-secondary-fixed text-label-mono">
              © 2024 NEUROCURSOR. AI {engineActive ? "ACTIVE" : "STANDBY"}.
          </div>
          <div className="flex gap-6">
              <span className="font-label-mono text-label-mono text-on-surface-variant/60">
                Engine: {engineActive ? "Online" : "Offline"}
              </span>
              {cameraIsLive && (
                <span className="font-label-mono text-label-mono text-primary-fixed/60">
                  {telemetry.fps} FPS · {telemetry.resolution}
                </span>
              )}
          </div>
        </footer>
      </main>
    </div>
  );
}
