"""
Dataset Importer for City-Wide ANPR Platform (Vadodara).
Allows importing external CSV or JSON datasets containing vehicle detections,
plates, cameras, and timestamps directly into the SQLite database.
"""

import sys
import os
import csv
import json
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.database import get_db_connection, normalize_plate, init_db
from backend.alerts_engine import evaluate_event_alerts

def import_csv_dataset(csv_filepath: str):
    """
    Imports a CSV dataset of detections into anpr_events.
    Expected columns: plate_text, camera_id (optional), timestamp (optional),
                      confidence (optional), vehicle_type (optional).
    """
    if not os.path.exists(csv_filepath):
        print(f"[ERROR] File not found: {csv_filepath}")
        return 0

    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    imported = 0
    now = datetime.now(timezone.utc).isoformat()

    with open(csv_filepath, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_plate = row.get("plate_text") or row.get("plate") or row.get("number_plate") or ""
            norm_plate = normalize_plate(raw_plate)
            if not norm_plate:
                continue

            cam_id = row.get("camera_id") or "CAM-BRC-01"
            conf = float(row.get("confidence") or row.get("ocr_confidence") or 0.95)
            ts = row.get("timestamp") or row.get("timestamp_utc") or now
            v_type = (row.get("vehicle_type") or "car").lower()
            event_id = f"EVT-CSV-{uuid.uuid4().hex[:8].upper()}"

            # Fetch camera lat/lon
            cursor.execute("SELECT latitude, longitude, direction FROM cameras WHERE camera_id = ?", (cam_id,))
            cam_data = cursor.fetchone()
            lat = cam_data["latitude"] if cam_data else 22.3128
            lon = cam_data["longitude"] if cam_data else 73.1895
            direction = cam_data["direction"] if cam_data else "Northbound"

            cursor.execute("""
                INSERT OR REPLACE INTO anpr_events (
                    event_id, plate_text, raw_plate_text, ocr_confidence, plate_detector_confidence,
                    timestamp_utc, camera_id, latitude, longitude, direction, vehicle_track_id,
                    vehicle_type, model_version, is_verified
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event_id, norm_plate, raw_plate, conf, 0.96,
                ts, cam_id, lat, lon, direction, f"TRK-{imported+1}",
                v_type, "External-Dataset-Import", 1 if conf >= 0.60 else 0
            ))
            imported += 1

    conn.commit()
    conn.close()
    print(f"[SUCCESS] Successfully imported {imported} ANPR detection events from {csv_filepath}")
    return imported

def generate_sample_csv(target_path: str = "sample_vadodara_dataset.csv"):
    """Creates a sample CSV template for team members to populate."""
    records = [
        {"plate_text": "GJ06AB1234", "camera_id": "CAM-BRC-01", "confidence": "0.96", "vehicle_type": "car"},
        {"plate_text": "GJ06AB1234", "camera_id": "CAM-BRC-03", "confidence": "0.97", "vehicle_type": "car"},
        {"plate_text": "GJ06AB1234", "camera_id": "CAM-BRC-04", "confidence": "0.95", "vehicle_type": "car"},
        {"plate_text": "GJ06CC9901", "camera_id": "CAM-BRC-03", "confidence": "0.98", "vehicle_type": "car"},
        {"plate_text": "GJ01AX4910", "camera_id": "CAM-BRC-02", "confidence": "0.93", "vehicle_type": "car"},
        {"plate_text": "GJ06TR9821", "camera_id": "CAM-BRC-01", "confidence": "0.91", "vehicle_type": "truck"},
        {"plate_text": "GJ06DK8392", "camera_id": "CAM-BRC-05", "confidence": "0.94", "vehicle_type": "car"},
    ]
    with open(target_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["plate_text", "camera_id", "confidence", "vehicle_type"])
        writer.writeheader()
        writer.writerows(records)
    print(f"[INFO] Created sample dataset CSV template at: {target_path}")

if __name__ == "__main__":
    generate_sample_csv()
    import_csv_dataset("sample_vadodara_dataset.csv")
