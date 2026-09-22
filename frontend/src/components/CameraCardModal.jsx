import React from "react";
import { X, Video, Activity, Zap, Cpu, MapPin, ArrowUpRight, CheckCircle, AlertCircle } from "lucide-react";

export default function CameraCardModal({ camera, onClose, onSearchPlate }) {
  if (!camera) return null;

  const statusBadge = {
    online: "bg-emerald-950/80 border-emerald-500 text-emerald-400",
    delayed: "bg-amber-950/80 border-amber-500 text-amber-400",
    offline: "bg-red-950/80 border-red-500 text-red-400"
  }[camera.status] || "bg-slate-800 text-slate-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-base">{camera.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wider ${statusBadge}`}>
                  {camera.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {camera.camera_id} // {camera.road_zone} ({camera.direction})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Simulated CCTV Video Feed Frame */}
          <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video flex items-center justify-center group">
            <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur px-2.5 py-1 rounded text-xs font-mono text-slate-200 flex items-center space-x-2 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>LIVE CCTV FEED // 1080p @ {camera.fps} FPS</span>
            </div>
            <div className="absolute top-3 right-3 z-10 bg-black/70 backdrop-blur px-2.5 py-1 rounded text-[11px] font-mono text-emerald-400 border border-slate-800">
              LATENCY: {camera.latency_ms}ms
            </div>

            {/* Video Canvas Placeholder or Camera Frame */}
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-slate-500 p-6 text-center">
              <Activity className="w-12 h-12 text-blue-500/60 mb-2 animate-pulse" />
              <div className="font-mono text-sm text-slate-300 font-semibold">{camera.name}</div>
              <div className="text-xs text-slate-500 font-mono mt-1">RTSP STREAM: {camera.stream_url}</div>
              <div className="text-[11px] text-blue-400/80 font-mono mt-3 px-3 py-1 rounded bg-blue-950/40 border border-blue-900">
                ACTIVE AI DETECTOR: {camera.model_version}
              </div>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">FRAME RATE</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{camera.fps} FPS</div>
              <div className="text-[10px] text-slate-500">Hardware Nominal</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">FEED LATENCY</div>
              <div className="text-lg font-bold text-sky-400 mt-0.5">{camera.latency_ms} ms</div>
              <div className="text-[10px] text-slate-500">Edge-to-Server</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">LANES MONITORED</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">{camera.lane_count} Lanes</div>
              <div className="text-[10px] text-slate-500">Direction: {camera.direction}</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-[11px] text-slate-400">THROUGHPUT</div>
              <div className="text-lg font-bold text-indigo-400 mt-0.5">{camera.throughput_epm} EPM</div>
              <div className="text-[10px] text-slate-500">Events / Minute</div>
            </div>
          </div>

          {/* GIS Coordinates & Network Calibration */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>SPATIAL &amp; CALIBRATION DATA</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                {camera.latitude.toFixed(4)} N, {camera.longitude.toFixed(4)} E
              </span>
            </div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Connected adjacent nodes:{" "}
              {camera.calibration_nodes
                ? Object.entries(camera.calibration_nodes)
                    .map(([other, dist]) => `${other} (${dist} km)`)
                    .join(", ")
                : "Standalone node"}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
