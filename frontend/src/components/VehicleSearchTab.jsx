import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Clock,
  Gauge,
  Sparkles,
  Download,
  AlertCircle,
  Eye,
  CheckCircle2,
  Navigation,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Activity,
  Milestone
} from "lucide-react";
import GisMap from "./GisMap";
import EvidenceModal from "./EvidenceModal";
import { api } from "../api";

export default function VehicleSearchTab({ initialPlate = "", activeRole, onLogAudit }) {
  const [plateQuery, setPlateQuery] = useState(initialPlate || "GJ06AB1234");
  const [isFuzzy, setIsFuzzy] = useState(false);
  const [caseNumber, setCaseNumber] = useState("CASE-2026-VADODARA01");
  const [searchReason, setSearchReason] = useState("Official Inquiry: Vehicle Route Reconstruction & Speed Analysis");

  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [inspectSighting, setInspectSighting] = useState(null);
  const [dossierExportData, setDossierExportData] = useState(null);

  // Auto-trigger search if initialPlate is passed
  useEffect(() => {
    if (initialPlate) {
      setPlateQuery(initialPlate);
      executeSearch(initialPlate);
    } else {
      executeSearch("GJ06AB1234");
    }
  }, [initialPlate]);

  const executeSearch = async (targetPlate = plateQuery) => {
    if (!targetPlate || !targetPlate.trim()) return;
    setLoading(true);
    try {
      const res = await api.searchTrajectory({
        plate_text: targetPlate.trim(),
        is_fuzzy: isFuzzy,
        case_number: caseNumber,
        search_reason: searchReason || "Authorized vehicle trajectory query",
        user_role: activeRole,
        username: "Investigator"
      });
      setSearchResult(res);
    } catch (err) {
      alert("Search failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportDossier = async () => {
    if (!searchResult || !searchResult.found) return;
    try {
      const res = await api.generateCaseDossier({
        plate: searchResult.plate,
        case_number: caseNumber,
        investigator: "Investigator Officer",
        reason: searchReason
      });
      setDossierExportData(res);
      window.print();
    } catch (e) {
      alert("Export failed: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PROMINENT CENTRAL SEARCH BAR (Clean, Normal White Theme) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h2 className="text-base font-bold text-gray-900 tracking-wide uppercase">
                Vadodara Vehicle Route &amp; Signal Speed Tracker
              </h2>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Enter vehicle registration number to reconstruct complete route across 4-lane traffic signals and compute average speed.
            </p>
          </div>

          {/* Quick 1-Click Demo Seeds */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Sample Vehicles:</span>
            <button
              onClick={() => {
                setPlateQuery("GJ06AB1234");
                executeSearch("GJ06AB1234");
              }}
              className="px-3 py-1 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition shadow-2xs"
            >
              GJ06AB1234 (4-Chowk Route)
            </button>
            <button
              onClick={() => {
                setPlateQuery("GJ06CC9901");
                executeSearch("GJ06CC9901");
              }}
              className="px-3 py-1 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 transition shadow-2xs"
            >
              GJ06CC9901 (Stolen Watchlist)
            </button>
            <button
              onClick={() => {
                setPlateQuery("MH02EE7722");
                executeSearch("MH02EE7722");
              }}
              className="px-3 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition shadow-2xs"
            >
              MH02EE7722 (Speed Clone)
            </button>
          </div>
        </div>

        {/* Large Prominent Search Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeSearch();
          }}
          className="flex flex-col sm:flex-row gap-3 pt-2"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={plateQuery}
              onChange={(e) => setPlateQuery(e.target.value.toUpperCase())}
              placeholder="Enter Registration No. (e.g. GJ 06 AB 1234)"
              className="w-full bg-white border-2 border-gray-300 focus:border-blue-600 rounded-xl pl-12 pr-4 py-3 text-lg font-mono font-bold tracking-widest text-gray-900 shadow-inner focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-blue-700 hover:bg-blue-800 text-white font-sans font-bold px-8 py-3 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            {loading ? (
              <span>Tracking Route...</span>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>TRACK ROUTE &amp; SPEED</span>
              </>
            )}
          </button>
        </form>

        {/* Search Options & Case Reference */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200 text-xs text-gray-600">
          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isFuzzy}
                onChange={(e) => setIsFuzzy(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="text-gray-700 font-medium">Fuzzy Tolerance (Handle OCR Ambiguities)</span>
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-500 font-medium">Case Audit Ref:</span>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              className="bg-gray-50 border border-gray-300 rounded px-2.5 py-1 text-gray-800 text-xs font-mono w-48 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 2. RESULTS SECTION */}
      {searchResult && searchResult.found && (
        <div className="space-y-6">
          {/* A. PROMINENT AVERAGE SPEED (Calculated Speed Telemetry) */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
                <Gauge className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Vehicle Average Speed
                </div>
                <div className="text-3xl font-black font-mono text-gray-900 flex items-baseline space-x-2">
                  <span>{searchResult.overall_average_speed_kmh}</span>
                  <span className="text-lg text-blue-700 font-semibold">km/h</span>
                  <span
                    className={`ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      searchResult.speed_badge === "compliant"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : searchResult.speed_badge === "moderate"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : "bg-red-50 text-red-800 border border-red-200 animate-pulse"
                    }`}
                  >
                    {searchResult.speed_status?.split("(")[0] || "Calculated"}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Vadodara Statutory Urban Limit: 50 km/h
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-xs text-gray-500 font-medium">Registration</div>
                <div className="text-base font-mono font-bold text-gray-900">{searchResult.plate}</div>
              </div>
            </div>
          </div>

          {/* B. AI ROUTE INTELLIGENCE SYNOPSIS BOX (Clean White/Blue Civic Card) */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-blue-200">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-blue-700" />
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Vehicle Route Intelligence Synopsis
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white border border-blue-200 text-blue-900 shadow-2xs">
                  REGISTRATION: {searchResult.plate}
                </span>
                <button
                  onClick={handleExportDossier}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold px-3 py-1 rounded-md text-xs transition shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT DOSSIER (PDF)</span>
                </button>
              </div>
            </div>

            <p className="text-sm font-sans text-gray-800 leading-relaxed mt-3">
              {searchResult.ai_route_summary}
            </p>
          </div>

          {/* C. TWO-COLUMN SPLIT: CHOWK-BY-CHOWK ROUTE TIMELINE + GOOGLE MAP */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Complete Route of Chowk (4-Lane Traffic Signals) Passed */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Milestone className="w-4 h-4 text-blue-700" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Chowks (4-Lane Traffic Signals) Passed
                  </h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Sequential Order
                </span>
              </div>

              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {searchResult.chowks_passed?.map((chowk, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-gray-200 hover:border-blue-300 rounded-xl p-4 shadow-sm transition space-y-2.5"
                  >
                    {/* Header with Step Number & Chowk Name */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          #{chowk.step}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 leading-tight">
                            {chowk.chowk_name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {chowk.road_zone}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 border border-gray-200 text-gray-700 shrink-0">
                        {chowk.direction}
                      </span>
                    </div>

                    {/* Telemetry info */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-gray-500">Timestamp:</span>{" "}
                        <strong className="text-gray-900 font-mono">{chowk.timestamp_utc?.substring(11, 19)} UTC</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">OCR Match:</span>{" "}
                        <strong className="text-emerald-700 font-semibold">{Math.round((chowk.ocr_confidence || 0.95) * 100)}% Verified</strong>
                      </div>
                    </div>

                    {/* Speed to Next Chowk */}
                    {chowk.speed_to_next_kmh && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-xs flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 text-blue-900 font-medium">
                          <ArrowRight className="w-3.5 h-3.5 text-blue-700" />
                          <span>Transit to Next Signal:</span>
                        </div>
                        <div className="text-right space-x-3">
                          <span className="text-gray-600">{chowk.distance_to_next_km} km ({chowk.time_to_next_min} min)</span>
                          <strong className="text-white bg-blue-700 px-2 py-0.5 rounded text-[11px]">
                            {chowk.speed_to_next_kmh} km/h
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Visual Evidence Plate Crop & Inspect */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      {chowk.evidence_plate_crop ? (
                        <div className="flex items-center space-x-2">
                          <img
                            src={chowk.evidence_plate_crop}
                            alt="Plate Crop"
                            className="h-6 rounded border border-gray-300 bg-white"
                          />
                          <span className="text-[11px] text-gray-600">Captured HSRP Plate</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-500">Signal CCTV Verified</span>
                      )}

                      <button
                        onClick={() => setInspectSighting(chowk)}
                        className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold border border-gray-300 transition flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Frame</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Vadodara GIS Map Visualizing Route Between Chowks (Google Maps) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-blue-700" />
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Vadodara Route Corridor Map
                  </h3>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Google Maps API Integration
                </span>
              </div>

              <GisMap
                cameras={[]}
                trajectory={searchResult.sightings}
                chowksPassed={searchResult.chowks_passed}
                height="580px"
              />
            </div>
          </div>
        </div>
      )}

      {/* No Results Found */}
      {searchResult && !searchResult.found && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center space-y-3 shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold text-gray-900 font-sans">
            NO SIGHTINGS FOUND FOR REGISTRATION {searchResult.plate}
          </h3>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            No active traffic camera node logged this plate in Vadodara during the active window. Try checking plate number or enable Fuzzy Tolerance above.
          </p>
        </div>
      )}

      {/* Evidence Modal */}
      {inspectSighting && (
        <EvidenceModal
          sighting={inspectSighting}
          onClose={() => setInspectSighting(null)}
          onSearchPlate={() => {}}
        />
      )}
    </div>
  );
}
