# City-Wide ANPR Platform — Command Center Dashboard & Ingestion Gateway
### SIH Problem Statement Implementation Specification (September 2026)
**Role 6 Deliverable: Dashboard, UI & Demo Integration**

---

## 1. Executive Summary & Role Scope

This repository provides the high-fidelity **Command Center Dashboard, Ingestion Gateway, and Presentation Suite** for the City-Wide ANPR Platform. Designed specifically for **Role 6 (Dashboard, UI & Demo)**, it bridges all upstream services (Edge Ingestion, YOLOv8/CRNN Plate OCR, Trajectory Graph, and Traffic Analytics) into an intuitive operational surface for traffic authorities and authorized public-safety investigators.

### Core Capabilities:
1. **Live Operations GIS Command Map**: Real-time camera markers with tri-state health telemetry (Green=Online, Amber=Delayed, Red=Offline), congestion overlays, and interactive camera cards.
2. **Vehicle Lookup & Trajectory Reconstruction**: Normalized plate queries, fuzzy matching toggle, numbered directional waypoints, travel-time & speed plausibility analysis, and explicit route gap identification.
3. **High-Resolution Evidence Inspection**: Original CCTV scene frames, localized vehicle crops, zoomed plate crops, and multi-hypothesis OCR confidence distributions.
4. **Real-Time Security Alert Center**: Automated matching for blacklisted/wanted vehicles, impossible travel / cloned plate detection (>130 km/h threshold), and restricted-zone violations with full lifecycle tracking (`New -> Acknowledged -> Investigating -> Resolved / False Positive`).
5. **Macro Traffic Movement Analytics**: Spatial concentration heatmaps, vehicle-class modal mix, Origin-Destination (OD) matrix, and 24-hour peak-hour volume curves.
6. **External Data Ingestion API Workbench**: High-throughput REST endpoints (`POST /api/v1/anpr_events`, `POST /api/v1/camera_heartbeat`) and real-time WebSockets (`/ws/live`) with copyable cURL & Python integration snippets.
7. **Role-Based Access Control (RBAC) & Immutable Audit Ledger**: Cryptographic audit logging of every plate lookup, unmasking, and case dossier export.
8. **Interactive SIH Demo Script**: In-app step-by-step presenter guide implementing the exact demonstration flow from Section 9 of the specification.

---

## 2. Quick Start & How to Run

### Option A: Single-Command Production Server (Recommended)
Runs both the backend API and the built React frontend on a single port:
```bash
python run_server.py
```
* **Command Center Dashboard:** [http://localhost:8000](http://localhost:8000)
* **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Live Ingestion Endpoint:** `http://localhost:8000/api/v1/anpr_events`
* **Real-time WebSocket:** `ws://localhost:8000/ws/live`

### Option B: Frontend Hot-Reload Development
If modifying the React frontend:
```bash
# Terminal 1: Backend API
python -m uvicorn backend.main:app --port 8000 --reload

# Terminal 2: Vite Dev Server
cd frontend
npm run dev
```

---

## 3. Integrating Data from the External End (Team Integration)

As Person 6, your dashboard receives and displays data from Person 1 (Edge Camera Feeds), Person 2 (YOLO/OCR Models), Person 3 (Trajectory Graph), and Person 5 (Backend/Infra).

### Integration Methods:

#### Method 1: HTTP POST Detection Payloads (`/api/v1/anpr_events`)
External edge cameras or AI worker nodes stream detections using standard JSON:
```bash
curl -X POST "http://localhost:8000/api/v1/anpr_events" \
  -H "Content-Type: application/json" \
  -d '{
    "plate_text": "DL01AB1234",
    "camera_id": "CAM-NDLS-01",
    "ocr_confidence": 0.96,
    "plate_detector_confidence": 0.98,
    "vehicle_type": "car"
  }'
```

#### Method 2: Python Client Integration
Your teammates can import the provided `external_client_demo.py` or use:
```python
import requests

payload = {
    "plate_text": "DL03CC9901",       # Auto-normalizes spaces/hyphens
    "camera_id": "CAM-NDLS-03",
    "ocr_confidence": 0.95,
    "vehicle_type": "car",
    "model_version": "YOLOv11+CRNN-v1.8"
}

res = requests.post("http://localhost:8000/api/v1/anpr_events", json=payload)
print("Ingestion Status:", res.json())
```

#### Method 3: Connecting to Person 5's Remote API
In the dashboard UI, navigate to the **"External Ingestion (API)"** tab. Enter your teammate's IP address (e.g. `http://192.168.1.50:8000/api/v1`) in the Target Backend configuration box and click **Update Target URL**.

---

## 4. SIH Hackathon Demo Flow (Section 9 Compliance)

To present a winning demonstration to hackathon evaluators, click the golden **"SIH DEMO SCRIPT"** button in the dashboard top bar:

| Step | Screen | What to Show to Evaluators |
|---|---|---|
| **1. Overview** | Operations Overview | Show the 8 GIS camera nodes, camera health status, live volume KPIs, and masked ANPR stream. |
| **2. Camera Card** | Camera Network | Click a camera node to open the live CCTV frame, FPS counter (25 FPS), edge latency (38ms), and lanes. |
| **3. Trajectory** | Vehicle Trajectory | Search seeded plate `DL01AB1234`. Highlight the ordered 4-camera path, travel time, and honest route gaps. |
| **4. Analytics** | Traffic Analytics | Display the spatial heatmap, vehicle modal mix, Origin-Destination (OD) matrix, and peak-hour curves. |
| **5. Watchlist Alert** | Alert Center | Trigger demo scenario `DL03CC9901` (Stolen Vehicle SCRB FIR). Show audio siren, evidence inspection, and acknowledge alert. |
| **6. Impossible Travel** | Alert Center | Trigger demo scenario `MH02EE7722`. Show detection at 2 distant cameras within 20s (>900 km/h) flagging a cloned plate. |
| **7. Model Quality** | Model Quality | Show empirical benchmark report: **93.8% accuracy** on 1,500 held-out frames, precision/recall, and rain/glare stress tests. |
| **8. External End** | Ingestion Workbench | Send a custom live event or run `python external_client_demo.py` to demonstrate real-time external stream ingestion. |

---

## 5. Automated Verification & Testing
Run the backend test suite:
```bash
python -m backend.test_backend
```
All 7 unit & integration tests verify database constraints, plate normalization, blacklist matching, impossible travel detection, trajectory reconstruction, and audit trails.
