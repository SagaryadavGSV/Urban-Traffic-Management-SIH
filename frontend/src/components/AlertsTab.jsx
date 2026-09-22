import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle,
  FileCheck,
  UserCheck,
  Zap,
  Filter,
  Eye,
  Plus,
  Trash2,
  Lock,
  Search
} from "lucide-react";
import EvidenceModal from "./EvidenceModal";
import { api } from "../api";

export default function AlertsTab({
  alerts = [],
  onUpdateAlertState,
  onNavigateToSearch,
  blacklist = [],
  onAddBlacklist,
  onRemoveBlacklist,
  activeRole
}) {
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedState, setSelectedState] = useState("all");

  const [inspectSighting, setInspectSighting] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("alerts_feed"); // alerts_feed | watchlist

  // New Blacklist Entry Form State
  const [newPlate, setNewPlate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newSeverity, setNewSeverity] = useState("Critical");
  const [newAgency, setNewAgency] = useState("Vadodara City Police / ITCS");

  const filteredAlerts = alerts.filter((a) => {
    if (selectedType !== "all" && a.alert_type !== selectedType) return false;
    if (selectedSeverity !== "all" && a.severity !== selectedSeverity) return false;
    if (selectedState !== "all" && a.state !== selectedState) return false;
    return true;
  });

  const handleCreateBlacklist = async (e) => {
    e.preventDefault();
    if (!newPlate.trim() || !newReason.trim()) return;

    if (activeRole !== "Supervisor" && activeRole !== "System administrator") {
      alert("Permission Denied (Section 2): Only Supervisors or Administrators can modify the active Watchlist.");
      return;
    }

    try {
      await onAddBlacklist({
        plate: newPlate.trim().toUpperCase(),
        reason: newReason.trim(),
        severity: newSeverity,
        source: newAgency,
        authorized_owner: "Inspector A. Saxena"
      });
      setNewPlate("");
      setNewReason("");
    } catch (err) {
      alert("Error adding plate: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              SECURITY ALERT CENTER &amp; WATCHLIST
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Automated high-priority detection alerts with mandatory reviewer verification
            </p>
          </div>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 font-mono text-xs">
          <button
            onClick={() => setActiveSubTab("alerts_feed")}
            className={`px-3 py-1.5 rounded font-bold transition ${
              activeSubTab === "alerts_feed"
                ? "bg-red-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Incident Feed ({alerts.length})
          </button>
          <button
            onClick={() => setActiveSubTab("watchlist")}
            className={`px-3 py-1.5 rounded font-bold transition ${
              activeSubTab === "watchlist"
                ? "bg-blue-600 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Watchlist Database ({blacklist.length})
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ALERTS FEED */}
      {activeSubTab === "alerts_feed" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Type:</span>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1"
                >
                  <option value="all">All Alert Types</option>
                  <option value="Blacklisted vehicle">Blacklisted Vehicle</option>
                  <option value="Impossible travel">Impossible Travel</option>
                  <option value="Restricted-zone entry">Restricted-zone Entry</option>
                  <option value="Camera/model health">Camera / Model Health</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Severity:</span>
                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1"
                >
                  <option value="all">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Lifecycle State:</span>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1"
                >
                  <option value="all">All States</option>
                  <option value="New">New</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Investigating">Investigating</option>
                  <option value="Resolved">Resolved</option>
                  <option value="False positive">False Positive</option>
                </select>
              </div>
            </div>

            <span className="text-slate-400">
              Showing {filteredAlerts.length} of {alerts.length} incidents
            </span>
          </div>

          {/* Alert Cards List */}
          <div className="space-y-3">
            {filteredAlerts.map((alertItem) => {
              const severityBadge = {
                Critical: "bg-red-950/80 border-red-600 text-red-300",
                High: "bg-amber-950/80 border-amber-600 text-amber-300",
                Medium: "bg-blue-950/80 border-blue-600 text-blue-300",
                Low: "bg-slate-800 text-slate-300"
              }[alertItem.severity] || "bg-slate-800 text-slate-300";

              const stateBadge = {
                New: "bg-red-500 text-white animate-pulse",
                Acknowledged: "bg-amber-500 text-slate-950",
                Investigating: "bg-blue-500 text-white",
                Resolved: "bg-emerald-600 text-white",
                "False positive": "bg-slate-700 text-slate-300"
              }[alertItem.state] || "bg-slate-800 text-slate-200";

              return (
                <div
                  key={alertItem.alert_id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 hover:border-slate-700 transition"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border uppercase tracking-wider ${severityBadge}`}>
                        {alertItem.severity}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {alertItem.alert_id}
                      </span>
                      <span className="text-sm font-bold text-slate-200 font-mono">
                        {alertItem.alert_type}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-black uppercase ${stateBadge}`}>
                        {alertItem.state}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {alertItem.timestamp_utc?.substring(11, 19)} UTC
                      </span>
                    </div>
                  </div>

                  {/* Body & Explanation */}
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 font-mono text-xs space-y-2">
                    <div className="text-slate-200 font-semibold leading-relaxed">
                      {alertItem.explanation}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>Vehicle Plate: <strong className="text-slate-100 font-bold">{alertItem.plate}</strong></span>
                      <span>Location: <strong className="text-slate-100">{alertItem.camera_name || alertItem.camera_id}</strong></span>
                      <span>Assigned Officer: <strong className="text-slate-100">{alertItem.assigned_user || "Unassigned"}</strong></span>
                    </div>
                  </div>

                  {/* Lifecycle Actions Bar (Section 4.4.2) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800 text-xs font-mono">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onNavigateToSearch(alertItem.plate)}
                        className="px-3 py-1.5 rounded bg-blue-600/80 hover:bg-blue-600 text-white font-bold transition flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reconstruct Path ({alertItem.plate})</span>
                      </button>
                    </div>

                    {/* State Transitions: New -> Acknowledged -> Investigating -> Resolved / False Positive */}
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500">Lifecycle Action:</span>
                      {alertItem.state === "New" && (
                        <button
                          onClick={() => onUpdateAlertState(alertItem.alert_id, "Acknowledged")}
                          className="px-2.5 py-1 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold hover:bg-amber-900 transition"
                        >
                          Acknowledge
                        </button>
                      )}
                      {(alertItem.state === "New" || alertItem.state === "Acknowledged") && (
                        <button
                          onClick={() => onUpdateAlertState(alertItem.alert_id, "Investigating")}
                          className="px-2.5 py-1 rounded bg-blue-950 border border-blue-700 text-blue-300 font-bold hover:bg-blue-900 transition"
                        >
                          Mark Investigating
                        </button>
                      )}
                      {alertItem.state !== "Resolved" && (
                        <button
                          onClick={() => onUpdateAlertState(alertItem.alert_id, "Resolved")}
                          className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 font-bold hover:bg-emerald-900 transition"
                        >
                          Resolve Alert
                        </button>
                      )}
                      {alertItem.state !== "False positive" && (
                        <button
                          onClick={() => onUpdateAlertState(alertItem.alert_id, "False positive")}
                          className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition"
                        >
                          False Positive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: WATCHLIST DATABASE MANAGEMENT */}
      {activeSubTab === "watchlist" && (
        <div className="space-y-6">
          {/* Add to Watchlist Form (Supervisor / Admin only) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100 font-mono tracking-wide">
                  REGISTER NEW WATCHLIST VEHICLE
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Supervisor / Admin authorization required
              </span>
            </div>

            <form onSubmit={handleCreateBlacklist} className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-bold">PLATE NUMBER</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. DL04XY8899"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100 font-bold tracking-wider"
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-slate-300 font-bold">REASON / CHARGE</label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="e.g. Suspected in burglary / FIR #1209"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-100"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-bold">SEVERITY</label>
                <div className="flex space-x-2">
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-2 text-slate-200"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Active Watchlist Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="font-bold text-sm text-slate-200 font-mono tracking-wide pb-3 border-b border-slate-800">
              ACTIVE POLICE &amp; ENFORCEMENT WATCHLIST
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2">PLATE</th>
                    <th className="pb-2">REASON</th>
                    <th className="pb-2">SEVERITY</th>
                    <th className="pb-2">ORIGIN AGENCY</th>
                    <th className="pb-2">DATE ADDED</th>
                    <th className="pb-2">AUTHORIZED OFFICER</th>
                    <th className="pb-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {blacklist.map((item) => (
                    <tr key={item.plate} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 font-bold text-slate-100 text-sm tracking-widest">
                        {item.plate}
                      </td>
                      <td className="py-3 text-slate-300">{item.reason}</td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                            item.severity === "Critical"
                              ? "bg-red-950 border-red-700 text-red-300"
                              : "bg-amber-950 border-amber-700 text-amber-300"
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">{item.source}</td>
                      <td className="py-3 text-slate-400">{item.start_date}</td>
                      <td className="py-3 text-slate-300">{item.authorized_owner}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onRemoveBlacklist(item.plate)}
                          className="p-1 rounded text-red-400 hover:bg-red-950/60 transition"
                          title="Remove from watchlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
