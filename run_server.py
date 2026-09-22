"""
Single-command launcher for City-Wide ANPR Command Center Platform.
Serves the FastAPI Ingestion Gateway, REST/WebSocket APIs, and React Frontend on http://localhost:8000.
"""

import sys
import os
import uvicorn

# Add current directory to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.main import app

if __name__ == "__main__":
    print("=" * 70)
    print("   CITY-WIDE ANPR PLATFORM — COMMAND CENTER DASHBOARD")
    print("   SIH Problem Statement Implementation Specification")
    print("=" * 70)
    print(" * Web Dashboard:     http://localhost:8000")
    print(" * Ingestion API:     http://localhost:8000/api/v1/anpr_events")
    print(" * Swagger API Docs:  http://localhost:8000/docs")
    print(" * WebSocket Stream:  ws://localhost:8000/ws/live")
    print("=" * 70)
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
