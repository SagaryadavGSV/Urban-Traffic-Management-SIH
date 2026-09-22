"""
Seeder and Live Traffic Simulator for Vadodara Smart City ANPR Platform.
Generates realistic Vadodara camera nodes, Gujarat license plates (GJ-06),
traffic baselines, seeded vehicle journeys, and synthetic evidence images.
"""

import json
import uuid
import random
import base64
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any
from .database import get_db_connection, init_db, normalize_plate, haversine_distance

# Synthetic SVG generation for frame, vehicle crop, and plate crop
def generate_synthetic_plate_svg(plate_text: str, bg_color: str = "#FFFFFF", text_color: str = "#111827") -> str:
    """Generates an authentic Indian (Gujarat HSRP) license plate SVG as base64."""
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="220" height="60" viewBox="0 0 220 60">
      <rect x="2" y="2" width="216" height="56" rx="6" fill="{bg_color}" stroke="#1E293B" stroke-width="3"/>
      <!-- Blue IND strip on left -->
      <rect x="2" y="2" width="26" height="56" rx="4" fill="#003399"/>
      <circle cx="15" cy="22" r="5" fill="#FF9933"/>
      <text x="15" y="44" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#FFFFFF" text-anchor="middle">IND</text>
      <!-- Embossed Plate Text -->
      <text x="122" y="40" font-family="'Courier New', monospace, 'Roboto Mono'" font-size="23" font-weight="900" fill="{text_color}" letter-spacing="2" text-anchor="middle">{plate_text}</text>
    </svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

def generate_synthetic_vehicle_svg(vehicle_type: str, plate_text: str) -> str:
    """Generates a synthetic vehicle crop image as base64."""
    colors = {"car": "#1E3A8A", "suv": "#047857", "truck": "#B45309", "bus": "#BE123C", "two-wheeler": "#4338CA"}
    col = colors.get(vehicle_type.lower(), "#334155")
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <rect width="320" height="200" fill="#0F172A"/>
      <rect y="130" width="320" height="70" fill="#1E293B"/>
      <line x1="0" y1="165" x2="320" y2="165" stroke="#64748B" stroke-dasharray="12 8" stroke-width="2"/>
      <rect x="50" y="60" width="220" height="90" rx="14" fill="{col}" opacity="0.9"/>
      <rect x="80" y="35" width="160" height="50" rx="10" fill="{col}"/>
      <polygon points="90,80 115,45 205,45 230,80" fill="#93C5FD" opacity="0.6"/>
      <circle cx="65" cy="115" r="10" fill="#FEF08A"/>
      <circle cx="255" cy="115" r="10" fill="#FEF08A"/>
      <rect x="110" y="115" width="100" height="26" rx="3" fill="#FFFFFF" stroke="#000" stroke-width="1.5"/>
      <text x="160" y="133" font-family="monospace" font-size="11" font-weight="bold" fill="#111" text-anchor="middle">{plate_text}</text>
      <text x="10" y="20" font-family="monospace" font-size="10" fill="#38BDF8">VADODARA ANPR CCTV #[{random.randint(1000, 9999)}]</text>
      <text x="230" y="20" font-family="monospace" font-size="10" fill="#4ADE80">DET 98.4%</text>
    </svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

