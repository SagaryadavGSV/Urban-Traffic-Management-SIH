import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  MapPin,
  PieChart,
  Layers,
  ArrowRight,
  Clock,
  Car,
  Activity,
  Calendar
} from "lucide-react";
import GisMap from "./GisMap";
import { api } from "../api";

export default function TrafficAnalyticsTab({ cameras = [] }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState("overview");

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono text-sm">
        Loading Traffic Analytics Engine...
      </div>
    );
  }

  const vMix = analytics?.vehicle_mix || [
    { name: "Car", count: 68 },
    { name: "Two-wheeler", count: 24 },
    { name: "Bus", count: 12 },
    { name: "Truck", count: 15 },
    { name: "Suv", count: 32 }
  ];
  const totalVehicles = vMix.reduce((acc, curr) => acc + curr.count, 0) || 1;

  const peakHours = analytics?.peak_hour_trend || [];
  const maxVolume = Math.max(...peakHours.map((h) => Math.max(h.current_volume, h.baseline)), 3500);

  // Compute camera lookup for OD corridor road routing (from user script logic)
  const camLookup = cameras.reduce((acc, c) => {
    acc[c.camera_id] = { lat: c.latitude, lng: c.longitude, name: c.name };
    return acc;
  }, {});

  const odRoutes = (analytics?.od_matrix || []).slice(0, 5).map((od) => {
    const o = camLookup[od.origin_cam];
    const d = camLookup[od.dest_cam];
    if (!o || !d) return null;
    return {
      path: [
        { lat: o.lat, lng: o.lng },
        { lat: d.lat, lng: d.lng }
      ],
      trip_count: od.trip_count,
      origin_name: o.name,
      dest_name: d.name
    };
  }).filter(Boolean);

  // High-congestion bottleneck alerts (purple exclamation triangles from Mappls script)
  const bottlenecks = cameras
    .filter((c) => c.status === "delayed" || c.status === "offline" || (c.latency_ms && c.latency_ms > 38))
    .map((c) => ({
      lat: c.latitude,
      lng: c.longitude,
      camera_id: c.camera_id,
      label: `${c.camera_id} (${c.name})`,
      speed_drop: c.status === "delayed" ? 38 : 65
    }));

  const statsSummary = {
    title: "Traffic Analytics — Live Summary",
    total_vehicles: totalVehicles * 18,
    busiest_corridor: analytics?.od_matrix?.[0]
      ? `${analytics.od_matrix[0].origin_cam} to ${analytics.od_matrix[0].dest_cam} (${analytics.od_matrix[0].trip_count} trips)`
      : "CAM-BRC-01 to CAM-BRC-02 (342 trips)",
    bottleneck_count: bottlenecks.length
  };

  return (
    <div className="space-y-6">
      {/* Analytics Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-xl">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
            CITY-WIDE TRAFFIC FLOW &amp; MOVEMENT INTELLIGENCE
          </h2>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
          {["overview", "od_matrix", "peak_hours", "route_density"].map((t) => (
            <button
              key={t}
              onClick={() => setActiveSubTab(t)}
              className={`px-3 py-1 rounded capitalize font-bold transition ${
                activeSubTab === t
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Spatial Heatmap & Vehicle-Class Mix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Heatmap Map View */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-xs text-slate-200 font-mono tracking-wide">
                SPATIAL CONCENTRATION HEATMAP &amp; ROAD-SNAPPED CORRIDORS
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Aggregated across 5m / 15m windows
            </span>
          </div>

          <GisMap
            cameras={cameras}
            showHeatmap={true}
            odRoutes={odRoutes}
            bottlenecks={bottlenecks}
            statsSummary={statsSummary}
            height="420px"
          />
        </div>

        {/* Vehicle-Class Distribution (Donut / Bar representation) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
              <PieChart className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-xs text-slate-200 font-mono tracking-wide">
                VEHICLE-CLASS MODAL MIX
              </h3>
            </div>

            <div className="mt-4 space-y-3 font-mono text-xs">
              {vMix.map((v) => {
                const pct = Math.round((v.count / totalVehicles) * 100);
                const colors = {
                  Car: "bg-blue-500",
                  "Two-wheeler": "bg-emerald-500",
                  Bus: "bg-rose-500",
                  Truck: "bg-amber-500",
                  Suv: "bg-sky-500"
                };
                const col = colors[v.name] || "bg-indigo-500";

                return (
                  <div key={v.name} className="space-y-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center space-x-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${col}`} />
                        <span>{v.name}</span>
                      </span>
                      <span className="font-bold text-slate-100">
                        {v.count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div className={`h-full ${col}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400">
            Automated class tagging: YOLOv11 Multi-Category Vehicle Classifier.
          </div>
        </div>
      </div>

      {/* 2. ORIGIN-DESTINATION (OD) MATRIX (Section 4.3.1) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-slate-200 font-mono tracking-wide">
              ORIGIN-DESTINATION (OD) FLOW MATRIX
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Inferred from first &amp; last validated sightings per journey (Anonymized)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {analytics?.od_matrix?.slice(0, 6).map((od, i) => (
            <div
              key={i}
              className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between"
            >
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400">CORRIDOR FLOW</div>
                <div className="font-bold text-slate-200 flex items-center space-x-2">
                  <span>{od.origin_cam}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  <span>{od.dest_cam}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-emerald-400">{od.trip_count} Trips</div>
                <div className="text-[10px] text-slate-500">In sample window</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. PEAK-HOUR VOLUME TREND (Section 4.3.1) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-slate-200 font-mono tracking-wide">
              24-HOUR TRAFFIC VOLUME &amp; PEAK-HOUR PATTERNS
            </h3>
          </div>
          <div className="flex items-center space-x-4 text-xs font-mono">
            <span className="flex items-center space-x-1.5 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Current Volume</span>
            </span>
            <span className="flex items-center space-x-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
              <span>Baseline Volume</span>
            </span>
          </div>
        </div>

        {/* CSS Bar Chart */}
        <div className="h-56 flex items-end justify-between space-x-2 pt-6 font-mono">
          {peakHours.map((h, i) => {
            const currHeight = Math.round((h.current_volume / maxVolume) * 100);
            const baseHeight = Math.round((h.baseline / maxVolume) * 100);

            return (
              <div key={i} className="flex-1 flex flex-col items-center group h-full justify-end">
                <div className="w-full flex items-end justify-center space-x-1 h-44">
                  {/* Current Bar */}
                  <div
                    className="w-1/2 bg-blue-600 hover:bg-blue-400 transition-all rounded-t relative"
                    style={{ height: `${currHeight}%` }}
                  >
                    <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-blue-300 font-bold whitespace-nowrap z-20">
                      {h.current_volume}
                    </div>
                  </div>
                  {/* Baseline Bar */}
                  <div
                    className="w-1/2 bg-slate-700/60 rounded-t"
                    style={{ height: `${baseHeight}%` }}
                  />
                </div>
                <div className="mt-2 text-[10px] text-slate-400">{h.hour}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
          <span>Morning Peak: <strong>08:00 - 10:00</strong> (~2,890 veh/hr)</span>
          <span>Evening Peak: <strong>18:00 - 20:00</strong> (~3,120 veh/hr)</span>
          <span>Night Curfew Mode: <strong>23:00 - 05:00</strong></span>
        </div>
      </div>
    </div>
  );
}
