/**
 * High-Fidelity Mock & Demo Data Engine for City-Wide ANPR Command Center.
 * Enables 100% interactive operation when hosted statically (e.g. GitHub Pages / Vercel).
 */

export const MOCK_CAMERAS = [
  {
    camera_id: "CAM-BRC-01",
    name: "Kala Ghoda Chowk (4-Lane Traffic Signal)",
    latitude: 22.3128,
    longitude: 73.1895,
    road_zone: "Sayaji Heritage & University Zone",
    direction: "Northbound",
    lane_count: 4,
    status: "online",
    latency_ms: 35.4,
    fps: 25.0,
    throughput_epm: 48,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-08-22"
  },
  {
    camera_id: "CAM-BRC-02",
    name: "Alkapuri R.C. Dutt Road Chowk (4-Lane Traffic Signal)",
    latitude: 22.3105,
    longitude: 73.1720,
    road_zone: "Alkapuri Commercial District",
    direction: "Westbound",
    lane_count: 4,
    status: "online",
    latency_ms: 38.0,
    fps: 25.0,
    throughput_epm: 62,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-08-20"
  },
  {
    camera_id: "CAM-BRC-03",
    name: "Railway Station Central Junction Chowk (4-Lane Traffic Signal)",
    latitude: 22.3100,
    longitude: 73.1815,
    road_zone: "Station Central Traffic Hub",
    direction: "Eastbound",
    lane_count: 4,
    status: "online",
    latency_ms: 41.2,
    fps: 25.0,
    throughput_epm: 78,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-09-02"
  },
  {
    camera_id: "CAM-BRC-04",
    name: "Akota - Dandia Bazar Bridge Chowk (6-Lane Cable Bridge Signal)",
    latitude: 22.2980,
    longitude: 73.1850,
    road_zone: "Akota Cable Bridge Flyover Corridor",
    direction: "Southeast",
    lane_count: 6,
    status: "online",
    latency_ms: 32.5,
    fps: 30.0,
    throughput_epm: 92,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-08-14"
  },
  {
    camera_id: "CAM-BRC-05",
    name: "Fatehgunj Circle Chowk (4-Lane Traffic Signal)",
    latitude: 22.3240,
    longitude: 73.1900,
    road_zone: "Fatehgunj University Corridor",
    direction: "Northbound",
    lane_count: 4,
    status: "online",
    latency_ms: 44.0,
    fps: 24.8,
    throughput_epm: 55,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-09-10"
  },
  {
    camera_id: "CAM-BRC-06",
    name: "Makarpura GIDC Industrial Corridor (4-Lane Highway Signal)",
    latitude: 22.2510,
    longitude: 73.1950,
    road_zone: "Industrial South Gateway",
    direction: "Southbound",
    lane_count: 4,
    status: "delayed",
    latency_ms: 124.0,
    fps: 18.2,
    throughput_epm: 39,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-07-28"
  },
  {
    camera_id: "CAM-BRC-07",
    name: "Amit Nagar Circle VIP Road Chowk (4-Lane Traffic Signal)",
    latitude: 22.3320,
    longitude: 73.2080,
    road_zone: "VIP Road Airport Corridor",
    direction: "Eastbound",
    lane_count: 4,
    status: "online",
    latency_ms: 36.1,
    fps: 25.0,
    throughput_epm: 64,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-08-30"
  },
  {
    camera_id: "CAM-BRC-08",
    name: "Gotri Sevasi Road Junction Chowk (4-Lane Traffic Signal)",
    latitude: 22.3160,
    longitude: 73.1490,
    road_zone: "West Suburban Growth Corridor",
    direction: "Westbound",
    lane_count: 4,
    status: "offline",
    latency_ms: 0.0,
    fps: 0.0,
    throughput_epm: 0,
    model_version: "YOLOv11-Plate-v2.3+CRNN-v1.8",
    last_maintenance: "2026-08-05"
  }
];

export const MOCK_KPIS = {
  active_cameras: 8,
  cameras: {
    total: 8,
    online: 6,
    delayed: 1,
    offline: 1
  },
  total_detections_today: 48920,
  events_per_minute: 236,
  active_alerts: 4,
  critical_alerts: 2,
  capture_rate_pct: 98.4,
  avg_ocr_confidence_pct: 94.6,
  impossible_travel_count: 2,
  blacklist_hits_today: 9,
  system_status: "OPERATIONAL"
};

