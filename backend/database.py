"""
Database layer for City-Wide ANPR Platform.
Implements the core schemas specified in Section 5 of SIH Implementation Specification.
"""

import sqlite3
import json
import os
import math
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "anpr_platform.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 5.1.1 anpr_events table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS anpr_events (
        event_id TEXT PRIMARY KEY,
        plate_text TEXT NOT NULL,
        raw_plate_text TEXT,
        ocr_confidence REAL NOT NULL,
        plate_detector_confidence REAL NOT NULL,
        timestamp_utc TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        direction TEXT NOT NULL,
        vehicle_track_id TEXT,
        vehicle_type TEXT NOT NULL,
        evidence_frame_path TEXT,
        evidence_vehicle_crop TEXT,
        evidence_plate_crop TEXT,
        ocr_alternatives TEXT, -- JSON array of {plate, confidence}
        model_version TEXT NOT NULL,
        is_verified INTEGER DEFAULT 1,
        FOREIGN KEY(camera_id) REFERENCES cameras(camera_id)
    )
    """)

    # 5.1.2 cameras table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cameras (
        camera_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        road_zone TEXT NOT NULL,
        direction TEXT NOT NULL,
        lane_count INTEGER DEFAULT 2,
        stream_url TEXT,
        status TEXT NOT NULL DEFAULT 'online', -- online, delayed, offline
        last_frame_time TEXT,
        latency_ms REAL DEFAULT 45.0,
        fps REAL DEFAULT 25.0,
        throughput_epm INTEGER DEFAULT 35,
        model_version TEXT DEFAULT 'YOLOv11-Plate-v2.3+CRNN-v1.8',
        calibration_nodes TEXT, -- JSON object {other_camera_id: distance_km}
        last_maintenance TEXT
    )
    """)

    # blacklist table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS blacklist (
        plate TEXT PRIMARY KEY,
        reason TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'Critical', -- Critical, High, Medium
        source TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        authorized_owner TEXT NOT NULL,
        is_active INTEGER DEFAULT 1
    )
    """)

    # alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        alert_type TEXT NOT NULL, -- Blacklisted vehicle, Stolen/wanted, Impossible travel, Restricted-zone entry, Route anomaly, Camera/model health
        severity TEXT NOT NULL, -- Critical, High, Medium, Low
        plate TEXT,
        camera_id TEXT,
        timestamp_utc TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'New', -- New, Acknowledged, Investigating, Resolved, False positive
        assigned_user TEXT DEFAULT 'Unassigned',
        source_event_ids TEXT, -- JSON array of event_ids
        explanation TEXT NOT NULL,
        evidence_data TEXT, -- JSON object
        outcome_notes TEXT
    )
    """)

    # traffic_metrics table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS traffic_metrics (
        metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
        camera_id TEXT NOT NULL,
        road_name TEXT NOT NULL,
        timestamp_window TEXT NOT NULL,
        vehicle_count INTEGER NOT NULL,
        baseline_volume INTEGER NOT NULL,
        density_index REAL NOT NULL,
        congestion_state TEXT NOT NULL, -- green, amber, red
        estimated_speed_kmh REAL NOT NULL,
        FOREIGN KEY(camera_id) REFERENCES cameras(camera_id)
    )
    """)

    # audit_log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_log (
        audit_id TEXT PRIMARY KEY,
        timestamp_utc TEXT NOT NULL,
        user_role TEXT NOT NULL,
        username TEXT NOT NULL,
        action_type TEXT NOT NULL, -- PLATE_SEARCH, EVIDENCE_VIEW, PLATE_UNMASK, EXPORT_REPORT, BLACKLIST_UPDATE, ALERT_STATUS_CHANGE, CAMERA_CONFIG
        resource_id TEXT,
        reason TEXT,
        details TEXT,
        ip_address TEXT DEFAULT '127.0.0.1'
    )
    """)

    # model_metrics table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS model_metrics (
        metric_name TEXT PRIMARY KEY,
        metric_value REAL NOT NULL,
        unit TEXT,
        sample_size INTEGER,
        evaluation_conditions TEXT,
        last_updated TEXT NOT NULL
    )
    """)

    # Create Indexes for fast real-time search
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_plate ON anpr_events(plate_text)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_camera ON anpr_events(camera_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON anpr_events(timestamp_utc)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp_utc)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp_utc)")

    conn.commit()
    conn.close()

def normalize_plate(plate: str) -> str:
    """Normalize license plate text: remove spaces, hyphens, dots, convert to uppercase."""
    if not plate:
        return ""
    import re
    return re.sub(r'[^A-Z0-9]', '', plate.strip().upper())

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in km."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def log_audit(user_role: str, username: str, action_type: str, resource_id: str, reason: str = "", details: str = "", ip: str = "127.0.0.1"):
    """Record an audit trail entry for sensitive user actions."""
    import uuid
    conn = get_db_connection()
    cursor = conn.cursor()
    audit_id = f"AUD-{uuid.uuid4().hex[:8].upper()}"
    timestamp_utc = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO audit_log (audit_id, timestamp_utc, user_role, username, action_type, resource_id, reason, details, ip_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (audit_id, timestamp_utc, user_role, username, action_type, resource_id, reason, details, ip))
    conn.commit()
    conn.close()
    return audit_id
