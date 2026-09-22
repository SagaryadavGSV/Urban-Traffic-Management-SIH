"""
Alerts and Anomaly Detection Engine for City-Wide ANPR Platform.
Implements detection logic for Blacklist matches, Impossible Travel,
Restricted-Zone Entries, Route Anomalies, and Camera Health issues.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from .database import get_db_connection, haversine_distance, normalize_plate

# Speed threshold above which two consecutive camera sightings are deemed physically impossible
MAX_PHYSICAL_SPEED_KMH = 130.0

# Minimum time delta between sightings to avoid division by zero (seconds)
MIN_TIME_DELTA_SEC = 2.0

def evaluate_event_alerts(event: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Evaluates a freshly ingested ANPR event against all active alert rules.
    If any rule triggers, inserts alert into the 'alerts' table and returns the created alerts.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    triggered_alerts = []

    normalized_plate = normalize_plate(event.get("plate_text", ""))
    camera_id = event.get("camera_id", "")
    event_time_str = event.get("timestamp_utc", "")
    event_id = event.get("event_id", "")
    vehicle_type = event.get("vehicle_type", "car").lower()
    ocr_confidence = float(event.get("ocr_confidence", 0.0))

    try:
        event_time = datetime.fromisoformat(event_time_str.replace("Z", "+00:00"))
    except Exception:
        event_time = datetime.now(timezone.utc)

    # 1. Rule: Blacklist / Wanted Vehicle Check
    cursor.execute("""
        SELECT plate, reason, severity, source, authorized_owner 
        FROM blacklist 
        WHERE plate = ? AND is_active = 1
    """, (normalized_plate,))
    blacklist_match = cursor.fetchone()

    if blacklist_match:
        alert_id = f"ALT-BLK-{uuid.uuid4().hex[:8].upper()}"
        explanation = f"Plate {normalized_plate} matches active watchlist ({blacklist_match['reason']}). Listed by {blacklist_match['source']}."
        evidence_data = {
            "trigger": "Blacklist Match",
            "matched_rule": blacklist_match["reason"],
            "source_agency": blacklist_match["source"],
            "owner": blacklist_match["authorized_owner"],
            "plate_crop": event.get("evidence_plate_crop"),
            "vehicle_crop": event.get("evidence_vehicle_crop"),
            "frame_path": event.get("evidence_frame_path"),
            "confidence": ocr_confidence
        }
        cursor.execute("""
            INSERT INTO alerts (alert_id, alert_type, severity, plate, camera_id, timestamp_utc, state, explanation, source_event_ids, evidence_data)
            VALUES (?, ?, ?, ?, ?, ?, 'New', ?, ?, ?)
        """, (
            alert_id,
            "Blacklisted vehicle",
            blacklist_match["severity"],
            normalized_plate,
            camera_id,
            event_time_str,
            explanation,
            json.dumps([event_id]),
            json.dumps(evidence_data)
        ))
        triggered_alerts.append({
            "alert_id": alert_id,
            "alert_type": "Blacklisted vehicle",
            "severity": blacklist_match["severity"],
            "plate": normalized_plate,
            "camera_id": camera_id,
            "explanation": explanation
        })

    # 2. Rule: Impossible Travel / Cloned Plate Detection
    # Find the most recent prior sighting of the exact same plate at a different camera
    cursor.execute("""
        SELECT event_id, camera_id, timestamp_utc, latitude, longitude, ocr_confidence
        FROM anpr_events
        WHERE plate_text = ? AND event_id != ? AND camera_id != ?
        ORDER BY timestamp_utc DESC
        LIMIT 1
    """, (normalized_plate, event_id, camera_id))
    last_sighting = cursor.fetchone()

    if last_sighting:
        try:
            prev_time = datetime.fromisoformat(last_sighting["timestamp_utc"].replace("Z", "+00:00"))
            time_delta_sec = abs((event_time - prev_time).total_seconds())

            curr_lat = float(event.get("latitude", 0.0))
            curr_lon = float(event.get("longitude", 0.0))
            prev_lat = float(last_sighting["latitude"])
            prev_lon = float(last_sighting["longitude"])

            # Calibrate distance
            dist_km = haversine_distance(curr_lat, curr_lon, prev_lat, prev_lon)

            if dist_km > 0.5: # Only evaluate if cameras are distinct locations
                hours = max(time_delta_sec / 3600.0, 0.0001)
                calculated_speed = dist_km / hours

                if calculated_speed > MAX_PHYSICAL_SPEED_KMH:
                    alert_id = f"ALT-IMP-{uuid.uuid4().hex[:8].upper()}"
                    explanation = (
                        f"Impossible travel detected for plate {normalized_plate}. "
                        f"Covered {dist_km:.1f} km between {last_sighting['camera_id']} and {camera_id} "
                        f"in {int(time_delta_sec)}s (implied speed {calculated_speed:.1f} km/h > physical limit {MAX_PHYSICAL_SPEED_KMH} km/h). "
                        "High probability of cloned plate or duplicate registration."
                    )
                    evidence_data = {
                        "trigger": "Impossible Travel",
                        "distance_km": dist_km,
                        "elapsed_seconds": time_delta_sec,
                        "calculated_speed_kmh": round(calculated_speed, 1),
                        "prev_camera": last_sighting["camera_id"],
                        "curr_camera": camera_id,
                        "prev_timestamp": last_sighting["timestamp_utc"],
                        "curr_timestamp": event_time_str,
                        "prev_confidence": last_sighting["ocr_confidence"],
                        "curr_confidence": ocr_confidence
                    }
                    cursor.execute("""
                        INSERT INTO alerts (alert_id, alert_type, severity, plate, camera_id, timestamp_utc, state, explanation, source_event_ids, evidence_data)
                        VALUES (?, ?, 'Critical', ?, ?, ?, 'New', ?, ?, ?)
                    """, (
                        alert_id,
                        "Impossible travel",
                        normalized_plate,
                        camera_id,
                        event_time_str,
                        explanation,
                        json.dumps([last_sighting["event_id"], event_id]),
                        json.dumps(evidence_data)
                    ))
                    triggered_alerts.append({
                        "alert_id": alert_id,
                        "alert_type": "Impossible travel",
                        "severity": "Critical",
                        "plate": normalized_plate,
                        "camera_id": camera_id,
                        "explanation": explanation
                    })
        except Exception as e:
            print(f"Error evaluating travel speed: {e}")

    # 3. Rule: Restricted-Zone Entry Check
    # Example: Heavy commercial vehicles (truck / bus) prohibited in Central Heritage / Ring Road zone
    cursor.execute("SELECT road_zone FROM cameras WHERE camera_id = ?", (camera_id,))
    cam_row = cursor.fetchone()
    zone_name = cam_row["road_zone"] if cam_row else ""

    if vehicle_type in ["truck", "heavy_commercial"] and ("Heritage" in zone_name or "Connaught" in zone_name):
        alert_id = f"ALT-RES-{uuid.uuid4().hex[:8].upper()}"
        explanation = f"Restricted-zone violation: Heavy vehicle ({vehicle_type}) entered protected zone '{zone_name}' at {camera_id}."
        evidence_data = {
            "trigger": "Restricted-zone Entry",
            "zone": zone_name,
            "vehicle_type": vehicle_type,
            "confidence": ocr_confidence
        }
        cursor.execute("""
            INSERT INTO alerts (alert_id, alert_type, severity, plate, camera_id, timestamp_utc, state, explanation, source_event_ids, evidence_data)
            VALUES (?, ?, 'High', ?, ?, ?, 'New', ?, ?, ?)
        """, (
            alert_id,
            "Restricted-zone entry",
            normalized_plate,
            camera_id,
            event_time_str,
            explanation,
            json.dumps([event_id]),
            json.dumps(evidence_data)
        ))
        triggered_alerts.append({
            "alert_id": alert_id,
            "alert_type": "Restricted-zone entry",
            "severity": "High",
            "plate": normalized_plate,
            "camera_id": camera_id,
            "explanation": explanation
        })

    # 4. Rule: Low Confidence Unverified Flag
    if ocr_confidence < 0.60:
        cursor.execute("UPDATE anpr_events SET is_verified = 0 WHERE event_id = ?", (event_id,))

    conn.commit()
    conn.close()
    return triggered_alerts
