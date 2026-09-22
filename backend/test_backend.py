"""
Automated unit and integration tests for the ANPR platform backend.
"""

import sys
import os
import json
from datetime import datetime, timezone, timedelta

# Ensure parent directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db_connection, normalize_plate, init_db
from backend.simulator import seed_database

client = TestClient(app)

def test_01_normalization():
    assert normalize_plate("dl 01 ab 1234") == "DL01AB1234"
    assert normalize_plate("hr-26-dk-8392") == "HR26DK8392"
    assert normalize_plate("up.16.ax.4910") == "UP16AX4910"
    print("Test 01 (Normalization): PASSED")

def test_02_database_seeded():
    seed_database()
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM cameras")
    assert c.fetchone()[0] == 8
    c.execute("SELECT COUNT(*) FROM blacklist")
    assert c.fetchone()[0] >= 3
    c.execute("SELECT COUNT(*) FROM anpr_events")
    assert c.fetchone()[0] > 10
    conn.close()
    print("Test 02 (Database Seed): PASSED")

def test_03_ingest_event_normal():
    payload = {
        "plate_text": "GJ06XX1122",
        "camera_id": "CAM-BRC-01",
        "ocr_confidence": 0.95,
        "vehicle_type": "car"
    }
    response = client.post("/api/v1/anpr_events", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["normalized_plate"] == "GJ06XX1122"
    assert data["is_verified"] is True
    print("Test 03 (Normal Ingestion): PASSED")

def test_04_ingest_blacklist_trigger():
    # GJ06CC9901 is blacklisted in Vadodara seed data
    payload = {
        "plate_text": "GJ-06-CC-9901",
        "camera_id": "CAM-BRC-03",
        "ocr_confidence": 0.96,
        "vehicle_type": "car"
    }
    response = client.post("/api/v1/anpr_events", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["alerts_triggered"] >= 1
    assert any(a["alert_type"] == "Blacklisted vehicle" for a in data["alerts"])
    print("Test 04 (Blacklist Alert Trigger): PASSED")

def test_05_trajectory_search():
    # GJ06AB1234 was seeded with 4 consecutive sightings across Vadodara
    search_payload = {
        "plate_text": "gj06ab1234",
        "is_fuzzy": False,
        "search_reason": "Verification test of vehicle trajectory reconstruction",
        "case_number": "CASE-TEST-001"
    }
    response = client.post("/api/v1/search/trajectory", json=search_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["total_sightings"] >= 4
    assert len(data["trajectory_segments"]) >= 3
    assert len(data["plausibility"]) >= 3
    # Check that at least one segment between distinct cameras has distance > 0
    assert any(seg["distance_km"] > 0 for seg in data["trajectory_segments"])
    print("Test 05 (Trajectory Reconstruction): PASSED")

def test_06_impossible_travel_alert():
    # Send sighting at CAM-BRC-01 (Kala Ghoda)
    now = datetime.now(timezone.utc)
    p1 = {
        "plate_text": "KA01AB9999",
        "camera_id": "CAM-BRC-01",
        "ocr_confidence": 0.96,
        "timestamp_utc": (now - timedelta(seconds=20)).isoformat()
    }
    client.post("/api/v1/anpr_events", json=p1)

    # Send sighting of same plate 15 seconds later at CAM-BRC-07 (Golden Chawkdi, ~12 km away!)
    p2 = {
        "plate_text": "KA01AB9999",
        "camera_id": "CAM-BRC-07",
        "ocr_confidence": 0.95,
        "timestamp_utc": now.isoformat()
    }
    response = client.post("/api/v1/anpr_events", json=p2)
    assert response.status_code == 200
    data = response.json()
    assert any(a["alert_type"] == "Impossible travel" for a in data["alerts"])
    print("Test 06 (Impossible Travel Clone Trigger): PASSED")

def test_07_analytics_and_audit():
    res_kpis = client.get("/api/v1/overview/kpis")
    assert res_kpis.status_code == 200
    kpis = res_kpis.json()
    assert kpis["cameras"]["total"] == 8

    res_analytics = client.get("/api/v1/analytics/overview")
    assert res_analytics.status_code == 200
    analytics = res_analytics.json()
    assert len(analytics["heatmap"]) > 0
    assert len(analytics["route_density"]) > 0

    res_audit = client.get("/api/v1/audit")
    assert res_audit.status_code == 200
    logs = res_audit.json()
    assert len(logs) > 0
    print("Test 07 (Analytics & Audit Trail): PASSED")

if __name__ == "__main__":
    test_01_normalization()
    test_02_database_seeded()
    test_03_ingest_event_normal()
    test_04_ingest_blacklist_trigger()
    test_05_trajectory_search()
    test_06_impossible_travel_alert()
    test_07_analytics_and_audit()
    print("\nALL 7 BACKEND TESTS PASSED SUCCESSFULLY!")
