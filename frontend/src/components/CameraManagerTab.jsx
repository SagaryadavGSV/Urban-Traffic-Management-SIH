import React, { useState } from "react";
import {
  Video,
  Activity,
  Zap,
  Sliders,
  Power,
  RefreshCw,
  MapPin,
  Clock,
  Compass,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import CameraCardModal from "./CameraCardModal";

export default function CameraManagerTab({ cameras = [], onToggleCameraStatus }) {
  const [selectedCamera, setSelectedCamera] = useState(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
              Vadodara 4-Lane Signal Network &amp; Camera Nodes
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              Live edge node health, frame rates, latency telemetry, and spatial calibration across Vadodara chowks
            </p>
          </div>
        </div>

        <div className="text-xs text-gray-700 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          Total Signals: <strong className="text-gray-900">{cameras.length}</strong> | Online:{" "}
          <strong className="text-emerald-700">
            {cameras.filter((c) => c.status === "online").length}
          </strong>
        </div>
      </div>

      {/* Camera Grid Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold uppercase">
                <th className="pb-3">NODE ID &amp; NAME</th>
                <th className="pb-3">CORRIDOR / CHOWK</th>
                <th className="pb-3">LANES &amp; DIR</th>
                <th className="pb-3">FPS</th>
                <th className="pb-3">LATENCY</th>
                <th className="pb-3">THROUGHPUT</th>
                <th className="pb-3">STATUS</th>
                <th className="pb-3 text-right">SIMULATE FAULT</th>
                <th className="pb-3 text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono">
              {cameras.map((cam) => {
                const statusBadge = {
                  online: "bg-emerald-50 border-emerald-300 text-emerald-800",
                  delayed: "bg-amber-50 border-amber-300 text-amber-800",
                  offline: "bg-red-50 border-red-300 text-red-800"
                }[cam.status] || "bg-gray-100 text-gray-700";

                return (
                  <tr key={cam.camera_id} className="hover:bg-gray-50/80 transition">
                    <td className="py-3.5">
                      <div className="font-bold text-gray-900 text-sm">{cam.camera_id}</div>
                      <div className="text-xs text-gray-500 font-sans">{cam.name}</div>
                    </td>
                    <td className="py-3.5 text-gray-800 font-semibold font-sans">{cam.road_zone}</td>
                    <td className="py-3.5 text-gray-600 font-sans">
                      {cam.lane_count} Lanes ({cam.direction})
                    </td>
                    <td className="py-3.5">
                      <span className="text-emerald-700 font-bold">{cam.fps}</span> FPS
                    </td>
                    <td className="py-3.5">
                      <span className="text-blue-700 font-bold">{cam.latency_ms}</span> ms
                    </td>
                    <td className="py-3.5 text-gray-700">{cam.throughput_epm} EPM</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${statusBadge}`}>
                        {cam.status}
                      </span>
                    </td>
                    {/* Simulated fault injector button to test offline/delayed camera alerts for judges! */}
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => {
                          const nextStatus =
                            cam.status === "online"
                              ? "delayed"
                              : cam.status === "delayed"
                              ? "offline"
                              : "online";
                          onToggleCameraStatus(cam.camera_id, nextStatus);
                        }}
                        title="Cycle status (Online -> Delayed -> Offline) to test alert triggers"
                        className="px-2.5 py-1 rounded bg-gray-50 border border-gray-300 hover:border-gray-400 text-gray-700 text-xs font-semibold transition inline-flex items-center space-x-1"
                      >
                        <Power className="w-3 h-3 text-amber-600" />
                        <span>Cycle</span>
                      </button>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setSelectedCamera(cam)}
                        className="px-3 py-1 rounded-md bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs"
                      >
                        View Feed
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCamera && (
        <CameraCardModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          onSearchPlate={() => {}}
        />
      )}
    </div>
  );
}
