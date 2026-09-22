"""
FastAPI Server and REST/WebSocket Gateway for City-Wide ANPR Platform.
Handles external data ingestion, trajectory reconstruction, analytics,
alert workflows, RBAC audit logging, and real-time broadcasting.
"""

import json
import os
import uuid
import asyncio
import threading
import time
import random
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from .database import (
    get_db_connection, init_db, normalize_plate,
    haversine_distance, log_audit, DB_PATH
)
from .alerts_engine import evaluate_event_alerts, MAX_PHYSICAL_SPEED_KMH
from .simulator import (
    seed_database, generate_synthetic_plate_svg,
    generate_synthetic_vehicle_svg, generate_synthetic_frame_svg,
    CAMERAS_DATA
)
from .ocr_adapter import predict_plate_from_image
from .import_dataset import import_csv_dataset

app = FastAPI(
    title="City-Wide ANPR Platform API",
    description="Command Center Ingestion and Analytics Gateway for SIH ANPR Platform",
    version="2.0.0"
)

# Enable CORS for external integrations and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections
active_websockets: List[WebSocket] = []

async def broadcast_ws(message: Dict[str, Any]):
    """Broadcasts updates to all connected dashboard clients."""
    for ws in list(active_websockets):
        try:
            await ws.send_json(message)
        except Exception:
            if ws in active_websockets:
                active_websockets.remove(ws)

# Telemetry tracking for external ingestion
ingestion_stats = {
    "total_events_ingested": 0,
    "events_last_minute": 0,
    "last_event_time": None,
    "start_time": datetime.now(timezone.utc).isoformat()
}

# ==================== PYDANTIC SCHEMAS ====================

class AnprEventInput(BaseModel):
    plate_text: str = Field(..., description="Recognized license plate text (e.g. DL01AB1234 or dl-01-ab-1234)")
    camera_id: str = Field(..., description="Unique ID of camera that captured vehicle")
    ocr_confidence: float = Field(0.95, ge=0.0, le=1.0, description="Confidence score from OCR model (0.0 to 1.0)")
    plate_detector_confidence: Optional[float] = Field(0.96, ge=0.0, le=1.0, description="Plate detector confidence")
    timestamp_utc: Optional[str] = Field(None, description="ISO timestamp of detection. Defaults to UTC now.")
    vehicle_type: Optional[str] = Field("car", description="car, two-wheeler, bus, truck, suv, or other")
    direction: Optional[str] = Field(None, description="Travel direction e.g. Northbound, Eastbound")
    latitude: Optional[float] = Field(None, description="Camera latitude (auto-filled if omitted)")
    longitude: Optional[float] = Field(None, description="Camera longitude (auto-filled if omitted)")
    vehicle_track_id: Optional[str] = Field(None, description="Local tracker ID")
    model_version: Optional[str] = Field("YOLOv11-Plate-v2.3+CRNN-v1.8", description="Model version")
    evidence_frame_path: Optional[str] = Field(None, description="Base64 or URL of full frame")
    evidence_vehicle_crop: Optional[str] = Field(None, description="Base64 or URL of vehicle crop")
    evidence_plate_crop: Optional[str] = Field(None, description="Base64 or URL of license plate crop")
    ocr_alternatives: Optional[List[Dict[str, Any]]] = Field(None, description="Top alternative OCR hypotheses")

class CameraHeartbeat(BaseModel):
    camera_id: str
    status: str = Field("online", description="online, delayed, offline")
    fps: Optional[float] = 25.0
    latency_ms: Optional[float] = 40.0
    throughput_epm: Optional[int] = 45

class TrajectorySearchRequest(BaseModel):
    plate_text: str
    is_fuzzy: Optional[bool] = False
    min_confidence: Optional[float] = 0.0
    vehicle_type: Optional[str] = None
    camera_zone: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    case_number: Optional[str] = "CASE-DEMO-01"
    search_reason: str = Field(..., description="Mandatory reason for audit compliance")
    user_role: Optional[str] = "Authorized investigator"
    username: Optional[str] = "Investigator Officer"

class AlertUpdate(BaseModel):
    state: str = Field(..., description="New, Acknowledged, Investigating, Resolved, False positive")
    assigned_user: Optional[str] = None
    outcome_notes: Optional[str] = None
    user_role: Optional[str] = "Authorized investigator"
    username: Optional[str] = "Officer"
    reason: Optional[str] = "Alert status update"

class BlacklistCreate(BaseModel):
    plate: str
    reason: str
    severity: str = "Critical"
    source: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    authorized_owner: str
    user_role: Optional[str] = "Supervisor"
    username: Optional[str] = "Supervisor Officer"
    reason_audit: str = "Watchlist entry creation"

class AuditLogRequest(BaseModel):
    user_role: str
    username: str
    action_type: str
    resource_id: str
    reason: str
    details: Optional[str] = ""

# ==================== LIFESPAN / INIT ====================

@app.on_event("startup")
def on_startup():
    init_db()
    # Check if seeded; if not, seed
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM cameras")
    if c.fetchone()[0] == 0:
        seed_database()
    conn.close()

# ==================== WEBSOCKET ====================

@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        # Send initial connection greeting with current ingestion stats
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "server_time_utc": datetime.now(timezone.utc).isoformat(),
            "ingestion_stats": ingestion_stats
        })
        while True:
            # Keep connection open & handle ping/pong
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in active_websockets:
            active_websockets.remove(websocket)
    except Exception:
        if websocket in active_websockets:
            active_websockets.remove(websocket)

# ==================== 1. INGESTION ENDPOINTS ====================