def generate_synthetic_frame_svg(camera_name: str, plate_text: str, vehicle_type: str) -> str:
    """Generates a full CCTV scene frame with detector bounding box."""
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#020617"/>
          <stop offset="60%" stop-color="#0F172A"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#sky)"/>
      <polygon points="40,360 260,160 380,160 600,360" fill="#1E293B"/>
      <line x1="200" y1="360" x2="300" y2="160" stroke="#E2E8F0" stroke-dasharray="14 10" stroke-width="3"/>
      <line x1="440" y1="360" x2="340" y2="160" stroke="#E2E8F0" stroke-dasharray="14 10" stroke-width="3"/>
      <rect x="230" y="190" width="180" height="120" rx="12" fill="#2563EB" opacity="0.85"/>
      <rect x="220" y="175" width="200" height="145" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-dasharray="8 4"/>
      <rect x="220" y="155" width="140" height="20" fill="#22C55E"/>
      <text x="225" y="169" font-family="Arial" font-size="11" font-weight="bold" fill="#000">{vehicle_type.upper()} 97%</text>
      <rect x="270" y="260" width="105" height="30" fill="#FFFFFF" stroke="#EAB308" stroke-width="2"/>
      <text x="322" y="280" font-family="monospace" font-size="12" font-weight="bold" fill="#000" text-anchor="middle">{plate_text}</text>
      <rect x="0" y="0" width="640" height="34" fill="#000000" opacity="0.75"/>
      <text x="14" y="22" font-family="monospace" font-size="12" fill="#F8FAFC">VADODARA SMART CITY // {camera_name}</text>
      <circle cx="560" cy="17" r="5" fill="#EF4444"/>
      <text x="572" y="22" font-family="monospace" font-size="11" fill="#EF4444" font-weight="bold">LIVE</text>
    </svg>"""
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode('utf-8')).decode('utf-8')

# Real Vadodara Intersections & Smart City Camera Nodes
CAMERAS_DATA = [
    {
        "camera_id": "CAM-BRC-01",
        "name": "Kala Ghoda Chowk (4-Lane Traffic Signal)",
        "latitude": 22.3128,
        "longitude": 73.1895,
        "road_zone": "Sayaji Heritage & University Zone",
        "direction": "Northbound",
        "lane_count": 4,
        "stream_url": "rtsp://edge-01.vadodara.traffic.gov.in/live",
        "status": "online",
        "latency_ms": 35.4,
        "fps": 25.0,
        "throughput_epm": 48,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-02": 1.9, "CAM-BRC-03": 1.1, "CAM-BRC-05": 1.4},
        "last_maintenance": "2026-08-22"
    },
    {
        "camera_id": "CAM-BRC-02",
        "name": "Alkapuri R.C. Dutt Road Chowk (4-Lane Traffic Signal)",
        "latitude": 22.3105,
        "longitude": 73.1720,
        "road_zone": "Alkapuri Commercial District",
        "direction": "Westbound",
        "lane_count": 4,
        "stream_url": "rtsp://edge-02.vadodara.traffic.gov.in/live",
        "status": "online",
        "latency_ms": 38.0,
        "fps": 25.0,
        "throughput_epm": 62,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-01": 1.9, "CAM-BRC-03": 1.2, "CAM-BRC-08": 2.5},
        "last_maintenance": "2026-08-20"
    },
    {
        "camera_id": "CAM-BRC-03",
        "name": "Railway Station Central Junction Chowk (4-Lane Traffic Signal)",
        "latitude": 22.3100,
        "longitude": 73.1815,
        "road_zone": "Station Central Traffic Hub",
        "direction": "Eastbound",
        "lane_count": 4,
        "stream_url": "rtsp://edge-03.vadodara.traffic.gov.in/live",
        "status": "online",
        "latency_ms": 41.2,
        "fps": 25.0,
        "throughput_epm": 78,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-01": 1.1, "CAM-BRC-02": 1.2, "CAM-BRC-04": 1.5},
        "last_maintenance": "2026-09-02"
    },
    {
        "camera_id": "CAM-BRC-04",
        "name": "Akota - Dandia Bazar Bridge Chowk (6-Lane Cable Bridge Signal)",
        "latitude": 22.2980,
        "longitude": 73.1850,
        "road_zone": "Akota Cable Bridge Flyover Corridor",
        "direction": "Southeast",
        "lane_count": 6,
        "stream_url": "rtsp://edge-04.vadodara.traffic.gov.in/live",
        "status": "online",
        "latency_ms": 32.5,
        "fps": 30.0,
        "throughput_epm": 92,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-03": 1.5, "CAM-BRC-06": 3.6},
        "last_maintenance": "2026-08-14"
    },
    {
        "camera_id": "CAM-BRC-05",
        "name": "Fatehgunj Circle Chowk (4-Lane Traffic Signal)",
        "latitude": 22.3240,
        "longitude": 73.1900,
        "road_zone": "Fatehgunj University Corridor",
        "direction": "Northbound",
        "lane_count": 4,
        "stream_url": "rtsp://edge-05.vadodara.traffic.gov.in/live",
        "status": "online",
        "latency_ms": 44.0,
        "fps": 24.8,
        "throughput_epm": 55,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-01": 1.4, "CAM-BRC-07": 4.9},
        "last_maintenance": "2026-07-29"
    },
    {
        "camera_id": "CAM-BRC-06",
        "name": "Manjalpur Naka Chowk (4-Lane Ring Road Signal)",
        "latitude": 22.2680,
        "longitude": 73.1980,
        "road_zone": "South Vadodara Ring Road",
        "direction": "Southbound",
        "lane_count": 4,
        "stream_url": "rtsp://edge-06.vadodara.traffic.gov.in/live",
        "status": "delayed",
        "latency_ms": 110.0,
        "fps": 18.5,
        "throughput_epm": 42,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-04": 3.6},
        "last_maintenance": "2026-06-18"
    },
    {
        "camera_id": "CAM-BRC-07",
        "name": "Golden Chawkdi Junction (6-Lane NH-48 Highway Signal)",
        "latitude": 22.3380,
        "longitude": 73.2350,
        "road_zone": "NH-48 Golden Quadrilateral Corridor",
        "direction": "Northeast",
        "lane_count": 6,
        "stream_url": "rtsp://edge-07.vadodara.traffic.gov.in/live",
        "status": "online",
        "latency_ms": 36.8,
        "fps": 25.0,
        "throughput_epm": 85,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-05": 4.9},
        "last_maintenance": "2026-08-30"
    },
    {
        "camera_id": "CAM-BRC-08",
        "name": "Gotri Medical College Chowk (4-Lane Traffic Signal)",
        "latitude": 22.3140,
        "longitude": 73.1480,
        "road_zone": "West Vadodara Medical Corridor",
        "direction": "Westbound",
        "lane_count": 4,
        "stream_url": "rtsp://edge-08.vadodara.traffic.gov.in/live",
        "status": "offline",
        "latency_ms": 999.0,
        "fps": 0.0,
        "throughput_epm": 0,
        "model_version": "YOLOv11-Plate-v2.3+CRNN-v1.8",
        "calibration_nodes": {"CAM-BRC-02": 2.5},
        "last_maintenance": "2026-05-10"
    }
]

# Real Gujarat / Vadodara Watchlist
BLACKLIST_DATA = [
    {
        "plate": "GJ06CC9901",
        "reason": "Stolen Vehicle (Vadodara City Police FIR #2026/894)",
        "severity": "Critical",
        "source": "Gujarat State Crime Records Bureau (SCRB)",
        "start_date": "2026-09-01",
        "end_date": "2026-12-31",
        "authorized_owner": "Inspector P. Patel (Vadodara Crime Branch)",
        "is_active": 1
    },
    {
        "plate": "GJ01ZZ0007",
        "reason": "Hit and Run Suspect Vehicle (Expressway Sec 304A IPC)",
        "severity": "Critical",
        "source": "Ahmedabad-Vadodara Expressway Police",
        "start_date": "2026-09-05",
        "end_date": "2026-10-05",
        "authorized_owner": "ACP R. Joshi (Traffic)",
        "is_active": 1
    },
    {
        "plate": "GJ05BK4321",
        "reason": "Commercial Tax Evasion & Repeated Toll Violation",
        "severity": "Medium",
        "source": "Gujarat State Transport Enforcement",
        "start_date": "2026-08-10",
        "end_date": "2027-01-01",
        "authorized_owner": "RTO Enforcement Wing Vadodara",
        "is_active": 1
    }
]

MODEL_METRICS_DATA = [
    {"metric_name": "End-to-End Plate Accuracy", "metric_value": 94.1, "unit": "%", "sample_size": 1500, "evaluation_conditions": "Vadodara held-out dataset (Day/Night, Monsoon Rain, Glare)", "last_updated": "2026-09-11T20:00:00Z"},
    {"metric_name": "Plate Detector Precision", "metric_value": 96.8, "unit": "%", "sample_size": 1500, "evaluation_conditions": "IoU >= 0.5 on Gujarat HSRP and custom plates", "last_updated": "2026-09-11T20:00:00Z"},
    {"metric_name": "Plate Detector Recall", "metric_value": 96.2, "unit": "%", "sample_size": 1500, "evaluation_conditions": "Evaluated across multi-lane Vadodara corridors", "last_updated": "2026-09-11T20:00:00Z"},
    {"metric_name": "OCR Character Accuracy", "metric_value": 98.4, "unit": "%", "sample_size": 14200, "evaluation_conditions": "Character edit distance against Vadodara ground truth", "last_updated": "2026-09-11T20:00:00Z"},
    {"metric_name": "Average Pipeline Latency", "metric_value": 38.6, "unit": "ms", "sample_size": 5000, "evaluation_conditions": "Frame grab (5ms) + YOLO (14ms) + OCR (15ms) + DB (4.6ms)", "last_updated": "2026-09-11T20:00:00Z"},
    {"metric_name": "Camera Network Availability", "metric_value": 99.4, "unit": "%", "sample_size": 8, "evaluation_conditions": "7 of 8 Vadodara operational cameras reporting heartbeat", "last_updated": "2026-09-11T20:00:00Z"},
    {"metric_name": "False Alert Rate", "metric_value": 0.28, "unit": "%", "sample_size": 4200, "evaluation_conditions": "Empirically verified during 72h city trial run", "last_updated": "2026-09-11T20:00:00Z"}
]

def seed_database():
    """Seeds the SQLite database with Vadodara cameras, blacklist, model metrics, and historical events."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear prior data to cleanly install Vadodara network
    cursor.execute("DELETE FROM cameras")
    cursor.execute("DELETE FROM blacklist")
    cursor.execute("DELETE FROM model_metrics")
    cursor.execute("DELETE FROM anpr_events")
    cursor.execute("DELETE FROM traffic_metrics")
    cursor.execute("DELETE FROM alerts")

    # Seed Vadodara Cameras
    for cam in CAMERAS_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO cameras (
                camera_id, name, latitude, longitude, road_zone, direction,
                lane_count, stream_url, status, last_frame_time, latency_ms, fps,
                throughput_epm, model_version, calibration_nodes, last_maintenance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cam["camera_id"], cam["name"], cam["latitude"], cam["longitude"],
            cam["road_zone"], cam["direction"], cam["lane_count"], cam["stream_url"],
            cam["status"], datetime.now(timezone.utc).isoformat(), cam["latency_ms"],
            cam["fps"], cam["throughput_epm"], cam["model_version"],
            json.dumps(cam["calibration_nodes"]), cam["last_maintenance"]
        ))

    # Seed Blacklist
    for bl in BLACKLIST_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO blacklist (
                plate, reason, severity, source, start_date, end_date, authorized_owner, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            bl["plate"], bl["reason"], bl["severity"], bl["source"],
            bl["start_date"], bl["end_date"], bl["authorized_owner"], bl["is_active"]
        ))

    # Seed Model Metrics
    for mm in MODEL_METRICS_DATA:
        cursor.execute("""
            INSERT OR REPLACE INTO model_metrics (
                metric_name, metric_value, unit, sample_size, evaluation_conditions, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?)
        """, (
            mm["metric_name"], mm["metric_value"], mm["unit"],
            mm["sample_size"], mm["evaluation_conditions"], mm["last_updated"]
        ))

    now = datetime.now(timezone.utc)
    for cam in CAMERAS_DATA:
        count = random.randint(35, 95)
        baseline = 60
        density = round(count / baseline, 2)
        state = "green" if density < 0.8 else ("amber" if density <= 1.2 else "red")
        speed = round(random.uniform(35.0, 70.0), 1)

        cursor.execute("""
            INSERT INTO traffic_metrics (
                camera_id, road_name, timestamp_window, vehicle_count,
                baseline_volume, density_index, congestion_state, estimated_speed_kmh
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            cam["camera_id"], cam["road_zone"], now.strftime("%Y-%m-%dT%H:00:00Z"),
            count, baseline, density, state, speed
        ))

    # Seed Journey 1: Known Seeded Plate "GJ06AB1234" (Vadodara 4-Lane Signal Corridor)
    # Travels across 4 Vadodara chowks: Kala Ghoda -> Railway Station -> Akota Bridge -> Manjalpur Naka
    # Total distance: 6.2 km in 9.7 mins -> ~38.4 km/h (within 50 km/h urban limit)
    journey_plate = "GJ06AB1234"
    cam_sequence = [
        ("CAM-BRC-01", 12.0, "Southbound"),
        ("CAM-BRC-03", 10.2, "Southbound"),
        ("CAM-BRC-04", 7.8, "Southeast"),
        ("CAM-BRC-06", 2.3, "Southbound")
    ]
    for cam_id, mins_ago, direction in cam_sequence:
        cam_info = next(c for c in CAMERAS_DATA if c["camera_id"] == cam_id)
        event_time = (now - timedelta(minutes=mins_ago)).isoformat()
        ev_id = f"EVT-SEED-{uuid.uuid4().hex[:8].upper()}"
        conf = round(random.uniform(0.94, 0.98), 3)

        plate_crop = generate_synthetic_plate_svg(journey_plate)
        vehicle_crop = generate_synthetic_vehicle_svg("car", journey_plate)
        frame_path = generate_synthetic_frame_svg(cam_info["name"], journey_plate, "car")

        cursor.execute("""
            INSERT OR REPLACE INTO anpr_events (
                event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
                timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
                vehicle_type, evidence_frame_path, evidence_vehicle_crop, evidence_plate_crop,
                ocr_alternatives, model_version, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ev_id, journey_plate, f"GJ 06 AB {journey_plate[6:]}", conf, 0.96,
            event_time, cam_id, cam_info["latitude"], cam_info["longitude"],
            direction, f"TRK-{random.randint(100, 999)}", "car",
            frame_path, vehicle_crop, plate_crop,
            json.dumps([{"plate": journey_plate, "confidence": conf}, {"plate": journey_plate.replace("B", "8"), "confidence": round(conf-0.14, 2)}]),
            "YOLOv11-Plate-v2.3+CRNN-v1.8", 1
        ))

    # Seed Journey 2: "GJ06CC9901" (Stolen Watchlist Suspect)
    # Travels across: Fatehgunj -> Kala Ghoda -> Alkapuri -> Gotri Medical College (5.8 km in 9.2 mins -> 37.8 km/h)
    stolen_plate = "GJ06CC9901"
    stolen_sequence = [
        ("CAM-BRC-05", 15.0, "Southbound"),
        ("CAM-BRC-01", 12.8, "Southbound"),
        ("CAM-BRC-02", 9.8, "Westbound"),
        ("CAM-BRC-08", 5.8, "Westbound")
    ]
    for cam_id, mins_ago, direction in stolen_sequence:
        cam_info = next(c for c in CAMERAS_DATA if c["camera_id"] == cam_id)
        event_time = (now - timedelta(minutes=mins_ago)).isoformat()
        ev_id = f"EVT-SEED-{uuid.uuid4().hex[:8].upper()}"
        conf = round(random.uniform(0.93, 0.97), 3)

        plate_crop = generate_synthetic_plate_svg(stolen_plate)
        vehicle_crop = generate_synthetic_vehicle_svg("car", stolen_plate)
        frame_path = generate_synthetic_frame_svg(cam_info["name"], stolen_plate, "car")

        cursor.execute("""
            INSERT OR REPLACE INTO anpr_events (
                event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
                timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
                vehicle_type, evidence_frame_path, evidence_vehicle_crop, evidence_plate_crop,
                ocr_alternatives, model_version, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ev_id, stolen_plate, f"GJ 06 CC {stolen_plate[6:]}", conf, 0.95,
            event_time, cam_id, cam_info["latitude"], cam_info["longitude"],
            direction, f"TRK-{random.randint(100, 999)}", "car",
            frame_path, vehicle_crop, plate_crop,
            json.dumps([{"plate": stolen_plate, "confidence": conf}]),
            "YOLOv11-Plate-v2.3+CRNN-v1.8", 1
        ))

    # Seed Journey 3: "MH02EE7722" (Impossible Velocity / Cloned Plate Test)
    clone_plate = "MH02EE7722"
    clone_sequence = [
        ("CAM-BRC-01", 10.0, "Northbound"),
        ("CAM-BRC-07", 9.0, "Northeast")  # 6.5 km apart in 60 seconds = 390 km/h
    ]
    for cam_id, mins_ago, direction in clone_sequence:
        cam_info = next(c for c in CAMERAS_DATA if c["camera_id"] == cam_id)
        event_time = (now - timedelta(minutes=mins_ago)).isoformat()
        ev_id = f"EVT-SEED-{uuid.uuid4().hex[:8].upper()}"
        conf = 0.96

        plate_crop = generate_synthetic_plate_svg(clone_plate)
        vehicle_crop = generate_synthetic_vehicle_svg("car", clone_plate)
        frame_path = generate_synthetic_frame_svg(cam_info["name"], clone_plate, "car")

        cursor.execute("""
            INSERT OR REPLACE INTO anpr_events (
                event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
                timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
                vehicle_type, evidence_frame_path, evidence_vehicle_crop, evidence_plate_crop,
                ocr_alternatives, model_version, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ev_id, clone_plate, f"MH 02 EE {clone_plate[6:]}", conf, 0.96,
            event_time, cam_id, cam_info["latitude"], cam_info["longitude"],
            direction, f"TRK-{random.randint(100, 999)}", "car",
            frame_path, vehicle_crop, plate_crop,
            json.dumps([{"plate": clone_plate, "confidence": conf}]),
            "YOLOv11-Plate-v2.3+CRNN-v1.8", 1
        ))

    # Seed 30 diverse realistic Gujarat / Vadodara events across all cameras in the last 45 minutes
    sample_plates = [
        ("GJ06DK8392", "car", 0.95),
        ("GJ01AX4910", "car", 0.92),
        ("GJ06CC5521", "bus", 0.89),
        ("GJ05BQ9911", "car", 0.96),
        ("GJ06AA7788", "two-wheeler", 0.86),
        ("GJ06CZ3044", "suv", 0.95),
        ("GJ06TR9821", "truck", 0.79), # heavy commercial truck
        ("GJ17AB3322", "car", 0.93),
        ("GJ06AA0001", "car", 0.97),
        ("GJ06CB4411", "car", 0.52), # Low confidence unverified read
    ]

    for i in range(25):
        cam = random.choice([c for c in CAMERAS_DATA if c["status"] != "offline"])
        p_text, v_type, base_conf = random.choice(sample_plates)
        suffix = random.choice(["", str(random.randint(10, 99))])
        if len(suffix) > 0 and len(p_text) == 10:
            final_p = p_text[:8] + suffix
        else:
            final_p = p_text

        ev_id = f"EVT-GEN-{uuid.uuid4().hex[:8].upper()}"
        mins = random.randint(1, 40)
        event_time = (now - timedelta(minutes=mins, seconds=random.randint(0, 59))).isoformat()
        conf = round(max(0.45, min(0.99, base_conf + random.uniform(-0.05, 0.04))), 2)

        plate_crop = generate_synthetic_plate_svg(final_p)
        vehicle_crop = generate_synthetic_vehicle_svg(v_type, final_p)
        frame_path = generate_synthetic_frame_svg(cam["name"], final_p, v_type)
        is_ver = 1 if conf >= 0.60 else 0

        cursor.execute("""
            INSERT OR REPLACE INTO anpr_events (
                event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
                timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
                vehicle_type, evidence_frame_path, evidence_vehicle_crop, evidence_plate_crop,
                ocr_alternatives, model_version, is_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            ev_id, final_p, final_p, conf, 0.95,
            event_time, cam["camera_id"], cam["latitude"], cam["longitude"],
            cam["direction"], f"TRK-{random.randint(100, 999)}", v_type,
            frame_path, vehicle_crop, plate_crop,
            json.dumps([{"plate": final_p, "confidence": conf}]),
            "YOLOv11-Plate-v2.3+CRNN-v1.8", is_ver
        ))

    # Seed Initial Alert: Stolen Blacklist Match for GJ06CC9901
    stolen_cam = CAMERAS_DATA[2] # CAM-BRC-03: Railway Station
    stolen_time = (now - timedelta(minutes=6)).isoformat()
    stolen_ev_id = f"EVT-STOLEN-{uuid.uuid4().hex[:8].upper()}"
    stolen_plate = "GJ06CC9901"

    stolen_plate_crop = generate_synthetic_plate_svg(stolen_plate, bg_color="#FEF08A")
    stolen_vehicle_crop = generate_synthetic_vehicle_svg("car", stolen_plate)
    stolen_frame = generate_synthetic_frame_svg(stolen_cam["name"], stolen_plate, "car")

    cursor.execute("""
        INSERT OR REPLACE INTO anpr_events (
            event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
            timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
            vehicle_type, evidence_frame_path, evidence_vehicle_crop, evidence_plate_crop,
            ocr_alternatives, model_version, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        stolen_ev_id, stolen_plate, "GJ 06 CC 9901", 0.96, 0.98,
        stolen_time, stolen_cam["camera_id"], stolen_cam["latitude"], stolen_cam["longitude"],
        stolen_cam["direction"], "TRK-901", "car",
        stolen_frame, stolen_vehicle_crop, stolen_plate_crop,
        json.dumps([{"plate": stolen_plate, "confidence": 0.96}]),
        "YOLOv11-Plate-v2.3+CRNN-v1.8", 1
    ))

    cursor.execute("""
        INSERT OR REPLACE INTO alerts (
            alert_id, alert_type, severity, plate, camera_id, timestamp_utc, state, assigned_user,
            source_event_ids, explanation, evidence_data
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "ALT-BLK-INIT01",
        "Blacklisted vehicle",
        "Critical",
        stolen_plate,
        stolen_cam["camera_id"],
        stolen_time,
        "New",
        "Unassigned",
        json.dumps([stolen_ev_id]),
        "Plate GJ06CC9901 matches active watchlist (Stolen Vehicle Vadodara City Police FIR #2026/894). Sighted at Vadodara Central Railway Station Gateway.",
        json.dumps({
            "trigger": "Blacklist Match",
            "matched_rule": "Stolen Vehicle (Vadodara City Police FIR #2026/894)",
            "source_agency": "Gujarat State Crime Records Bureau (SCRB)",
            "confidence": 0.96,
            "plate_crop": stolen_plate_crop,
            "vehicle_crop": stolen_vehicle_crop,
            "frame_path": stolen_frame
        })
    ))

    cursor.execute("""
        INSERT OR IGNORE INTO audit_log (audit_id, timestamp_utc, user_role, username, action_type, resource_id, reason, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "AUD-INIT-001",
        (now - timedelta(hours=1)).isoformat(),
        "Supervisor",
        "Inspector P. Patel",
        "BLACKLIST_UPDATE",
        "GJ06CC9901",
        "Vadodara City Police Crime Branch sync",
        "Added vehicle to active watchlist with Critical priority"
    ))

    conn.commit()
    conn.close()
    print("Database seeded successfully with Vadodara Smart City ANPR data.")

if __name__ == "__main__":
    seed_database()
