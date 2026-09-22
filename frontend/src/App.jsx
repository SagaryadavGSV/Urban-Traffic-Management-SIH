import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import LiveOverviewTab from "./components/LiveOverviewTab";
import VehicleSearchTab from "./components/VehicleSearchTab";
import TrafficAnalyticsTab from "./components/TrafficAnalyticsTab";
import AlertsTab from "./components/AlertsTab";
import CameraManagerTab from "./components/CameraManagerTab";
import ModelQualityTab from "./components/ModelQualityTab";
import ExternalIntegrationTab from "./components/ExternalIntegrationTab";
import AuditLogTab from "./components/AuditLogTab";
import DemoScriptModal from "./components/DemoScriptModal";
import { api } from "./api";

// Web Audio API chime synthesizer for alert cues
function playAlertSound(isCritical = false) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = isCritical ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isCritical ? 880 : 587.33, audioCtx.currentTime); // A5 or D5
    if (isCritical) {
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
    }

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (e) {
    // Audio Context not permitted or muted
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [activeRole, setActiveRole] = useState("Authorized investigator");
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [simulatorActive, setSimulatorActive] = useState(false);
  const [isDemoScriptOpen, setIsDemoScriptOpen] = useState(false);

  // Global Shared Filters (Section 3.1)
  const [globalFilters, setGlobalFilters] = useState({
    timeRange: "live",
    cameraZone: "all",
    vehicleType: "all",
    minConfidence: 0.70
  });

  // Data states
  const [kpis, setKpis] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [congestionData, setCongestionData] = useState([]);
  const [blacklist, setBlacklist] = useState([]);
  const [ingestStats, setIngestStats] = useState(null);

  const [wsConnected, setWsConnected] = useState(false);
  const [searchTargetPlate, setSearchTargetPlate] = useState("");
  const wsRef = useRef(null);

  // Initial Data Fetch
  useEffect(() => {
    refreshAllData();
  }, [globalFilters]);

  const refreshAllData = async () => {
    try {
      const [kpisRes, camsRes, evsRes, alertsRes, congRes, blRes, statsRes] = await Promise.all([
        api.getOverviewKpis().catch(() => null),
        api.getCameras().catch(() => []),
        api.getRecentEvents({
          camera_id: globalFilters.cameraZone !== "all" ? globalFilters.cameraZone : undefined,
          vehicle_type: globalFilters.vehicleType !== "all" ? globalFilters.vehicleType : undefined,
          min_confidence: globalFilters.minConfidence
        }).catch(() => ({ events: [] })),
        api.getAlerts().catch(() => []),
        api.getCongestionRanking().catch(() => []),
        api.getBlacklist().catch(() => []),
        api.getIngestStats().catch(() => null)
      ]);

      if (kpisRes) setKpis(kpisRes);
      if (camsRes) setCameras(camsRes);
      if (evsRes?.events) setRecentEvents(evsRes.events);
      if (alertsRes) setAlerts(alertsRes);
      if (congRes) setCongestionData(congRes);
      if (blRes) setBlacklist(blRes);
      if (statsRes) setIngestStats(statsRes);
    } catch (e) {
      console.error("Data refresh error:", e);
    }
  };

  // WebSocket live streaming connection with fallback simulation ticker
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;
    let retryCount = 0;
    let retryTimer = null;
    let simulationTimer = null;

    function startSimulationTicker() {
      if (simulationTimer) return;
      const plates = ["GJ06AB1234", "GJ06BC8821", "DL03CC9901", "MH02EE7722", "GJ01XY4411", "GJ06KK5509", "GJ06LM7712", "GJ06ZZ9944"];
      const vTypes = ["car", "two-wheeler", "suv", "truck"];
      simulationTimer = setInterval(() => {
        setCameras((curCams) => {
          if (!curCams || curCams.length === 0) return curCams;
          const randomCam = curCams[Math.floor(Math.random() * curCams.length)];
          const randomPlate = plates[Math.floor(Math.random() * plates.length)];
          const randomType = vTypes[Math.floor(Math.random() * vTypes.length)];
          const newEvent = {
            event_id: `EVT-LIVE-${Date.now()}`,
            plate_text: randomPlate,
            camera_id: randomCam.camera_id,
            camera_name: randomCam.name,
            vehicle_type: randomType,
            confidence: Number((0.92 + Math.random() * 0.07).toFixed(2)),
            ocr_confidence: Number((0.92 + Math.random() * 0.07).toFixed(2)),
            timestamp_utc: new Date().toISOString(),
            speed_estimate_kmh: Math.floor(35 + Math.random() * 25),
            lane_number: Math.floor(Math.random() * (randomCam.lane_count || 4)) + 1,
            image_snapshot_url: null
          };

          setRecentEvents((prev) => [newEvent, ...(prev || []).slice(0, 49)]);
          setIngestStats((prev) => ({
            ...prev,
            total_events_ingested: (prev?.total_events_ingested || 48920) + 1,
            last_event_time: newEvent.timestamp_utc
          }));
          return curCams;
        });
      }, 4000);
    }

    function connectWs() {
      // If host is a static hosting platform (like github.io), don't spam failed WS attempts
      if (window.location.hostname.includes("github.io") || window.location.hostname.includes("vercel.app") || window.location.hostname.includes("surge.sh")) {
        startSimulationTicker();
        return;
      }

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setWsConnected(true);
          retryCount = 0;
          if (simulationTimer) {
            clearInterval(simulationTimer);
            simulationTimer = null;
          }
        };

        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "NEW_ANPR_EVENT") {
              setRecentEvents((prev) => [msg.event, ...prev.slice(0, 49)]);
              if (msg.alerts && msg.alerts.length > 0) {
                setAlerts((prev) => [...msg.alerts, ...prev]);
                if (audioAlerts) {
                  const hasCritical = msg.alerts.some((a) => a.severity === "Critical");
                  playAlertSound(hasCritical);
                }
              }
              setIngestStats((prev) => ({
                ...prev,
                total_events_ingested: (prev?.total_events_ingested || 0) + 1,
                last_event_time: msg.event.timestamp_utc
              }));
            } else if (msg.type === "ALERT_STATE_CHANGED") {
              setAlerts((prev) =>
                prev.map((a) => (a.alert_id === msg.alert_id ? { ...a, state: msg.new_state } : a))
              );
            } else if (msg.type === "CAMERA_STATUS_UPDATE") {
              setCameras((prev) =>
                prev.map((c) => (c.camera_id === msg.camera_id ? { ...c, status: msg.status } : c))
              );
            }
          } catch (e) {
            console.error("WS Parse error:", e);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          startSimulationTicker();
          retryCount++;
          const delay = Math.min(3000 * Math.pow(1.5, retryCount), 30000);
          retryTimer = setTimeout(connectWs, delay);
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch (err) {
        startSimulationTicker();
      }
    }

    connectWs();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (retryTimer) clearTimeout(retryTimer);
      if (simulationTimer) clearInterval(simulationTimer);
    };
  }, [audioAlerts]);

  // Handlers
  const handleNavigateToSearch = (plate) => {
    setSearchTargetPlate(plate);
    setActiveTab("search");
  };

  const handleUpdateAlertState = async (alertId, newState) => {
    try {
      await api.updateAlertState(alertId, {
        state: newState,
        user_role: activeRole,
        username: "Investigator"
      });
      setAlerts((prev) =>
        prev.map((a) => (a.alert_id === alertId ? { ...a, state: newState } : a))
      );
    } catch (e) {
      alert("Failed to update alert: " + e.message);
    }
  };

  const handleAddBlacklist = async (payload) => {
    await api.addBlacklist({
      ...payload,
      user_role: activeRole
    });
    const updated = await api.getBlacklist();
    setBlacklist(updated);
  };

  const handleRemoveBlacklist = async (plate) => {
    await api.removeBlacklist(plate, {
      user_role: activeRole,
      username: "Supervisor"
    });
    const updated = await api.getBlacklist();
    setBlacklist(updated);
  };

  const handleToggleCameraStatus = async (cameraId, status) => {
    await api.toggleCameraStatus(cameraId, status);
    setCameras((prev) =>
      prev.map((c) => (c.camera_id === cameraId ? { ...c, status } : c))
    );
  };

  const handleToggleSimulator = async () => {
    const nextState = !simulatorActive;
    try {
      await api.toggleSimulator(nextState);
      setSimulatorActive(nextState);
    } catch (e) {
      alert("Simulator error: " + e.message);
    }
  };

  const handleTriggerScenario = async (scenario) => {
    try {
      const res = await api.triggerScenario(scenario);
      if (res.alerts_triggered > 0 && audioAlerts) {
        playAlertSound(true);
      }
      return res;
    } catch (e) {
      alert("Scenario trigger failed: " + e.message);
    }
  };

  const handleUnmaskPlate = async (plateText, eventId) => {
    try {
      await api.logAuditAction({
        user_role: activeRole,
        username: "Investigating Officer",
        action_type: "PLATE_UNMASK",
        resource_id: plateText,
        reason: "Visual verification of suspect license plate",
        details: `Unmasked event ${eventId} in live monitor`
      });
    } catch (e) {
      console.error("Audit log failed:", e);
    }
  };

  const tabs = [
    { id: "search", label: "Vehicle Route & Speed Tracking", primary: true },
    { id: "cameras", label: "Vadodara 4-Lane Signal Network" },
    {
      id: "alerts",
      label: "Traffic Alerts & Watchlist",
      badge: alerts.filter((a) => a.state === "New").length
    },
    { id: "integration", label: "External Ingestion & Map API", highlight: true },
    { id: "overview", label: "Operations Overview" },
    { id: "analytics", label: "Traffic Analytics" },
    { id: "quality", label: "Model Quality" },
    { id: "audit", label: "Audit Ledger" }
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        globalFilters={globalFilters}
        setGlobalFilters={setGlobalFilters}
        ingestStats={ingestStats}
        wsConnected={wsConnected}
        audioAlerts={audioAlerts}
        setAudioAlerts={setAudioAlerts}
        onOpenDemoScript={() => setIsDemoScriptOpen(true)}
        simulatorActive={simulatorActive}
        onToggleSimulator={handleToggleSimulator}
      />

      {/* Navigation Tabs Bar - Clean Civic White Styling */}
      <div className="bg-white border-b border-gray-200 px-4 shadow-xs">
        <nav className="flex space-x-2 overflow-x-auto py-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-blue-700 text-white font-semibold shadow-xs"
                    : tab.highlight
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 p-4 lg:p-6 max-w-[1680px] w-full mx-auto">
        {activeTab === "overview" && (
          <LiveOverviewTab
            kpis={kpis}
            cameras={cameras}
            recentEvents={recentEvents}
            alerts={alerts}
            congestionData={congestionData}
            onNavigateToSearch={handleNavigateToSearch}
            activeRole={activeRole}
            onUnmaskPlate={handleUnmaskPlate}
          />
        )}

        {activeTab === "search" && (
          <VehicleSearchTab
            initialPlate={searchTargetPlate}
            activeRole={activeRole}
            onLogAudit={(action, res, reason) =>
              api.logAuditAction({
                user_role: activeRole,
                username: "Investigator",
                action_type: action,
                resource_id: res,
                reason
              })
            }
          />
        )}

        {activeTab === "analytics" && (
          <TrafficAnalyticsTab cameras={cameras} />
        )}

        {activeTab === "alerts" && (
          <AlertsTab
            alerts={alerts}
            onUpdateAlertState={handleUpdateAlertState}
            onNavigateToSearch={handleNavigateToSearch}
            blacklist={blacklist}
            onAddBlacklist={handleAddBlacklist}
            onRemoveBlacklist={handleRemoveBlacklist}
            activeRole={activeRole}
          />
        )}

        {activeTab === "cameras" && (
          <CameraManagerTab
            cameras={cameras}
            onToggleCameraStatus={handleToggleCameraStatus}
          />
        )}

        {activeTab === "quality" && (
          <ModelQualityTab />
        )}

        {activeTab === "integration" && (
          <ExternalIntegrationTab
            ingestStats={ingestStats}
            onTriggerScenario={handleTriggerScenario}
            cameras={cameras}
          />
        )}

        {activeTab === "audit" && (
          <AuditLogTab />
        )}
      </main>

      {/* Official Government Civic Portal Footer (Strictly Zero Logos) */}
      <footer className="mt-auto bg-white border-t border-gray-200 px-4 py-3.5 text-center text-xs text-gray-600 shadow-xs">
        <div className="max-w-[1680px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-left">
            <div className="text-gray-900 font-bold">
              વડોદરા મહાનગરપાલિકા • સ્માર્ટ સિટી મિશન // VADODARA MUNICIPAL CORPORATION
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Intelligent Traffic Control System (ITCS) • Automated 4-Lane Signal Recognition &amp; Route Telemetry
            </div>
          </div>
          <div className="text-right text-[11px] text-gray-600">
            <div>Official Portal // Google Maps Road Telemetry Engine</div>
            <div className="text-gray-400">Strictly for authorized municipal &amp; traffic surveillance</div>
          </div>
        </div>
      </footer>

      {/* Interactive SIH Presentation Script Modal */}
      <DemoScriptModal
        isOpen={isDemoScriptOpen}
        onClose={() => setIsDemoScriptOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onTriggerScenario={handleTriggerScenario}
        onSearchPlate={handleNavigateToSearch}
      />
    </div>
  );
}
