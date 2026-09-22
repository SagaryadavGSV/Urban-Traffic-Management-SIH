/**
 * API client for the City-Wide ANPR Platform.
 * Connects to local/remote companion backend, and seamlessly falls back to high-fidelity
 * mock data when hosted as a standalone web application (GitHub Pages / Vercel).
 */

import {
  MOCK_CAMERAS,
  MOCK_KPIS,
  MOCK_CONGESTION,
  MOCK_BLACKLIST,
  MOCK_ALERTS,
  MOCK_ANALYTICS,
  MOCK_MODEL_METRICS,
  generateMockEvents,
  generateMockTrajectory
} from "./mockData";

// Default to relative /api/v1 (proxied by Vite or served directly by FastAPI)
let BASE_URL = localStorage.getItem("anpr_api_base_url") || "/api/v1";

export function getApiBaseUrl() {
  return BASE_URL;
}

export function setApiBaseUrl(url) {
  BASE_URL = url;
  localStorage.setItem("anpr_api_base_url", url);
}

// In-memory mock store for interactive demo mutations
let mockAlertsStore = [...MOCK_ALERTS];
let mockBlacklistStore = [...MOCK_BLACKLIST];
let mockCamerasStore = [...MOCK_CAMERAS];
let mockAuditStore = [
  {
    audit_id: "AUD-2026-001",
    timestamp_utc: new Date(Date.now() - 600000).toISOString(),
    username: "Investigator Patel",
    user_role: "Authorized investigator",
    action_type: "PLATE_LOOKUP",
    resource_id: "GJ06AB1234",
    reason: "Official Inquiry: Routine Vehicle Route Analysis",
    details: "Reconstructed 4-camera trajectory sequence"
  },
  {
    audit_id: "AUD-2026-002",
    timestamp_utc: new Date(Date.now() - 300000).toISOString(),
    username: "Supervisor Shah",
    user_role: "Supervisor",
    action_type: "ALERT_ACKNOWLEDGE",
    resource_id: "ALT-2026-001",
    reason: "Dispatching intercept unit to Railway Station Central Junction",
    details: "Status moved to Investigating"
  }
];

export async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`HTTP ${res.status}: ${errBody}`);
    }
    return await res.json();
  } catch (err) {
    // Graceful fallback to mock data when deployed statically without backend
    console.warn(`[ANPR Gateway] Live backend unreachable at ${url}. Serving high-fidelity fallback data.`);
    throw err;
  }
}