export const MOCK_CONGESTION = [
  {
    camera_id: "CAM-BRC-03",
    name: "Railway Station Central Junction Chowk",
    current_volume_vph: 1840,
    capacity_vph: 2000,
    occupancy_pct: 92.0,
    congestion_level: "High",
    color: "#EF4444",
    trend: "increasing"
  },
  {
    camera_id: "CAM-BRC-04",
    name: "Akota - Dandia Bazar Bridge Chowk",
    current_volume_vph: 1620,
    capacity_vph: 2200,
    occupancy_pct: 73.6,
    congestion_level: "Moderate",
    color: "#F59E0B",
    trend: "stable"
  },
  {
    camera_id: "CAM-BRC-02",
    name: "Alkapuri R.C. Dutt Road Chowk",
    current_volume_vph: 1350,
    capacity_vph: 1900,
    occupancy_pct: 71.1,
    congestion_level: "Moderate",
    color: "#F59E0B",
    trend: "stable"
  },
  {
    camera_id: "CAM-BRC-01",
    name: "Kala Ghoda Chowk",
    current_volume_vph: 1120,
    capacity_vph: 1800,
    occupancy_pct: 62.2,
    congestion_level: "Normal",
    color: "#10B981",
    trend: "decreasing"
  }
];

export const MOCK_BLACKLIST = [
  {
    plate_text: "DL03CC9901",
    reason: "CRIMINAL_WATCHLIST",
    fir_number: "FIR-2026-CR-89412",
    vehicle_model: "Hyundai Creta (White)",
    created_at: "2026-09-01T08:00:00Z"
  },
  {
    plate_text: "MH02EE7722",
    reason: "CLONED_PLATE_SUSPECT",
    fir_number: "FIR-2026-TR-44109",
    vehicle_model: "Honda City (Silver)",
    created_at: "2026-09-10T11:20:00Z"
  },
  {
    plate_text: "GJ01XY4411",
    reason: "WARRANT_OF_ARREST",
    fir_number: "FIR-2026-SP-10992",
    vehicle_model: "Mahindra Scorpio (Black)",
    created_at: "2026-09-15T14:45:00Z"
  }
];

export const MOCK_ALERTS = [
  {
    alert_id: "ALT-2026-001",
    alert_type: "BLACKLIST_HIT",
    severity: "Critical",
    plate_text: "DL03CC9901",
    camera_id: "CAM-BRC-03",
    camera_name: "Railway Station Central Junction Chowk",
    vehicle_type: "car",
    timestamp_utc: new Date(Date.now() - 180000).toISOString(),
    state: "Investigating",
    description: "Wanted vehicle identified on state criminal database (FIR-2026-CR-89412 - Stolen Vehicle Alert)",
    confidence: 0.96,
    speed_kmh: 42.5
  },
  {
    alert_id: "ALT-2026-002",
    alert_type: "IMPOSSIBLE_TRAVEL",
    severity: "Critical",
    plate_text: "MH02EE7722",
    camera_id: "CAM-BRC-06",
    camera_name: "Makarpura GIDC Industrial Corridor",
    vehicle_type: "car",
    timestamp_utc: new Date(Date.now() - 420000).toISOString(),
    state: "New",
    description: "Cloned Plate Suspected! Vehicle traversed 8.4 km in 22 seconds (Apparent Speed: 1,374 km/h, exceeding physical threshold)",
    confidence: 0.98,
    speed_kmh: 1374.0
  },
  {
    alert_id: "ALT-2026-003",
    alert_type: "SPEED_VIOLATION",
    severity: "Warning",
    plate_text: "GJ06BC8821",
    camera_id: "CAM-BRC-04",
    camera_name: "Akota - Dandia Bazar Bridge Chowk",
    vehicle_type: "suv",
    timestamp_utc: new Date(Date.now() - 900000).toISOString(),
    state: "Acknowledged",
    description: "Speed limit violation: 84 km/h recorded in 50 km/h urban bridge zone",
    confidence: 0.95,
    speed_kmh: 84.0
  }
];