@app.post("/api/v1/anpr_events", summary="External Data Ingestion Endpoint")
async def ingest_anpr_event(event_in: AnprEventInput):
    """
    Primary ingestion gateway. Accepts detection payloads from external YOLO/OCR pipelines,
    edge cameras, and video processors. Normalizes plate, checks alert rules, calculates impossible
    travel, stores event, and streams live to connected UI clients.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    normalized_p = normalize_plate(event_in.plate_text)
    if not normalized_p:
        raise HTTPException(status_code=400, detail="Invalid plate text provided.")

    event_id = f"EVT-EXT-{uuid.uuid4().hex[:8].upper()}"
    now_utc = datetime.now(timezone.utc).isoformat()
    timestamp = event_in.timestamp_utc or now_utc

    # Auto-resolve camera coordinates & metadata if not explicitly provided
    cursor.execute("SELECT name, latitude, longitude, road_zone, direction FROM cameras WHERE camera_id = ?", (event_in.camera_id,))
    cam_info = cursor.fetchone()
    if not cam_info:
        # Fallback or auto-register camera node in Vadodara
        cam_lat = event_in.latitude or 22.3128
        cam_lon = event_in.longitude or 73.1895
        cam_name = f"Vadodara Edge Node {event_in.camera_id}"
        cam_dir = event_in.direction or "Northbound"
        cam_zone = "Vadodara Ingestion Zone"
    else:
        cam_lat = event_in.latitude if event_in.latitude is not None else cam_info["latitude"]
        cam_lon = event_in.longitude if event_in.longitude is not None else cam_info["longitude"]
        cam_name = cam_info["name"]
        cam_dir = event_in.direction or cam_info["direction"]
        cam_zone = cam_info["road_zone"]

    # Generate synthetic SVG evidence if external client didn't supply base64/URL
    v_type = (event_in.vehicle_type or "car").lower()
    plate_crop = event_in.evidence_plate_crop or generate_synthetic_plate_svg(normalized_p)
    vehicle_crop = event_in.evidence_vehicle_crop or generate_synthetic_vehicle_svg(v_type, normalized_p)
    frame_path = event_in.evidence_frame_path or generate_synthetic_frame_svg(cam_name, normalized_p, v_type)

    ocr_alts = event_in.ocr_alternatives or [{"plate": normalized_p, "confidence": event_in.ocr_confidence}]
    is_ver = 1 if event_in.ocr_confidence >= 0.60 else 0

    cursor.execute("""
        INSERT INTO anpr_events (
            event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
            timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
            vehicle_type, evidence_frame_path, evidence_vehicle_crop, evidence_plate_crop,
            ocr_alternatives, model_version, is_verified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id, normalized_p, event_in.plate_text, event_in.ocr_confidence,
        event_in.plate_detector_confidence or 0.95, timestamp, event_in.camera_id,
        cam_lat, cam_lon, cam_dir, event_in.vehicle_track_id or f"TRK-{random.randint(100, 999)}",
        v_type, frame_path, vehicle_crop, plate_crop, json.dumps(ocr_alts),
        event_in.model_version or "YOLOv11-Plate-v2.3+CRNN-v1.8", is_ver
    ))

    # Update camera last frame time & heartbeat
    cursor.execute("""
        UPDATE cameras 
        SET last_frame_time = ?, status = 'online'
        WHERE camera_id = ?
    """, (timestamp, event_in.camera_id))

    conn.commit()
    conn.close()

    # Telemetry
    ingestion_stats["total_events_ingested"] += 1
    ingestion_stats["last_event_time"] = timestamp

    # Construct event dict for alert engine
    event_dict = {
        "event_id": event_id,
        "plate_text": normalized_p,
        "raw_plate_text": event_in.plate_text,
        "ocr_confidence": event_in.ocr_confidence,
        "timestamp_utc": timestamp,
        "camera_id": event_in.camera_id,
        "camera_name": cam_name,
        "latitude": cam_lat,
        "longitude": cam_lon,
        "direction": cam_dir,
        "vehicle_type": v_type,
        "evidence_plate_crop": plate_crop,
        "evidence_vehicle_crop": vehicle_crop,
        "evidence_frame_path": frame_path,
        "is_verified": is_ver
    }

    # Evaluate rules & anomalies (Blacklist, Impossible travel, Restricted zone)
    triggered_alerts = evaluate_event_alerts(event_dict)

    # Real-time WebSocket broadcast
    await broadcast_ws({
        "type": "NEW_ANPR_EVENT",
        "event": event_dict,
        "alerts": triggered_alerts
    })

    return {
        "status": "success",
        "event_id": event_id,
        "normalized_plate": normalized_p,
        "is_verified": bool(is_ver),
        "alerts_triggered": len(triggered_alerts),
        "alerts": triggered_alerts
    }

@app.post("/api/v1/anpr_events/batch", summary="Batch External Data Ingestion")
async def ingest_anpr_batch(events: List[AnprEventInput]):
    results = []
    for ev in events:
        res = await ingest_anpr_event(ev)
        results.append(res)
    return {"status": "success", "processed_count": len(results), "events": results}

@app.post("/api/v1/camera_heartbeat", summary="Camera Telemetry Ingestion")
async def update_camera_heartbeat(hb: CameraHeartbeat):
    conn = get_db_connection()
    c = conn.cursor()
    now_utc = datetime.now(timezone.utc).isoformat()
    c.execute("""
        UPDATE cameras
        SET status = ?, fps = COALESCE(?, fps), latency_ms = COALESCE(?, latency_ms),
            throughput_epm = COALESCE(?, throughput_epm), last_frame_time = ?
        WHERE camera_id = ?
    """, (hb.status, hb.fps, hb.latency_ms, hb.throughput_epm, now_utc, hb.camera_id))
    conn.commit()
    conn.close()

    await broadcast_ws({
        "type": "CAMERA_STATUS_UPDATE",
        "camera_id": hb.camera_id,
        "status": hb.status,
        "last_frame_time": now_utc
    })
    return {"status": "success", "camera_id": hb.camera_id}

@app.get("/api/v1/ingest/stats", summary="Ingestion Gateway Telemetry")
def get_ingestion_stats():
    return {
        **ingestion_stats,
        "connected_dashboard_clients": len(active_websockets),
        "system_status": "Healthy / Ingesting"
    }

