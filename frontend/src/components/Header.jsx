import React, { useState, useEffect } from "react";
import {
  Clock,
  Radio,
  Bell,
  Volume2,
  VolumeX,
  Play,
  Square,
  Sparkles,
  Database,
  UserCheck,
  ShieldCheck,
  Cpu,
  Navigation
} from "lucide-react";

export default function Header({
  activeRole,
  setActiveRole,
  globalFilters,
  setGlobalFilters,
  ingestStats,
  wsConnected,
  audioAlerts,
  setAudioAlerts,
  onOpenDemoScript,
  simulatorActive,
  onToggleSimulator
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const roles = [
    { id: "Traffic operator", label: "Traffic Operator" },
    { id: "Authorized investigator", label: "Authorized Investigator" },
    { id: "Supervisor", label: "Supervisor Officer" },
    { id: "System administrator", label: "System Administrator" }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      {/* 1. Indian Civic Decorative Accent Line (Saffron - White - Green hairline) - No logos */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[#FF9933] via-[#FFFFFF] to-[#138808]" />

      {/* 2. Top Civic Masthead Utility Bar */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between text-[11px] font-sans text-gray-600">
        <div className="flex items-center space-x-2">
          <span className="text-gray-900 font-bold tracking-wide">
            વડોદરા મહાનગરપાલિકા // VADODARA MUNICIPAL CORPORATION
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-blue-700 font-semibold">GUJARAT SMART CITY MISSION</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1.5 text-gray-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentTime.toLocaleTimeString()} (IST)</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-500">{currentTime.toISOString().substring(11, 19)} UTC</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-600" : "bg-amber-500"}`} />
            <span className={wsConnected ? "text-emerald-700 font-bold" : "text-amber-700 font-semibold"}>
              {wsConnected ? "4-LANE SIGNALS ONLINE" : "CONNECTING"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Main Portal Header Row */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4 bg-white">
        {/* Title and Identification (STRICTLY NO GOVERNMENT LOGOS) */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shadow-sm">
            <Navigation className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg font-bold tracking-tight text-gray-900 m-0 leading-tight">
                VADODARA INTELLIGENT TRAFFIC CONTROL SYSTEM
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-sans font-bold bg-blue-50 text-blue-700 border border-blue-200">
                GOV PORTAL v2.4
              </span>
            </div>
            <p className="text-xs text-gray-500 font-sans tracking-normal mt-0.5">
              Automated 4-Lane Signal Recognition &amp; Route Telemetry System // Vadodara City
            </p>
          </div>
        </div>

        {/* Quick Utility Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Traffic Simulator Quick Toggle */}
          <button
            onClick={onToggleSimulator}
            title="Toggle background synthetic traffic generation"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-semibold border transition ${
              simulatorActive
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {simulatorActive ? <Square className="w-3 h-3 text-emerald-600 fill-emerald-600" /> : <Play className="w-3 h-3 text-gray-500" />}
            <span>{simulatorActive ? "SIMULATOR: ON" : "SIMULATOR: OFF"}</span>
          </button>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioAlerts(!audioAlerts)}
            title="Toggle Audio Alert Chime"
            className={`p-2 rounded-lg border transition ${
              audioAlerts
                ? "bg-blue-50 border-blue-300 text-blue-700"
                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {audioAlerts ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* SIH Presentation Demo Script Modal Button */}
          <button
            onClick={onOpenDemoScript}
            className="flex items-center space-x-1.5 bg-blue-700 hover:bg-blue-800 text-white font-sans font-bold px-3 py-1.5 rounded-lg text-xs shadow-sm transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DEMO SCRIPT</span>
          </button>

          {/* Authorized Role Switcher */}
          <div className="flex items-center bg-white border border-gray-300 rounded-lg px-2.5 py-1 text-xs shadow-sm">
            <UserCheck className="w-3.5 h-3.5 text-gray-500 mr-1.5" />
            <select
              value={activeRole}
              onChange={(e) => setActiveRole(e.target.value)}
              className="bg-transparent text-gray-800 font-sans text-xs focus:outline-none cursor-pointer"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-white text-gray-800">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}