export const MOCK_ANALYTICS = {
  vehicle_mix: [
    { name: "Car", count: 4850 },
    { name: "Two-wheeler", count: 7210 },
    { name: "SUV", count: 2140 },
    { name: "Bus", count: 890 },
    { name: "Truck", count: 640 }
  ],
  peak_hour_trend: [
    { hour: "06:00", current_volume: 820, baseline: 750 },
    { hour: "07:00", current_volume: 1450, baseline: 1200 },
    { hour: "08:00", current_volume: 2480, baseline: 2100 },
    { hour: "09:00", current_volume: 3420, baseline: 2900 },
    { hour: "10:00", current_volume: 3890, baseline: 3200 },
    { hour: "11:00", current_volume: 2900, baseline: 2700 },
    { hour: "12:00", current_volume: 2200, baseline: 2100 },
    { hour: "13:00", current_volume: 1980, baseline: 1900 },
    { hour: "14:00", current_volume: 2100, baseline: 2050 },
    { hour: "15:00", current_volume: 2350, baseline: 2200 },
    { hour: "16:00", current_volume: 2840, baseline: 2600 },
    { hour: "17:00", current_volume: 3650, baseline: 3100 },
    { hour: "18:00", current_volume: 4120, baseline: 3500 },
    { hour: "19:00", current_volume: 3950, baseline: 3400 },
    { hour: "20:00", current_volume: 2980, baseline: 2700 },
    { hour: "21:00", current_volume: 1890, baseline: 1750 }
  ],
  od_matrix: [
    { origin_camera: "CAM-BRC-01", destination_camera: "CAM-BRC-02", vehicle_count: 840, avg_travel_time_min: 6.4 },
    { origin_camera: "CAM-BRC-02", destination_camera: "CAM-BRC-03", vehicle_count: 1120, avg_travel_time_min: 4.2 },
    { origin_camera: "CAM-BRC-03", destination_camera: "CAM-BRC-04", vehicle_count: 980, avg_travel_time_min: 5.1 },
    { origin_camera: "CAM-BRC-01", destination_camera: "CAM-BRC-05", vehicle_count: 730, avg_travel_time_min: 4.8 },
    { origin_camera: "CAM-BRC-04", destination_camera: "CAM-BRC-06", vehicle_count: 650, avg_travel_time_min: 11.2 }
  ],
  spatial_hotspots: [
    { name: "Station Central Hub", latitude: 22.3100, longitude: 73.1815, intensity: 0.94 },
    { name: "Akota Bridge Corridor", latitude: 22.2980, longitude: 73.1850, intensity: 0.82 },
    { name: "Alkapuri Commercial", latitude: 22.3105, longitude: 73.1720, intensity: 0.76 },
    { name: "Kala Ghoda Chowk", latitude: 22.3128, longitude: 73.1895, intensity: 0.68 }
  ]
};

export const MOCK_MODEL_METRICS = {
  plate_detection_mAP50: 0.978,
  ocr_character_accuracy: 0.946,
  fps_throughput_gpu: 42.8,
  latency_median_ms: 38.2,
  sample_count_evaluated: 1500,
  breakdown: {
    cars: { precision: 0.98, recall: 0.97, f1: 0.975 },
    two_wheelers: { precision: 0.92, recall: 0.90, f1: 0.91 },
    commercial: { precision: 0.95, recall: 0.94, f1: 0.945 }
  },
  environmental_robustness: [
    { scenario: "Daylight Clear", accuracy_pct: 98.6 },
    { scenario: "Night / Low Light", accuracy_pct: 91.2 },
    { scenario: "Monsoon Rain / Mist", accuracy_pct: 89.4 },
    { scenario: "Headlight Glare", accuracy_pct: 92.1 }
  ]
};

