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

export function generateMockTrajectory(plate) {
  const norm = (plate || "GJ06AB1234").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const camOrder = [
    MOCK_CAMERAS[0], // Kala Ghoda
    MOCK_CAMERAS[1], // Alkapuri
    MOCK_CAMERAS[2], // Station
    MOCK_CAMERAS[3]  // Akota Bridge
  ];

  const now = Date.now();
  const sightings = camOrder.map((cam, idx) => ({
    sighting_id: `SGT-${norm}-${idx + 1}`,
    camera_id: cam.camera_id,
    camera_name: cam.name,
    latitude: cam.latitude,
    longitude: cam.longitude,
    timestamp_utc: new Date(now - (camOrder.length - 1 - idx) * 180000).toISOString(),
    speed_kmh: 42 + idx * 4,
    distance_from_prev_km: idx === 0 ? 0 : 1.6,
    speed_feasibility: "PLAUSIBLE",
    confidence: 0.96,
    vehicle_type: norm.includes("DL") ? "car" : "suv"
  }));

  return {
    plate_text: norm,
    total_sightings: sightings.length,
    first_seen: sightings[0].timestamp_utc,
    last_seen: sightings[sightings.length - 1].timestamp_utc,
    sightings: sightings,
    chowks_passed: sightings.map(s => s.camera_name),
    route_gaps: [
      {
        from_camera: "Alkapuri R.C. Dutt Road Chowk",
        to_camera: "Railway Station Central Junction Chowk",
        distance_km: 1.2,
        expected_minutes: 3.5,
        actual_minutes: 3.0,
        gap_status: "NORMAL_PROGRESSION"
      }
    ],
    anomalies_detected: norm === "MH02EE7722" ? ["CLONED_PLATE_IMPOSSIBLE_SPEED"] : []
  };
}
