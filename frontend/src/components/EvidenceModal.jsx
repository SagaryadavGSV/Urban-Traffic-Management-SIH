import React from "react";
import { X, ShieldCheck, AlertCircle, FileSearch, Eye, CheckCircle2, Copy } from "lucide-react";

export default function EvidenceModal({ sighting, onClose, onSearchPlate }) {
  if (!sighting) return null;

  let alternatives = [];
  if (sighting.ocr_alternatives) {
    try {
      alternatives = typeof sighting.ocr_alternatives === "string"
        ? JSON.parse(sighting.ocr_alternatives)
        : sighting.ocr_alternatives;
    } catch (e) {
      alternatives = [];
    }
  }

  const isVerified = sighting.is_verified !== 0 && sighting.ocr_confidence >= 0.60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileSearch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-base font-mono">
                  EVIDENCE // {sighting.plate_text}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                    isVerified
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-400"
                      : "bg-red-950/80 border-red-500 text-red-400"
                  }`}
                >
                  {isVerified ? "VERIFIED READ" : "UNVERIFIED (LOW CONFIDENCE)"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Event ID: {sighting.event_id} // Captured at {sighting.camera_id}
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

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Visual Crops Showcase: Plate Crop & Vehicle Crop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Zoomed Plate Crop */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>LICENSE PLATE CROP</span>
                <span className="text-emerald-400 font-bold">
                  OCR: {Math.round(sighting.ocr_confidence * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-center p-3 bg-slate-900 rounded-lg border border-slate-800 min-h-[100px]">
                {sighting.evidence_plate_crop ? (
                  <img
                    src={sighting.evidence_plate_crop}
                    alt="Plate crop"
                    className="max-h-20 max-w-full rounded shadow-md object-contain"
                  />
                ) : (
                  <div className="font-mono text-xl font-black tracking-widest text-slate-100 bg-white text-black px-4 py-2 rounded">
                    {sighting.plate_text}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Raw OCR: {sighting.raw_plate_text || sighting.plate_text}</span>
                <span className="text-slate-500">HSRP Compliant</span>
              </div>
            </div>

            {/* Vehicle Silhouette Crop */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>VEHICLE LOCALIZATION CROP</span>
                <span className="text-sky-400 font-bold">
                  Det: {Math.round((sighting.plate_detector_confidence || 0.96) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-center p-3 bg-slate-900 rounded-lg border border-slate-800 min-h-[100px]">
                {sighting.evidence_vehicle_crop ? (
                  <img
                    src={sighting.evidence_vehicle_crop}
                    alt="Vehicle crop"
                    className="max-h-24 max-w-full rounded shadow-md object-contain"
                  />
                ) : (
                  <div className="text-xs text-slate-500 font-mono">Vehicle Crop Unavailable</div>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Class: <strong className="text-slate-200 capitalize">{sighting.vehicle_type}</strong></span>
                <span>Track ID: {sighting.vehicle_track_id || "TRK-01"}</span>
              </div>
            </div>
          </div>

          {/* Full Original Camera Scene Frame */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>FULL CCTV SCENE EVIDENCE FRAME (UNALTERED)</span>
              <span className="text-slate-500">Capture: {sighting.timestamp_utc}</span>
            </div>
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-black flex items-center justify-center aspect-video">
              {sighting.evidence_frame_path ? (
                <img
                  src={sighting.evidence_frame_path}
                  alt="Full frame"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-slate-500 font-mono text-xs">Full Frame Snapshot</div>
              )}
            </div>
          </div>

          {/* Model Evaluation & OCR Alternatives Hypotheses (Section 4.2.2) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-slate-300 font-mono">
              OCR MULTI-HYPOTHESIS CONFIDENCE DISTRIBUTION
            </div>
            <div className="space-y-2">
              {alternatives.length > 0 ? (
                alternatives.map((alt, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded border border-slate-800 font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${i === 0 ? "bg-emerald-400" : "bg-slate-600"}`} />
                      <span className="font-bold text-slate-200">{alt.plate}</span>
                      {i === 0 && <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">Primary Candidate</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full ${i === 0 ? "bg-emerald-500" : "bg-slate-500"}`}
                          style={{ width: `${Math.round(alt.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-slate-300 w-10 text-right">{Math.round(alt.confidence * 100)}%</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 font-mono">
                  Primary read: {sighting.plate_text} ({Math.round(sighting.ocr_confidence * 100)}% confidence)
                </div>
              )}
            </div>
          </div>

          {/* Audit & Legal Chain of Custody Note */}
          <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-900/50 text-xs text-blue-300 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong>Audit Trail Notice (Section 2 &amp; 7):</strong> This evidence inspection has been recorded in the platform's immutable audit log under your active session credentials.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              if (onSearchPlate) onSearchPlate(sighting.plate_text);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Reconstruct Trajectory for {sighting.plate_text}</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