export function generateMockEvents(count = 20) {
  const plates = ["GJ06AB1234", "GJ06BC8821", "DL03CC9901", "MH02EE7722", "GJ01XY4411", "GJ06KK5509", "GJ06LM7712", "GJ06ZZ9944"];
  const types = ["car", "two-wheeler", "suv", "truck", "bus"];
  const events = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const cam = MOCK_CAMERAS[i % MOCK_CAMERAS.length];
    const plate = plates[i % plates.length];
    const vType = types[i % types.length];
    const conf = Number((0.92 + (i % 7) * 0.01).toFixed(2));
    events.push({
      event_id: `EVT-2026-${1000 + i}`,
      plate_text: plate,
      camera_id: cam.camera_id,
      camera_name: cam.name,
      vehicle_type: vType,
      confidence: conf,
      ocr_confidence: conf,
      timestamp_utc: new Date(now - i * 45000).toISOString(),
      speed_estimate_kmh: 38 + (i * 3) % 25,
      lane_number: (i % cam.lane_count) + 1,
      image_snapshot_url: null
    });
  }
  return events;
}

export function generatePlateSvg(plate) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
    <rect x="2" y="2" width="216" height="56" rx="6" fill="#FFFFFF" stroke="#1E293B" stroke-width="3"/>
    <rect x="2" y="2" width="26" height="56" rx="4" fill="#003399"/>
    <circle cx="15" cy="22" r="5" fill="#FF9933"/>
    <text x="15" y="44" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF" text-anchor="middle">IND</text>
    <text x="122" y="40" font-family="'Courier New', monospace, 'Roboto Mono'" font-size="22" font-weight="900" fill="#111827" letter-spacing="2" text-anchor="middle">${plate}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function generateFrameSvg(camName, plate, vType) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#0F172A"/>
    <polygon points="40,360 260,160 380,160 600,360" fill="#1E293B"/>
    <line x1="200" y1="360" x2="300" y2="160" stroke="#E2E8F0" stroke-dasharray="14 10" stroke-width="3"/>
    <line x1="440" y1="360" x2="340" y2="160" stroke="#E2E8F0" stroke-dasharray="14 10" stroke-width="3"/>
    <rect x="230" y="190" width="180" height="120" rx="12" fill="#2563EB" opacity="0.85"/>
    <rect x="220" y="175" width="200" height="145" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-dasharray="8 4"/>
    <rect x="220" y="155" width="140" height="20" fill="#22C55E"/>
    <text x="225" y="169" font-family="Arial" font-size="11" font-weight="bold" fill="#000">${(vType || "CAR").toUpperCase()} 98%</text>
    <rect x="270" y="260" width="105" height="30" fill="#FFFFFF" stroke="#EAB308" stroke-width="2"/>
    <text x="322" y="280" font-family="monospace" font-size="12" font-weight="bold" fill="#000" text-anchor="middle">${plate}</text>
    <rect x="0" y="0" width="640" height="34" fill="#000000" opacity="0.75"/>
    <text x="14" y="22" font-family="monospace" font-size="12" fill="#F8FAFC">VADODARA SMART CITY // ${camName}</text>
    <circle cx="560" cy="17" r="5" fill="#EF4444"/>
    <text x="572" y="22" font-family="monospace" font-size="11" fill="#EF4444" font-weight="bold">CCTV</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

