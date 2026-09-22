import React, { useState } from "react";
import {
  Video,
  Activity,
  AlertTriangle,
  Award,
  TrendingUp,
  MapPin,
  Eye,
  EyeOff,
  Search,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Compass,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import GisMap from "./GisMap";
import CameraCardModal from "./CameraCardModal";
import EvidenceModal from "./EvidenceModal";

export default function LiveOverviewTab({
  kpis,
  cameras,
  recentEvents,
  alerts,
  congestionData,
  onNavigateToSearch,
  onSelectAlert,
  activeRole,
  onUnmaskPlate
}) {
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [inspectSighting, setInspectSighting] = useState(null);
  const [unmaskedPlates, setUnmaskedPlates] = useState({});

  const handleToggleMask = (eventId, plateText) => {
    if (activeRole === "Traffic operator") {
      alert("Privacy Safeguard (Section 7): Traffic Operators have view-only rights. Plate unmasking requires Authorized Investigator or Supervisor role.");
      return;
    }
    const current = !!unmaskedPlates[eventId];
    setUnmaskedPlates((prev) => ({ ...prev, [eventId]: !current }));
    if (!current && onUnmaskPlate) {
      onUnmaskPlate(plateText, eventId);
    }
  };

  const maskPlateText = (plate, isUnmasked) => {
    if (isUnmasked) return plate;
    if (!plate || plate.length < 5) return "••••••";
    // Show first 4 and last 2, mask middle e.g. DL01•••34
    const prefix = plate.slice(0, 4);
    const suffix = plate.slice(-2);
    return `${prefix}••${suffix}`;
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP METRIC WIDGETS (Section 4.1.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Cameras Widget */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider">
              CAMERA NETWORK HEALTH
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black font-mono text-slate-100">
                {kpis?.cameras?.online || 0}
              </span>
              <span className="text-sm font-mono text-slate-400">
                / {kpis?.cameras?.total || 8} Active
              </span>
            </div>
            <div className="mt-2 flex items-center space-x-2 text-[11px] font-mono">
              <span className="flex items-center space-x-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{kpis?.cameras?.online || 0} Online</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center space-x-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>{kpis?.cameras?.delayed || 0} Delayed</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center space-x-1 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>{kpis?.cameras?.offline || 0} Offline</span>
              </span>
            </div>
          </div>
        </div>

        {/* Current Traffic Volume Widget */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider">
              CITY TRAFFIC VOLUME
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black font-mono text-slate-100">
                {kpis?.traffic_volume_current || 420}
              </span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800">
                +4.2% vs Baseline
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              Window: Last 15m | {kpis?.events_tracked || 0} total ANPR events logged
            </div>
          </div>
        </div>

        {/* Active Alerts Counter Widget */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider">
              REAL-TIME ALERTS
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black font-mono text-amber-400">
                {kpis?.alerts?.total_active || 0}
              </span>
              <span className="text-xs font-mono text-slate-400">Active High-Priority</span>
            </div>
            <div className="mt-2 flex items-center space-x-2 text-[11px] font-mono">
              <span className="text-red-400 font-bold">{kpis?.alerts?.new || 0} New</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400">{kpis?.alerts?.acknowledged || 0} In Review</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400">{kpis?.alerts?.resolved || 0} Resolved</span>
            </div>
          </div>
        </div>

        {/* Model Quality & Accuracy Widget (Section 4.1.1 & 6) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-semibold tracking-wider">
              OCR RECOGNITION QUALITY
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-black font-mono text-emerald-400">
                {kpis?.model_quality?.average_confidence_pct || 94.2}%
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                (Target &gt;90%)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 font-mono">
              {kpis?.model_quality?.verified_percentage || 98.4}% verified reads (&gt;60% confidence)
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: GIS MAP & LIVE EVENT FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Live GIS Map (Section 3.2 & 4.1.1) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-200 tracking-wide font-mono">
                  LIVE GIS CITY COMMAND MAP
                </h3>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-400">Click camera node to inspect feed</span>
              </div>
            </div>

            {/* GIS Map Surface */}
            <GisMap
              cameras={cameras}
              selectedCamera={selectedCamera}
              onSelectCamera={(cam) => setSelectedCamera(cam)}
              congestionData={congestionData}
              height="580px"
            />
          </div>
        </div>

        {/* Right Column: Live Ingested ANPR Event Feed (Section 4.1.1) */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col h-full max-h-[760px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="font-bold text-sm text-slate-200 tracking-wide font-mono">
                  LIVE ANPR EVENT STREAM
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Plates masked by default (Sec 7)
              </span>
            </div>

            {/* Event Cards Scroll Feed */}
            <div className="mt-3 space-y-3 overflow-y-auto pr-1 flex-1">
              {recentEvents?.map((ev) => {
                const isUnmasked = !!unmaskedPlates[ev.event_id];
                const displayedPlate = maskPlateText(ev.plate_text, isUnmasked);
                const isVerified = ev.is_verified !== 0 && ev.ocr_confidence >= 0.60;

                return (
                  <div
                    key={ev.event_id}
                    className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-3 hover:border-blue-500/50 transition shadow space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      {/* Masked / Unmasked Plate */}
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-black tracking-widest text-slate-100 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                          {displayedPlate}
                        </span>
                        <button
                          onClick={() => handleToggleMask(ev.event_id, ev.plate_text)}
                          title={isUnmasked ? "Mask plate" : "Unmask plate (Audited)"}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                        >
                          {isUnmasked ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Confidence Pill */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          isVerified
                            ? "bg-emerald-950/60 border-emerald-700 text-emerald-400"
                            : "bg-red-950/60 border-red-700 text-red-400"
                        }`}
                      >
                        {Math.round(ev.ocr_confidence * 100)}% {isVerified ? "CONF" : "UNVERIFIED"}
                      </span>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span className="truncate max-w-[140px]">{ev.camera_id}</span>
                      </span>
                      <span className="capitalize text-slate-300 font-semibold">{ev.vehicle_type}</span>
                      <span>{ev.timestamp_utc?.substring(11, 19)}</span>
                    </div>

                    {/* Evidence Thumbnail & Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {ev.evidence_plate_crop && (
                          <img
                            src={ev.evidence_plate_crop}
                            alt="Plate crop"
                            className="h-6 rounded border border-slate-700 object-contain bg-black"
                          />
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {ev.direction || "Eastbound"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setInspectSighting(ev)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono font-bold transition"
                        >
                          Evidence
                        </button>
                        <button
                          onClick={() => onNavigateToSearch(ev.plate_text)}
                          className="px-2 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-mono font-bold transition flex items-center space-x-1"
                        >
                          <span>Track</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedCamera && (
        <CameraCardModal
          camera={selectedCamera}
          onClose={() => setSelectedCamera(null)}
          onSearchPlate={(p) => onNavigateToSearch(p)}
        />
      )}

      {inspectSighting && (
        <EvidenceModal
          sighting={inspectSighting}
          onClose={() => setInspectSighting(null)}
          onSearchPlate={(p) => onNavigateToSearch(p)}
        />
      )}
    </div>
  );
}
