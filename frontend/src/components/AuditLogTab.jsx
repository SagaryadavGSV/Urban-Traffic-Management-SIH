import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Search,
  Lock,
  Download,
  Filter,
  Clock,
  User,
  FileText
} from "lucide-react";
import { api } from "../api";

export default function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => {
    loadLogs();
  }, [filterAction]);

  const loadLogs = async () => {
    try {
      const data = await api.getAuditTrail({ action_type: filterAction });
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const actionBadges = {
    PLATE_SEARCH: "bg-blue-950/80 border-blue-600 text-blue-300",
    EVIDENCE_VIEW: "bg-purple-950/80 border-purple-600 text-purple-300",
    PLATE_UNMASK: "bg-amber-950/80 border-amber-600 text-amber-300",
    EXPORT_REPORT: "bg-emerald-950/80 border-emerald-600 text-emerald-300",
    BLACKLIST_UPDATE: "bg-red-950/80 border-red-600 text-red-300",
    ALERT_STATUS_CHANGE: "bg-sky-950/80 border-sky-600 text-sky-300",
    CAMERA_CONFIG: "bg-slate-800 text-slate-300"
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 font-mono tracking-wide">
              IMMUTABLE AUDIT LOG &amp; COMPLIANCE LEDGER (SECTION 2 &amp; 7)
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Cryptographic chain-of-custody logging all plate queries, evidence views, unmasks, and exports
            </p>
          </div>
        </div>

        {/* Filter dropdown */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Filter:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5"
          >
            <option value="all">All Sensitive Actions</option>
            <option value="PLATE_SEARCH">Plate Search</option>
            <option value="PLATE_UNMASK">Plate Unmask</option>
            <option value="EVIDENCE_VIEW">Evidence View</option>
            <option value="EXPORT_REPORT">Case Dossier Export</option>
            <option value="BLACKLIST_UPDATE">Watchlist Update</option>
            <option value="ALERT_STATUS_CHANGE">Alert Status Change</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3">AUDIT ID</th>
                <th className="pb-3">TIMESTAMP (UTC)</th>
                <th className="pb-3">OFFICER / ROLE</th>
                <th className="pb-3">ACTION TYPE</th>
                <th className="pb-3">TARGET RESOURCE</th>
                <th className="pb-3">JUSTIFICATION / REASON</th>
                <th className="pb-3">COMPLIANCE DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.map((log) => {
                const badge = actionBadges[log.action_type] || "bg-slate-800 text-slate-300";
                return (
                  <tr key={log.audit_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 font-bold text-slate-300">{log.audit_id}</td>
                    <td className="py-3 text-slate-400">
                      {log.timestamp_utc?.substring(0, 10)}{" "}
                      <span className="text-slate-200">{log.timestamp_utc?.substring(11, 19)}</span>
                    </td>
                    <td className="py-3">
                      <div className="text-slate-200 font-semibold">{log.username}</div>
                      <div className="text-[10px] text-slate-500">{log.user_role}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badge}`}>
                        {log.action_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-100">{log.resource_id}</td>
                    <td className="py-3 text-slate-300 max-w-[200px] truncate">{log.reason}</td>
                    <td className="py-3 text-[11px] text-slate-400 max-w-[220px] truncate">
                      {log.details || "IP: 127.0.0.1"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