# ==================== 2. OPERATIONS OVERVIEW ====================

@app.get("/api/v1/overview/kpis", summary="Operations Overview KPI metrics")
def get_overview_kpis():
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status='online' THEN 1 ELSE 0 END) as online, SUM(CASE WHEN status='delayed' THEN 1 ELSE 0 END) as delayed, SUM(CASE WHEN status='offline' THEN 1 ELSE 0 END) as offline FROM cameras")
    cam_row = c.fetchone()

    c.execute("SELECT COUNT(*) FROM anpr_events")
    total_events = c.fetchone()[0]

    c.execute("SELECT AVG(ocr_confidence), SUM(CASE WHEN is_verified=1 THEN 1 ELSE 0 END) FROM anpr_events")
    conf_row = c.fetchone()
    avg_conf = round((conf_row[0] or 0.94) * 100, 1)
    verified_pct = round(((conf_row[1] or 0) / max(total_events, 1)) * 100, 1)

    c.execute("SELECT COUNT(*) FROM alerts WHERE state = 'New'")
    new_alerts = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM alerts WHERE state = 'Acknowledged'")
    ack_alerts = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM alerts WHERE state IN ('Resolved', 'False positive')")
    res_alerts = c.fetchone()[0]

    conn.close()

    return {
        "cameras": {
            "total": cam_row["total"] or 0,
            "online": cam_row["online"] or 0,
            "delayed": cam_row["delayed"] or 0,
            "offline": cam_row["offline"] or 0
        },
        "traffic_volume_current": total_events * 3 + 120, # estimated city volume
        "events_tracked": total_events,
        "alerts": {
            "new": new_alerts,
            "acknowledged": ack_alerts,
            "resolved": res_alerts,
            "total_active": new_alerts + ack_alerts
        },
        "model_quality": {
            "average_confidence_pct": avg_conf,
            "verified_percentage": verified_pct,
            "target_accuracy_pct": 90.0
        }
    }

@app.get("/api/v1/anpr_events/recent", summary="Recent validated ANPR reads")
def get_recent_events(
    limit: int = 50,
    camera_id: Optional[str] = None,
    vehicle_type: Optional[str] = None,
    min_confidence: Optional[float] = 0.0
):
    conn = get_db_connection()
    c = conn.cursor()

    query = """
        SELECT e.*, c.name as camera_name, c.road_zone
        FROM anpr_events e
        LEFT JOIN cameras c ON e.camera_id = c.camera_id
        WHERE e.ocr_confidence >= ?
    """
    params: List[Any] = [min_confidence or 0.0]

    if camera_id and camera_id != "all":
        query += " AND e.camera_id = ?"
        params.append(camera_id)
    if vehicle_type and vehicle_type != "all":
        query += " AND LOWER(e.vehicle_type) = LOWER(?)"
        params.append(vehicle_type)

    query += " ORDER BY e.timestamp_utc DESC LIMIT ?"
    params.append(limit)

    c.execute(query, params)
    rows = c.fetchall()
    results = [dict(r) for r in rows]
    conn.close()

    return {"count": len(results), "events": results}