// Resilient API object with automatic demo fallback
export const api = {
  getOverviewKpis: async () => {
    try {
      return await fetchJson("/overview/kpis");
    } catch {
      return MOCK_KPIS;
    }
  },

  getRecentEvents: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      return await fetchJson(`/anpr_events/recent?${q}`);
    } catch {
      return { events: generateMockEvents(25) };
    }
  },

  ingestEvent: async (payload) => {
    try {
      return await fetchJson("/anpr_events", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      return { status: "ingested_mock", event_id: `EVT-DEMO-${Date.now()}` };
    }
  },

  searchTrajectory: async (payload) => {
    try {
      return await fetchJson("/search/trajectory", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      return generateMockTrajectory(payload.plate_text);
    }
  },

  getCongestionRanking: async () => {
    try {
      return await fetchJson("/congestion/ranking");
    } catch {
      return MOCK_CONGESTION;
    }
  },

  getAnalytics: async () => {
    try {
      return await fetchJson("/analytics/overview");
    } catch {
      return MOCK_ANALYTICS;
    }
  },

  getAlerts: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      return await fetchJson(`/alerts?${q}`);
    } catch {
      return mockAlertsStore;
    }
  },

  updateAlertState: async (alertId, payload) => {
    try {
      return await fetchJson(`/alerts/${alertId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
    } catch {
      mockAlertsStore = mockAlertsStore.map((a) =>
        a.alert_id === alertId ? { ...a, state: payload.state } : a
      );
      return { status: "success", alert_id: alertId, new_state: payload.state };
    }
  },

  getBlacklist: async () => {
    try {
      return await fetchJson("/blacklist");
    } catch {
      return mockBlacklistStore;
    }
  },

  addBlacklist: async (payload) => {
    try {
      return await fetchJson("/blacklist", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      const newEntry = {
        plate_text: payload.plate_text,
        reason: payload.reason || "MANUAL_ENTRY",
        fir_number: payload.fir_number || "FIR-DEMO-2026",
        vehicle_model: payload.vehicle_model || "Unknown",
        created_at: new Date().toISOString()
      };
      mockBlacklistStore = [newEntry, ...mockBlacklistStore];
      return { status: "success" };
    }
  },

  removeBlacklist: async (plate, payload = {}) => {
    try {
      const q = new URLSearchParams(payload).toString();
      return await fetchJson(`/blacklist/${plate}?${q}`, {
        method: "DELETE"
      });
    } catch {
      mockBlacklistStore = mockBlacklistStore.filter((b) => b.plate_text !== plate);
      return { status: "success" };
    }
  },

  getCameras: async () => {
    try {
      return await fetchJson("/cameras");
    } catch {
      return mockCamerasStore;
    }
  },

  toggleCameraStatus: async (cameraId, status) => {
    try {
      return await fetchJson(`/cameras/${cameraId}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
    } catch {
      mockCamerasStore = mockCamerasStore.map((c) =>
        c.camera_id === cameraId ? { ...c, status } : c
      );
      return { status: "success", camera_id: cameraId, status };
    }
  },

  getModelMetrics: async () => {
    try {
      return await fetchJson("/model_metrics");
    } catch {
      return MOCK_MODEL_METRICS;
    }
  },

  getAuditTrail: async (params = {}) => {
    try {
      const q = new URLSearchParams(params).toString();
      return await fetchJson(`/audit?${q}`);
    } catch {
      return mockAuditStore;
    }
  },

  logAuditAction: async (payload) => {
    try {
      return await fetchJson("/audit/log", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      mockAuditStore.unshift({
        audit_id: `AUD-DEMO-${Date.now()}`,
        timestamp_utc: new Date().toISOString(),
        ...payload
      });
      return { status: "logged_locally" };
    }
  },

  getIngestStats: async () => {
    try {
      return await fetchJson("/ingest/stats");
    } catch {
      return {
        total_events_ingested: 48920,
        events_per_second: 3.9,
        active_workers: 4,
        uptime_seconds: 86400
      };
    }
  },

  triggerScenario: async (scenario) => {
    try {
      return await fetchJson("/simulator/trigger_scenario", {
        method: "POST",
        body: JSON.stringify({ scenario })
      });
    } catch {
      let scenarioAlert = null;
      if (scenario === "stolen_vehicle") {
        scenarioAlert = {
          alert_id: `ALT-SCENARIO-${Date.now()}`,
          alert_type: "BLACKLIST_HIT",
          severity: "Critical",
          plate_text: "DL03CC9901",
          camera_id: "CAM-BRC-03",
          camera_name: "Railway Station Central Junction Chowk",
          vehicle_type: "car",
          timestamp_utc: new Date().toISOString(),
          state: "New",
          description: "DEMO SCENARIO: Stolen Vehicle FIR match triggered at Railway Station Central",
          confidence: 0.98,
          speed_kmh: 46.0
        };
      } else if (scenario === "impossible_travel") {
        scenarioAlert = {
          alert_id: `ALT-SCENARIO-${Date.now()}`,
          alert_type: "IMPOSSIBLE_TRAVEL",
          severity: "Critical",
          plate_text: "MH02EE7722",
          camera_id: "CAM-BRC-06",
          camera_name: "Makarpura GIDC Industrial Corridor",
          vehicle_type: "car",
          timestamp_utc: new Date().toISOString(),
          state: "New",
          description: "DEMO SCENARIO: Impossible Travel / Cloned Plate Sighting (1,374 km/h delta)",
          confidence: 0.99,
          speed_kmh: 1374.0
        };
      }

      if (scenarioAlert) {
        mockAlertsStore.unshift(scenarioAlert);
        return {
          status: "triggered",
          scenario,
          alerts_triggered: 1,
          alert: scenarioAlert
        };
      }
      return { status: "triggered", scenario, alerts_triggered: 0 };
    }
  },

  toggleSimulator: async (enabled) => {
    try {
      return await fetchJson("/simulator/toggle", {
        method: "POST",
        body: JSON.stringify({ enabled })
      });
    } catch {
      return { status: "success", enabled };
    }
  },

  generateCaseDossier: async (payload) => {
    try {
      return await fetchJson("/export/dossier", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      return {
        dossier_id: `DOS-VADODARA-${Date.now()}`,
        timestamp_utc: new Date().toISOString(),
        plate: payload.plate_text,
        case_number: payload.case_number || "CASE-2026-DEMO",
        investigator: payload.username || "Investigating Officer",
        digital_audit_hash: "SHA256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
        status: "APPROVED_FOR_OFFICIAL_USE"
      };
    }
  },

  getMapConfig: async () => {
    try {
      return await fetchJson("/config/map");
    } catch {
      return {
        provider: "google",
        api_key: "cxinshjifskvjnrmnvpnpvidwbtdkqgvwqtm",
        tile_url: "",
        city: "Vadodara",
        center_lat: 22.3072,
        center_lng: 73.1812,
        zoom: 13,
        status: "active"
      };
    }
  },

  updateMapConfig: async (payload) => {
    try {
      return await fetchJson("/config/map", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    } catch {
      return { status: "success", config: payload };
    }
  }
};