export function generateMockTrajectory(plate) {
  const norm = (plate || "GJ06AB1234").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const camOrder = [
    MOCK_CAMERAS[0], // Kala Ghoda
    MOCK_CAMERAS[1], // Alkapuri
    MOCK_CAMERAS[2], // Station
    MOCK_CAMERAS[3]  // Akota Bridge
  ];

  const now = Date.now();
  const vType = norm.includes("CC") || norm.includes("DL") ? "car" : "suv";
  const plateSvg = generatePlateSvg(norm);

  const legs = [
    { distance_km: 1.9, minutes: 2.8, speed_kmh: 40.7 },
    { distance_km: 1.2, minutes: 1.8, speed_kmh: 40.0 },
    { distance_km: 1.5, minutes: 2.1, speed_kmh: 42.8 }
  ];

  const isClone = norm === "MH02EE7722";
  const isStolen = norm === "GJ06CC9901" || norm === "DL03CC9901";

  const sightings = camOrder.map((cam, idx) => {
    const elapsedMinutes = idx === 0 ? 0 : legs.slice(0, idx).reduce((a, b) => a + b.minutes, 0);
    const time = new Date(now - (6.7 - elapsedMinutes) * 60000).toISOString();
    return {
      sighting_id: `SGT-${norm}-${idx + 1}`,
      camera_id: cam.camera_id,
      camera_name: cam.name,
      road_zone: cam.road_zone,
      direction: cam.direction,
      latitude: cam.latitude,
      longitude: cam.longitude,
      timestamp_utc: time,
      speed_kmh: 38 + idx * 3,
      distance_from_prev_km: idx === 0 ? 0 : legs[idx - 1].distance_km,
      speed_feasibility: "PLAUSIBLE",
      confidence: 0.96,
      ocr_confidence: 0.96,
      vehicle_type: vType,
      evidence_plate_crop: plateSvg,
      evidence_frame_path: generateFrameSvg(cam.name, norm, vType)
    };
  });

  const chowks_passed = camOrder.map((cam, idx) => {
    const leg = idx < legs.length ? legs[idx] : null;
    return {
      step: idx + 1,
      chowk_name: cam.name,
      camera_id: cam.camera_id,
      road_zone: cam.road_zone,
      direction: cam.direction,
      timestamp_utc: sightings[idx].timestamp_utc,
      latitude: cam.latitude,
      longitude: cam.longitude,
      is_last: idx === camOrder.length - 1,
      next_chowk: leg ? camOrder[idx + 1].name : null,
      distance_to_next_km: leg ? leg.distance_km : null,
      time_to_next_min: leg ? leg.minutes : null,
      speed_to_next_kmh: leg ? leg.speed_kmh : null,
      evidence_plate_crop: plateSvg,
      evidence_frame_path: generateFrameSvg(cam.name, norm, vType),
      ocr_confidence: 0.96,
      vehicle_type: vType
    };
  });

  const totalDist = 4.6;
  const totalMin = 6.7;
  const avgSpeed = isClone ? 1374.0 : 41.2;

  let speed_status = "Compliant (Within 50 km/h Statutory Urban Limit)";
  let speed_badge = "compliant";

  if (isClone) {
    speed_status = "Implausible Velocity (> 120 km/h Cloned Plate Alert)";
    speed_badge = "critical";
  } else if (avgSpeed > 50) {
    speed_status = "Over-speeding Alert (> 50 km/h Vadodara Municipal Limit)";
    speed_badge = "overspeed";
  }

  const aiSummary = isClone
    ? `CRITICAL ALERT: Vehicle registration ${norm} exhibited impossible travel between Makarpura and Alkapuri within seconds, indicating a cloned license plate operating concurrently in two zones.`
    : isStolen
    ? `SECURITY WATCHLIST HIT: Vehicle ${norm} matched against Stolen Vehicle FIR-2026-CR-89412. Tracked across 4 Vadodara signals with route concluding at Akota - Dandia Bazar Bridge.`
    : `Vehicle ${norm} was tracked across 4 major 4-lane traffic signals in Vadodara, entering at ${camOrder[0].name} and concluding at ${camOrder[3].name}. Total urban corridor distance traveled: ${totalDist} km in ${totalMin} minutes. Calculated average speed is ${avgSpeed} km/h, which is ${speed_status}.`;

  return {
    found: true,
    plate: norm,
    total_sightings: sightings.length,
    total_chowks: sightings.length,
    first_sighting: sightings[0].timestamp_utc,
    last_sighting: sightings[sightings.length - 1].timestamp_utc,
    first_camera: camOrder[0].name,
    last_camera: camOrder[camOrder.length - 1].name,
    total_distance_km: totalDist,
    total_transit_time_min: totalMin,
    overall_average_speed_kmh: avgSpeed,
    speed_status: speed_status,
    speed_badge: speed_badge,
    chowks_passed: chowks_passed,
    ai_route_summary: aiSummary,
    average_confidence: 0.96,
    sightings: sightings,
    trajectory_segments: legs.map((l, i) => ({
      segment_index: i + 1,
      from_camera_name: camOrder[i].name,
      to_camera_name: camOrder[i + 1].name,
      distance_km: l.distance_km,
      elapsed_minutes: l.minutes,
      speed_kmh: l.speed_kmh,
      status: "Plausible"
    })),
    plausibility: [],
    audit_note: `Search logged under Case #CASE-2026-VADODARA01`
  };
}
