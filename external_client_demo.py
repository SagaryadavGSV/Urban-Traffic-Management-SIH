"""
External ANPR Pipeline Integration Demo Client.
Demonstrates how external computer vision pipelines, edge cameras,
and AI inference services stream detections into the Command Center API.
"""

import requests
import json
import time
import random
from datetime import datetime, timezone

API_BASE_URL = "http://localhost:8000/api/v1"

def send_detection_event(plate_text: str, camera_id: str, ocr_confidence: float = 0.95, vehicle_type: str = "car"):
    """Sends a single ANPR detection event to the platform."""
    url = f"{API_BASE_URL}/anpr_events"
    payload = {
        "plate_text": plate_text,
        "camera_id": camera_id,
        "ocr_confidence": ocr_confidence,
        "plate_detector_confidence": 0.97,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "vehicle_type": vehicle_type,
        "model_version": "External-EdgeYOLO-v11+OCR-v2"
    }

    try:
        response = requests.post(url, json=payload, timeout=5)
        if response.status_code == 200:
            res_data = response.json()
            print(f"[SUCCESS] Ingested plate '{plate_text}' at {camera_id} (Verified: {res_data['is_verified']})")
            if res_data.get("alerts_triggered", 0) > 0:
                print(f"   >>> ALERT TRIGGERED! ({res_data['alerts_triggered']} alerts): {res_data['alerts']}")
            return res_data
        else:
            print(f"[ERROR {response.status_code}] {response.text}")
    except requests.exceptions.ConnectionError:
        print("[CONNECTION ERROR] Command Center API is not running on http://localhost:8000")

def send_camera_heartbeat(camera_id: str, fps: float = 25.0, latency_ms: float = 35.0):
    """Sends periodic camera health and FPS telemetry."""
    url = f"{API_BASE_URL}/camera_heartbeat"
    payload = {
        "camera_id": camera_id,
        "status": "online",
        "fps": fps,
        "latency_ms": latency_ms,
        "throughput_epm": int(fps * 2.1)
    }
    try:
        requests.post(url, json=payload, timeout=3)
        print(f"[HEARTBEAT] Telemetry synced for {camera_id}: {fps} FPS, {latency_ms}ms latency")
    except Exception as e:
        print(f"[HEARTBEAT ERROR] {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("   City-Wide ANPR Platform - External Integration Client")
    print("=" * 60)
    print(f"Target Gateway: {API_BASE_URL}\n")

    # 1. Normal vehicle detection in Vadodara
    print("1. Sending normal commuter vehicle detection (Vadodara)...")
    send_detection_event("GJ06AA4321", "CAM-BRC-01", ocr_confidence=0.96, vehicle_type="car")
    time.sleep(1)

    # 2. Watchlist / Stolen vehicle trigger (GJ06CC9901 - Vadodara City Police FIR)
    print("\n2. Sending detection matching active stolen vehicle watchlist...")
    send_detection_event("GJ-06-CC-9901", "CAM-BRC-03", ocr_confidence=0.98, vehicle_type="car")
    time.sleep(1)

    # 3. Restricted-zone violation (Heavy truck in Sayaji Heritage Zone)
    print("\n3. Sending heavy commercial vehicle inside restricted heritage zone...")
    send_detection_event("GJ06TR9821", "CAM-BRC-01", ocr_confidence=0.92, vehicle_type="truck")
    time.sleep(1)

    # 4. Camera heartbeat
    print("\n4. Sending camera heartbeat telemetry...")
    send_camera_heartbeat("CAM-BRC-01", fps=24.8, latency_ms=36.2)

    print("\nExternal client demo finished. Check the dashboard for real-time reflection!")