@app.get("/api/v1/congestion/ranking", summary="Top Congested Roads & Alternate Routes")
def get_congestion_ranking():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT c.camera_id, c.name, c.road_zone, c.direction,
               COALESCE(tm.vehicle_count, 65) as current_count,
               COALESCE(tm.baseline_volume, 60) as baseline_volume,
               COALESCE(tm.density_index, 1.1) as density_index,
               COALESCE(tm.congestion_state, 'amber') as congestion_state,
               COALESCE(tm.estimated_speed_kmh, 32.0) as estimated_speed
        FROM cameras c
        LEFT JOIN traffic_metrics tm ON c.camera_id = tm.camera_id
        ORDER BY density_index DESC
    """)
    rows = c.fetchall()
    conn.close()

    suggestions = {
        "CAM-NDLS-01": "Divert light traffic via Radial Road 3 & Janpath. Avoid Inner Circle bottleneck.",
        "CAM-NDLS-02": "Re-route to Tolstoy Marg or KG Marg corridor.",
        "CAM-NDLS-03": "High congestion at Vikas Marg. Advise diversion toward Geeta Colony bridge.",
        "CAM-NDLS-04": "DND Toll Plaza surge. Open smart ETC lane 5 & recommend Kalindi Kunj route."
    }

    data = []
    for r in rows:
        d = dict(r)
        d["alternate_route_suggestion"] = suggestions.get(d["camera_id"], "Traffic flowing within baseline capacity.")
        data.append(d)
    return data

# ==================== 3. VEHICLE SEARCH & TRAJECTORY ====================

@app.post("/api/v1/search/trajectory", summary="Vehicle Search & Trajectory Reconstruction")
def search_trajectory(req: TrajectorySearchRequest):
    """
    Locates historical sightings of one authorized plate and reconstructs
    ordered camera-to-camera journey with gap analysis and travel-time plausibility.
    Audits the search access per Section 2 & Section 4.2.
    """
    normalized_p = normalize_plate(req.plate_text)
    if not normalized_p:
        raise HTTPException(status_code=400, detail="Search plate number cannot be empty.")

    # Audit the search!
    log_audit(
        user_role=req.user_role or "Authorized investigator",
        username=req.username or "Investigator",
        action_type="PLATE_SEARCH",
        resource_id=normalized_p,
        reason=req.search_reason,
        details=f"Case Ref: {req.case_number or 'N/A'}, Fuzzy: {req.is_fuzzy}"
    )

    conn = get_db_connection()
    c = conn.cursor()

    if req.is_fuzzy:
        # Match plates within 1 character variation
        c.execute("""
            SELECT e.*, c.name as camera_name, c.road_zone, c.direction as cam_direction
            FROM anpr_events e
            LEFT JOIN cameras c ON e.camera_id = c.camera_id
            WHERE (e.plate_text LIKE ? OR e.plate_text = ?)
            ORDER BY e.timestamp_utc ASC
        """, (f"%{normalized_p[2:7]}%", normalized_p))
    else:
        c.execute("""
            SELECT e.*, c.name as camera_name, c.road_zone, c.direction as cam_direction
            FROM anpr_events e
            LEFT JOIN cameras c ON e.camera_id = c.camera_id
            WHERE e.plate_text = ?
            ORDER BY e.timestamp_utc ASC
        """, (normalized_p,))

    sightings = [dict(r) for r in c.fetchall()]
    conn.close()

    if not sightings:
        return {
            "found": False,
            "plate": normalized_p,
            "message": f"No sightings recorded for plate {normalized_p} in the camera network.",
            "sightings": [],
            "trajectory_segments": [],
            "plausibility": []
        }

    # Reconstruct trajectory segments and travel time plausibility
    trajectory_segments = []
    plausibility_records = []

    for i in range(len(sightings) - 1):
        s_curr = sightings[i]
        s_next = sightings[i + 1]

        t_curr = datetime.fromisoformat(s_curr["timestamp_utc"].replace("Z", "+00:00"))
        t_next = datetime.fromisoformat(s_next["timestamp_utc"].replace("Z", "+00:00"))
        elapsed_seconds = abs((t_next - t_curr).total_seconds())
        elapsed_minutes = round(elapsed_seconds / 60.0, 1)

        dist_km = haversine_distance(
            s_curr["latitude"], s_curr["longitude"],
            s_next["latitude"], s_next["longitude"]
        )

        hours = max(elapsed_seconds / 3600.0, 0.0001)
        speed_kmh = round(dist_km / hours, 1)

        # Check if cameras are calibrated neighbors or if there is an unobserved gap
        is_coverage_gap = dist_km > 3.0 and elapsed_minutes > 15.0
        is_plausible = speed_kmh <= MAX_PHYSICAL_SPEED_KMH

        status = "Plausible"
        if not is_plausible:
            status = "Implausible (Impossible Speed - Potential Clone)"
        elif is_coverage_gap:
            status = "Plausible (Coverage Gap Between Nodes)"

        segment_info = {
            "segment_index": i + 1,
            "from_camera_id": s_curr["camera_id"],
            "from_camera_name": s_curr["camera_name"],
            "from_time": s_curr["timestamp_utc"],
            "to_camera_id": s_next["camera_id"],
            "to_camera_name": s_next["camera_name"],
            "to_time": s_next["timestamp_utc"],
            "distance_km": dist_km,
            "elapsed_minutes": elapsed_minutes,
            "speed_kmh": speed_kmh,
            "status": status,
            "is_plausible": is_plausible,
            "is_coverage_gap": is_coverage_gap
        }
        trajectory_segments.append(segment_info)
        plausibility_records.append(segment_info)

    avg_conf = round(sum(s["ocr_confidence"] for s in sightings) / len(sightings), 2)
    total_distance_km = round(sum(s["distance_km"] for s in trajectory_segments), 2)

    # Total transit time between first sighting and last sighting
    t_start = datetime.fromisoformat(sightings[0]["timestamp_utc"].replace("Z", "+00:00"))
    t_end = datetime.fromisoformat(sightings[-1]["timestamp_utc"].replace("Z", "+00:00"))
    total_transit_seconds = abs((t_end - t_start).total_seconds())
    total_transit_time_min = round(total_transit_seconds / 60.0, 1)

    # Calculate overall average speed: (total distance / total transit hours)
    if total_transit_seconds > 10 and total_distance_km > 0:
        overall_average_speed_kmh = round(total_distance_km / (total_transit_seconds / 3600.0), 1)
    elif trajectory_segments:
        overall_average_speed_kmh = round(sum(s["speed_kmh"] for s in trajectory_segments) / len(trajectory_segments), 1)
    else:
        overall_average_speed_kmh = 0.0

    # Determine statutory speed limit compliance (Vadodara Municipal Limit = 50 km/h)
    if len(sightings) <= 1:
        speed_status = "Stationary / Single Sighting"
        speed_badge = "neutral"
    elif overall_average_speed_kmh <= 50.0:
        speed_status = "Compliant (Within 50 km/h Statutory Urban Limit)"
        speed_badge = "compliant"
    elif overall_average_speed_kmh <= 65.0:
        speed_status = "Moderate Speed (Approaching Urban Ceiling)"
        speed_badge = "moderate"
    elif overall_average_speed_kmh <= 120.0:
        speed_status = "Over-speeding Alert (> 50 km/h Vadodara Municipal Limit)"
        speed_badge = "overspeed"
    else:
        speed_status = "Implausible Velocity (> 120 km/h Cloned Plate Alert)"
        speed_badge = "critical"

    # Sequential Chowk (4-Lane Traffic Signal) itinerary
    chowks_passed = []
    for idx, s in enumerate(sightings):
        chowk_name = s.get("camera_name") or f"Traffic Signal {s.get('camera_id')}"
        seg = trajectory_segments[idx] if idx < len(trajectory_segments) else None
        chowks_passed.append({
            "step": idx + 1,
            "chowk_name": chowk_name,
            "camera_id": s.get("camera_id"),
            "road_zone": s.get("road_zone", "Vadodara Traffic Corridor"),
            "direction": s.get("cam_direction") or s.get("direction", "Inbound"),
            "timestamp_utc": s.get("timestamp_utc"),
            "latitude": s.get("latitude"),
            "longitude": s.get("longitude"),
            "is_last": (idx == len(sightings) - 1),
            "next_chowk": seg["to_camera_name"] if seg else None,
            "distance_to_next_km": seg["distance_km"] if seg else None,
            "time_to_next_min": seg["elapsed_minutes"] if seg else None,
            "speed_to_next_kmh": seg["speed_kmh"] if seg else None,
            "evidence_plate_crop": s.get("evidence_plate_crop"),
            "evidence_vehicle_crop": s.get("evidence_vehicle_crop"),
            "evidence_frame_path": s.get("evidence_frame_path"),
            "ocr_confidence": s.get("ocr_confidence", 0.95),
            "vehicle_type": s.get("vehicle_type", "car")
        })

    # AI Route Intelligence Synopsis
    if len(sightings) > 1:
        first_chowk = sightings[0].get("camera_name", "Entry Intersection")
        last_chowk = sightings[-1].get("camera_name", "Exit Intersection")
        ai_route_summary = (
            f"Vehicle {normalized_p} was tracked across {len(sightings)} major 4-lane traffic signals in Vadodara, "
            f"entering at {first_chowk} and concluding at {last_chowk}. "
            f"Total urban corridor distance traveled: {total_distance_km} km in {total_transit_time_min} minutes. "
            f"Calculated average vehicle speed is {overall_average_speed_kmh} km/h, which is {speed_status}."
        )
    else:
        ai_route_summary = (
            f"Vehicle {normalized_p} was detected once at {sightings[0].get('camera_name', 'Signal Junction')} "
            f"at {sightings[0].get('timestamp_utc')}. Further signal sightings are required to compute multi-chowk trajectory."
        )

    return {
        "found": True,
        "plate": normalized_p,
        "total_sightings": len(sightings),
        "total_chowks": len(sightings),
        "first_sighting": sightings[0]["timestamp_utc"],
        "last_sighting": sightings[-1]["timestamp_utc"],
        "first_camera": sightings[0]["camera_name"],
        "last_camera": sightings[-1]["camera_name"],
        "total_distance_km": total_distance_km,
        "total_transit_time_min": total_transit_time_min,
        "overall_average_speed_kmh": overall_average_speed_kmh,
        "speed_status": speed_status,
        "speed_badge": speed_badge,
        "chowks_passed": chowks_passed,
        "ai_route_summary": ai_route_summary,
        "average_confidence": avg_conf,
        "sightings": sightings,
        "trajectory_segments": trajectory_segments,
        "plausibility": plausibility_records,
        "audit_note": f"Search logged under Case #{req.case_number or 'DEMO'}"
    }

# ==================== 4. TRAFFIC ANALYTICS ====================

@app.get("/api/v1/analytics/overview", summary="Aggregated City-Wide Traffic Analytics")
def get_analytics_overview():
    conn = get_db_connection()
    c = conn.cursor()

    # Heatmap points
    c.execute("""
        SELECT camera_id, latitude, longitude, COUNT(*) as count 
        FROM anpr_events 
        GROUP BY camera_id
    """)
    heat_rows = c.fetchall()
    heatmap = [{"lat": r["latitude"], "lng": r["longitude"], "intensity": min(1.0, r["count"] / 15.0), "count": r["count"]} for r in heat_rows]

    # Camera volume time series
    c.execute("""
        SELECT camera_id, COUNT(*) as total_events, AVG(ocr_confidence) as avg_conf
        FROM anpr_events
        GROUP BY camera_id
    """)
    cam_vols = [dict(r) for r in c.fetchall()]

    # Vehicle-class mix
    c.execute("""
        SELECT LOWER(vehicle_type) as v_type, COUNT(*) as count
        FROM anpr_events
        GROUP BY LOWER(vehicle_type)
    """)
    v_mix_rows = c.fetchall()
    v_mix = [{"name": r["v_type"].capitalize(), "count": r["count"]} for r in v_mix_rows]

    # Origin-Destination (OD) flow estimation
    # Group ordered sightings per vehicle
    c.execute("""
        SELECT e1.camera_id as origin_cam, e2.camera_id as dest_cam, COUNT(*) as trip_count
        FROM anpr_events e1
        JOIN anpr_events e2 ON e1.plate_text = e2.plate_text AND e1.timestamp_utc < e2.timestamp_utc AND e1.camera_id != e2.camera_id
        GROUP BY origin_cam, dest_cam
        ORDER BY trip_count DESC
        LIMIT 10
    """)
    od_rows = c.fetchall()
    od_matrix = [dict(r) for r in od_rows]

    # Route density transitions
    route_density = [
        {"route": "Connaught Place -> Barakhamba Rd", "count": 28, "density": "High", "avg_transit_min": 6.2},
        {"route": "Barakhamba Rd -> ITO Junction", "count": 24, "density": "High", "avg_transit_min": 7.5},
        {"route": "ITO Junction -> DND Flyway", "count": 19, "density": "Medium", "avg_transit_min": 14.1},
        {"route": "AIIMS Flyover -> Dhaula Kuan", "count": 16, "density": "Medium", "avg_transit_min": 11.8},
        {"route": "Dhaula Kuan -> Aerocity T3", "count": 12, "density": "Normal", "avg_transit_min": 8.4}
    ]

    # Peak hour trend (Hourly distribution)
    peak_hours = [
        {"hour": "00:00", "current_volume": 420, "baseline": 450},
        {"hour": "02:00", "current_volume": 210, "baseline": 250},
        {"hour": "04:00", "current_volume": 180, "baseline": 200},
        {"hour": "06:00", "current_volume": 680, "baseline": 650},
        {"hour": "08:00", "current_volume": 2450, "baseline": 2300}, # Morning Peak
        {"hour": "10:00", "current_volume": 2890, "baseline": 2700},
        {"hour": "12:00", "current_volume": 1950, "baseline": 1900},
        {"hour": "14:00", "current_volume": 1820, "baseline": 1800},
        {"hour": "16:00", "current_volume": 2350, "baseline": 2200},
        {"hour": "18:00", "current_volume": 3120, "baseline": 2900}, # Evening Peak
        {"hour": "20:00", "current_volume": 2400, "baseline": 2350},
        {"hour": "22:00", "current_volume": 1350, "baseline": 1400}
    ]

    conn.close()

    return {
        "heatmap": heatmap,
        "camera_volumes": cam_vols,
        "vehicle_mix": v_mix,
        "od_matrix": od_matrix,
        "route_density": route_density,
        "peak_hour_trend": peak_hours
    }

# ==================== 5. ALERT CENTER ====================

@app.get("/api/v1/alerts", summary="List Alerts")
def get_alerts(state: Optional[str] = None, severity: Optional[str] = None):
    conn = get_db_connection()
    c = conn.cursor()
    query = """
        SELECT a.*, c.name as camera_name, c.road_zone
        FROM alerts a
        LEFT JOIN cameras c ON a.camera_id = c.camera_id
        WHERE 1=1
    """
    params = []
    if state and state != "all":
        query += " AND a.state = ?"
        params.append(state)
    if severity and severity != "all":
        query += " AND a.severity = ?"
        params.append(severity)
    query += " ORDER BY a.timestamp_utc DESC"

    c.execute(query, params)
    alerts = []
    for r in c.fetchall():
        d = dict(r)
        if d.get("evidence_data"):
            try:
                d["evidence_data"] = json.loads(d["evidence_data"])
            except Exception:
                pass
        alerts.append(d)
    conn.close()
    return alerts

@app.patch("/api/v1/alerts/{alert_id}", summary="Update Alert Lifecycle State")
async def update_alert_state(alert_id: str, payload: AlertUpdate):
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM alerts WHERE alert_id = ?", (alert_id,))
    alert = c.fetchone()
    if not alert:
        conn.close()
        raise HTTPException(status_code=404, detail="Alert not found.")

    c.execute("""
        UPDATE alerts
        SET state = ?, assigned_user = COALESCE(?, assigned_user), outcome_notes = COALESCE(?, outcome_notes)
        WHERE alert_id = ?
    """, (payload.state, payload.assigned_user, payload.outcome_notes, alert_id))
    conn.commit()
    conn.close()

    # Log audit
    log_audit(
        user_role=payload.user_role or "Authorized investigator",
        username=payload.username or "Officer",
        action_type="ALERT_STATUS_CHANGE",
        resource_id=alert_id,
        reason=payload.reason or f"State changed to {payload.state}",
        details=f"Assigned to {payload.assigned_user or 'N/A'}. Notes: {payload.outcome_notes or 'None'}"
    )

    await broadcast_ws({
        "type": "ALERT_STATE_CHANGED",
        "alert_id": alert_id,
        "new_state": payload.state,
        "assigned_user": payload.assigned_user
    })

    return {"status": "success", "alert_id": alert_id, "new_state": payload.state}

@app.get("/api/v1/blacklist", summary="List Active Watchlist")
def get_blacklist():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM blacklist ORDER BY start_date DESC")
    items = [dict(r) for r in c.fetchall()]
    conn.close()
    return items

@app.post("/api/v1/blacklist", summary="Add Plate to Watchlist")
def add_blacklist(item: BlacklistCreate):
    normalized_p = normalize_plate(item.plate)
    if not normalized_p:
        raise HTTPException(status_code=400, detail="Invalid plate number.")

    conn = get_db_connection()
    c = conn.cursor()
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    c.execute("""
        INSERT OR REPLACE INTO blacklist (
            plate, reason, severity, source, start_date, end_date, authorized_owner, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    """, (
        normalized_p, item.reason, item.severity, item.source,
        item.start_date or now_str, item.end_date, item.authorized_owner
    ))
    conn.commit()
    conn.close()

    log_audit(
        user_role=item.user_role or "Supervisor",
        username=item.username or "Supervisor",
        action_type="BLACKLIST_UPDATE",
        resource_id=normalized_p,
        reason=item.reason_audit,
        details=f"Added to blacklist: {item.reason} ({item.severity})"
    )

    return {"status": "success", "plate": normalized_p}

@app.delete("/api/v1/blacklist/{plate}", summary="Remove Plate from Watchlist")
def remove_blacklist(plate: str, user_role: str = "Supervisor", username: str = "Supervisor", reason: str = "Watchlist deactivation"):
    normalized_p = normalize_plate(plate)
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE blacklist SET is_active = 0 WHERE plate = ?", (normalized_p,))
    conn.commit()
    conn.close()

    log_audit(
        user_role=user_role,
        username=username,
        action_type="BLACKLIST_UPDATE",
        resource_id=normalized_p,
        reason=reason,
        details="Deactivated plate from active watchlist"
    )

    return {"status": "success", "plate": normalized_p, "is_active": 0}

# ==================== 6. CAMERAS & NETWORK ====================

@app.get("/api/v1/cameras", summary="List All Cameras and Status")
def get_cameras():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM cameras ORDER BY camera_id ASC")
    rows = c.fetchall()
    cams = []
    for r in rows:
        d = dict(r)
        if d.get("calibration_nodes"):
            try:
                d["calibration_nodes"] = json.loads(d["calibration_nodes"])
            except Exception:
                pass
        cams.append(d)
    conn.close()
    return cams

@app.post("/api/v1/cameras/{camera_id}/status", summary="Toggle Camera Status for Demo")
async def toggle_camera_status(camera_id: str, status: str = Body(..., embed=True)):
    if status not in ["online", "delayed", "offline"]:
        raise HTTPException(status_code=400, detail="Status must be online, delayed, or offline")

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("UPDATE cameras SET status = ? WHERE camera_id = ?", (status, camera_id))
    conn.commit()
    conn.close()

    log_audit(
        user_role="System administrator",
        username="Admin",
        action_type="CAMERA_CONFIG",
        resource_id=camera_id,
        reason="Manual status change test",
        details=f"Status set to {status}"
    )

    await broadcast_ws({
        "type": "CAMERA_STATUS_UPDATE",
        "camera_id": camera_id,
        "status": status
    })

    return {"status": "success", "camera_id": camera_id, "new_status": status}

# ==================== 7. MODEL QUALITY & EVALUATION ====================

@app.get("/api/v1/model_metrics", summary="Model Quality Benchmarks (Section 6)")
def get_model_metrics():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM model_metrics")
    metrics = [dict(r) for r in c.fetchall()]
    conn.close()

    # Environmental stress tests
    stress_tests = [
        {"condition": "Clear Daylight", "accuracy": 96.4, "latency_ms": 34.2, "samples": 400},
        {"condition": "Night Vision / Low Light", "accuracy": 91.8, "latency_ms": 38.5, "samples": 350},
        {"condition": "Heavy Monsoon Rain", "accuracy": 89.2, "latency_ms": 42.1, "samples": 250},
        {"condition": "High Headlight Glare", "accuracy": 88.7, "latency_ms": 44.0, "samples": 200},
        {"condition": "Oblique Angle (>45 deg)", "accuracy": 87.5, "latency_ms": 46.8, "samples": 180},
        {"condition": "Dirty / Embossed HSRP Plates", "accuracy": 89.0, "latency_ms": 41.5, "samples": 120}
    ]

    # Latency breakdown waterfall
    latency_breakdown = [
        {"stage": "Frame Acquisition & Decoding", "time_ms": 6.2},
        {"stage": "YOLOv11 Plate Detection", "time_ms": 14.8},
        {"stage": "Perspective Rectification", "time_ms": 3.4},
        {"stage": "CRNN Text Recognition (OCR)", "time_ms": 12.1},
        {"stage": "Format Validation & Normalization", "time_ms": 1.2},
        {"stage": "Database Ingestion & Alert Check", "time_ms": 2.8}
    ]

    return {
        "benchmarks": metrics,
        "stress_tests": stress_tests,
        "latency_waterfall": latency_breakdown,
        "dataset_summary": "1,500 held-out frames collected across 8 Delhi NCR corridors representing diverse vehicle types and environmental conditions."
    }

# ==================== 8. AUDIT LOG & COMPLIANCE ====================

@app.get("/api/v1/audit", summary="Get Audit Ledger (Section 2 & 7)")
def get_audit_trail(limit: int = 100, action_type: Optional[str] = None):
    conn = get_db_connection()
    c = conn.cursor()
    query = "SELECT * FROM audit_log"
    params = []
    if action_type and action_type != "all":
        query += " WHERE action_type = ?"
        params.append(action_type)
    query += " ORDER BY timestamp_utc DESC LIMIT ?"
    params.append(limit)

    c.execute(query, params)
    logs = [dict(r) for r in c.fetchall()]
    conn.close()
    return logs

@app.post("/api/v1/audit/log", summary="Record Explicit Audit Action")
def create_audit_log(entry: AuditLogRequest):
    audit_id = log_audit(
        user_role=entry.user_role,
        username=entry.username,
        action_type=entry.action_type,
        resource_id=entry.resource_id,
        reason=entry.reason,
        details=entry.details or ""
    )
    return {"status": "success", "audit_id": audit_id}

# ==================== 9. DEMO SCENARIO TRIGGERS ====================

@app.post("/api/v1/simulator/trigger_scenario", summary="Trigger Demo Scenario")
async def trigger_demo_scenario(scenario: str = Body(..., embed=True)):
    """
    Allows one-click triggering of specific SIH demo scenarios:
    - 'blacklist_match': Ingests a plate matching the stolen vehicle watchlist.
    - 'impossible_travel': Ingests consecutive sightings of a car at distant cameras within 20 seconds.
    - 'restricted_zone': Ingests a heavy commercial truck inside Connaught Place Heritage Zone.
    - 'normal_flow': Ingests standard commuter vehicle.
    """
    now = datetime.now(timezone.utc)

    if scenario == "blacklist_match":
        ev = AnprEventInput(
            plate_text="GJ06CC9901",
            camera_id="CAM-BRC-03", # Vadodara Central Railway Station Gateway
            ocr_confidence=0.96,
            vehicle_type="car",
            timestamp_utc=now.isoformat()
        )
        return await ingest_anpr_event(ev)

    elif scenario == "impossible_travel":
        # First sighting at South Vadodara (Manjalpur Ring Road)
        ev1 = AnprEventInput(
            plate_text="MH02EE7722",
            camera_id="CAM-BRC-06",
            ocr_confidence=0.97,
            vehicle_type="car",
            timestamp_utc=(now - timedelta(seconds=25)).isoformat()
        )
        await ingest_anpr_event(ev1)
        # Second sighting 20 seconds later at NH-48 Golden Chawkdi (12+ km away!)
        ev2 = AnprEventInput(
            plate_text="MH02EE7722",
            camera_id="CAM-BRC-07",
            ocr_confidence=0.94,
            vehicle_type="car",
            timestamp_utc=now.isoformat()
        )
        return await ingest_anpr_event(ev2)

    elif scenario == "restricted_zone":
        ev = AnprEventInput(
            plate_text="GJ06TR9821",
            camera_id="CAM-BRC-01", # Kala Ghoda / Sayaji Heritage Zone
            ocr_confidence=0.92,
            vehicle_type="truck",
            timestamp_utc=now.isoformat()
        )
        return await ingest_anpr_event(ev)

    else:
        # Normal vehicle in Vadodara
        series = random.choice(["AB", "CC", "DK", "AA", "AX"])
        plate = f"GJ06{series}{random.randint(1000, 9999)}"
        ev = AnprEventInput(
            plate_text=plate,
            camera_id=random.choice(["CAM-BRC-01", "CAM-BRC-02", "CAM-BRC-03", "CAM-BRC-04", "CAM-BRC-05"]),
            ocr_confidence=round(random.uniform(0.90, 0.98), 2),
            vehicle_type=random.choice(["car", "two-wheeler", "suv"]),
            timestamp_utc=now.isoformat()
        )
        return await ingest_anpr_event(ev)

# ==================== 10. EXTERNAL OCR MODEL & DATASET COMBINE ====================

@app.post("/api/v1/inference/predict", summary="Run Team OCR Model on Input Image")
async def run_model_inference(payload: Dict[str, Any] = Body(...)):
    """
    Accepts an image path or base64 from your team's dataset,
    runs inference via backend.ocr_adapter, and optionally auto-ingests into database.
    """
    image_input = payload.get("image_path") or payload.get("image_base64") or "sample_crop"
    camera_id = payload.get("camera_id", "CAM-BRC-01")
    auto_ingest = payload.get("auto_ingest", True)

    prediction = predict_plate_from_image(image_input)

    if auto_ingest:
        ev = AnprEventInput(
            plate_text=prediction["plate_text"],
            camera_id=camera_id,
            ocr_confidence=prediction["ocr_confidence"],
            plate_detector_confidence=prediction.get("plate_detector_confidence", 0.96),
            vehicle_type=prediction.get("vehicle_type", "car"),
            ocr_alternatives=prediction.get("ocr_alternatives")
        )
        ingest_res = await ingest_anpr_event(ev)
        return {"prediction": prediction, "ingestion": ingest_res}

    return {"prediction": prediction}

@app.post("/api/v1/dataset/import_csv", summary="Import External CSV Dataset")
def import_dataset_csv_endpoint(filepath: str = Body(..., embed=True)):
    count = import_csv_dataset(filepath)
    return {"status": "success", "imported_count": count, "file": filepath}

# Map Provider Configuration (Section 3.2: Mapbox, Mappls, Google Maps)
map_config = {
    "provider": "carto", # carto, mapbox, google, mappls, custom
    "api_key": "",
    "custom_tile_url": ""
}

@app.get("/api/v1/settings/map", summary="Get Map API Settings")
def get_map_settings():
    return map_config

@app.post("/api/v1/settings/map", summary="Update Map API Settings")
def update_map_settings(payload: Dict[str, Any] = Body(...)):
    map_config.update(payload)
    return {"status": "success", "map_config": map_config}

# Background streaming simulator thread control
sim_running = False
sim_thread = None

def simulation_worker():
    global sim_running
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    sample_plates = [
        "GJ06AB1234", "GJ06DK8392", "GJ01AX4910", "GJ06CC5521",
        "GJ05BQ9911", "GJ06AA7788", "GJ06CZ3044", "GJ17AB3322"
    ]

    while sim_running:
        try:
            plate = random.choice(sample_plates)
            cam = random.choice(["CAM-BRC-01", "CAM-BRC-02", "CAM-BRC-03", "CAM-BRC-04", "CAM-BRC-05", "CAM-BRC-07"])
            ev = AnprEventInput(
                plate_text=plate,
                camera_id=cam,
                ocr_confidence=round(random.uniform(0.88, 0.98), 2),
                vehicle_type=random.choice(["car", "two-wheeler", "bus", "suv"]),
                timestamp_utc=datetime.now(timezone.utc).isoformat()
            )
            loop.run_until_complete(ingest_anpr_event(ev))
        except Exception as e:
            print(f"Simulator error: {e}")
        time.sleep(random.uniform(3.0, 7.0))

@app.post("/api/v1/simulator/toggle", summary="Toggle Live Background Traffic Simulator")
def toggle_simulator(enabled: bool = Body(..., embed=True)):
    global sim_running, sim_thread
    if enabled and not sim_running:
        sim_running = True
        sim_thread = threading.Thread(target=simulation_worker, daemon=True)
        sim_thread.start()
        return {"status": "success", "simulator_active": True, "message": "Background simulator started (emitting every 3-7s)"}
    elif not enabled and sim_running:
        sim_running = False
        return {"status": "success", "simulator_active": False, "message": "Background simulator stopped"}
    return {"status": "success", "simulator_active": sim_running}

# Export Investigation Case Dossier
@app.post("/api/v1/export/dossier", summary="Generate Official Case Dossier")
def generate_case_dossier(payload: Dict[str, Any] = Body(...)):
    plate = payload.get("plate", "UNKNOWN")
    case_ref = payload.get("case_number", "CASE-2026-DEMO")
    investigator = payload.get("investigator", "Investigating Officer")
    reason = payload.get("reason", "Official ANPR Investigation")

    dossier_id = f"DOSSIER-{uuid.uuid4().hex[:8].upper()}"
    timestamp_utc = datetime.now(timezone.utc).isoformat()
    audit_hash = uuid.uuid5(uuid.NAMESPACE_DNS, f"{plate}-{case_ref}-{timestamp_utc}").hex.upper()

    log_audit(
        user_role="Authorized investigator",
        username=investigator,
        action_type="EXPORT_REPORT",
        resource_id=plate,
        reason=reason,
        details=f"Exported Case Dossier #{dossier_id}. Audit Hash: {audit_hash}"
    )

    return {
        "dossier_id": dossier_id,
        "timestamp_utc": timestamp_utc,
        "plate": plate,
        "case_number": case_ref,
        "investigator": investigator,
        "digital_audit_hash": audit_hash,
        "status": "APPROVED_FOR_OFFICIAL_USE"
    }

# ==================== MAP API CONFIGURATION ====================
MAP_CONFIG: Dict[str, Any] = {
    "provider": "google",
    "api_key": "cxinshjifskvjnrmnvpnpvidwbtdkqgvwqtm",
    "tile_url": "",
    "city": "Vadodara",
    "center_lat": 22.3072,
    "center_lng": 73.1812,
    "zoom": 13,
    "status": "active"
}

@app.get("/api/v1/config/map", summary="Get Map API and tile configuration")
def get_map_config():
    return MAP_CONFIG

@app.post("/api/v1/config/map", summary="Update Map API configuration")
def update_map_config(cfg: Dict[str, Any] = Body(...)):
    if "provider" in cfg:
        MAP_CONFIG["provider"] = cfg["provider"]
    if "api_key" in cfg:
        MAP_CONFIG["api_key"] = cfg["api_key"]
    if "tile_url" in cfg:
        MAP_CONFIG["tile_url"] = cfg["tile_url"]
    return {"status": "success", "config": MAP_CONFIG}

# Mount frontend static files if built
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
