# MotorGuard — FastAPI Backend

The central communication, database, and predictive analytics engine for the MotorGuard IoT DC Motor condition monitoring system.

## Features

- **FastAPI Core**: High-throughput REST API and native WebSocket `/ws` for live telemetry broadcasts.
- **SQLite Database**: Persistent schema for sensor readings, health scores, fault logs, alert events, maintenance work orders, and control history.
- **Data Validation**: Rejects corrupted, physically impossible, or out-of-bounds readings with descriptive HTTP 422 errors.
- **Simulation Engine**: Realistic background time-series generator with selectable fault scenarios (`NORMAL`, `HIGH_VIBRATION`, `OVERHEATING`, `OVERLOAD`, `COMBINED_FAULT`, `CRITICAL_FAULT`).
- **Explainable Analytics**:
  - Configurable 0–100 Health Score with explicit penalty factors.
  - Transparent "WHY" reasoning bullet points.
  - Actionable maintenance recommendations.
  - Rule-based multi-tier fault detection.
- **Auto Relay Safety Trip**: Latches emergency shutdown state on critical threshold breaches.

---

## Installation & Running

```bash
# From workspace root or backend folder
pip install -r backend/requirements.txt

# Run backend server
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Automated Tests

```bash
pytest backend/tests -v
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/sensor-data` | Ingests telemetry from ESP32 or external source |
| `GET` | `/api/latest` | Returns most recent reading and health evaluation |
| `GET` | `/api/history` | Historical telemetry with window filters (`1m`, `5m`, `30m`, `1h`, `6h`, `24h`, `7d`, `all`) |
| `GET` | `/api/health` | Health score, risk level, explainability points, and maintenance guidance |
| `GET` | `/api/faults` | Detected electromechanical fault records |
| `GET` | `/api/alerts` | Alarm notifications and severity levels |
| `GET` | `/api/maintenance` | Maintenance events and inspection logs |
| `POST` | `/api/maintenance` | Log a manual inspection note |
| `GET` | `/api/device-status` | ESP32 connectivity, heartbeat, staleness, and power supply |
| `POST` | `/api/relay` | Toggle safety relay (`ON` / `OFF`) |
| `POST` | `/api/emergency-stop` | Engage immediate emergency shutdown and safety latch |
| `POST` | `/api/reset` | Clear emergency stop latch and resume operation |
| `GET` | `/api/settings` | Read current thresholds and configuration |
| `POST` | `/api/settings` | Update operational thresholds and modes |
| `GET` | `/api/statistics` | System-wide statistics and operating run-time |
| `GET` | `/api/export-csv` | Download complete dataset as CSV |
| `POST` | `/api/simulation/mode` | Set simulation scenario |
| `WS` | `/ws` | Real-time WebSocket feed for live dashboards |
