from fastapi import APIRouter, HTTPException, Query, Response, status
from typing import Optional, List, Dict, Any
from ..models.schemas import (
    SensorDataPayload,
    SystemSettings,
    RelayCommandRequest,
    EmergencyStopRequest,
    DeviceStatusResponse,
    StatisticsResponse
)
from ..services.data_service import DataService
from ..services.control_service import ControlService
from ..services.device_service import DeviceService
from ..services.simulation_service import simulation_engine

router = APIRouter(prefix="/api", tags=["MotorGuard Core API"])

@router.post("/sensor-data", status_code=status.HTTP_201_CREATED)
async def receive_sensor_data(payload: SensorDataPayload):
    """
    Receives incoming sensor telemetry from ESP32 hardware or external simulation.
    Performs rigorous range validation, calculates health/faults/alerts, and stores in database.
    """
    try:
        processed = await DataService.process_sensor_data(payload)
        return {"status": "success", "message": "Telemetry processed successfully", "data": processed}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Ingestion error: {str(e)}")

@router.get("/latest")
def get_latest_sensor_data():
    """Returns the most recent motor sensor reading, health score, and anomaly flags."""
    latest = DataService.get_latest_data()
    if not latest:
        return {"status": "empty", "message": "No sensor readings recorded yet."}
    return latest

@router.get("/history")
def get_sensor_history(
    window: str = Query("30m", description="Time window: 1m, 5m, 30m, 1h, 6h, 24h, 7d, all"),
    limit: int = Query(300, description="Max readings to return"),
    sensor: Optional[str] = Query(None, description="Optional sensor filter: temperature, current, vibration")
):
    """Returns historical sensor readings with time window filter and downsampling."""
    history = DataService.get_history(time_window=window, limit=limit, sensor=sensor)
    return history

@router.get("/health")
def get_health_evaluation():
    """Returns latest health evaluation, explainable risk reasons, and maintenance recommendations."""
    latest = DataService.get_latest_data()
    if not latest:
        return {
            "health_score": 100.0,
            "health_status": "Healthy",
            "risk_level": "LOW",
            "risk_reasons": ["System initial baseline."],
            "urgency": "Routine",
            "recommendation": "Standard operation.",
            "observation": "Nominal conditions.",
            "rate_of_change_temp": 0.0,
            "rate_of_change_current": 0.0,
            "rate_of_change_vib": 0.0
        }
    return {
        "health_score": latest.get("health_score", 100.0),
        "health_status": latest.get("health_status", "Healthy"),
        "risk_level": latest.get("risk_level", "LOW"),
        "risk_reasons": latest.get("risk_reasons", []),
        "urgency": latest.get("urgency", "Routine"),
        "recommendation": latest.get("recommendation", "Continue standard operating protocol."),
        "observation": latest.get("observation", "All electromechanical parameters within nominal prototype specifications."),
        "rate_of_change_temp": latest.get("rate_of_change_temp", 0.0),
        "rate_of_change_current": latest.get("rate_of_change_current", 0.0),
        "rate_of_change_vib": latest.get("rate_of_change_vib", 0.0),
        "anomalies_detected": latest.get("anomalies_detected", [])
    }

@router.get("/faults")
def get_fault_records(limit: int = Query(50, ge=1, le=500)):
    """Returns detected electromechanical fault logs."""
    return DataService.get_faults(limit=limit)

@router.get("/alerts")
def get_alert_events(limit: int = Query(50, ge=1, le=500)):
    """Returns active and historical alarm notifications."""
    return DataService.get_alerts(limit=limit)

@router.get("/maintenance")
def get_maintenance_records(limit: int = Query(50, ge=1, le=500)):
    """Returns maintenance events, actions, and inspection schedule."""
    return DataService.get_maintenance_events(limit=limit)

@router.post("/maintenance")
def create_maintenance_event(payload: Dict[str, Any]):
    """Records a new maintenance log entry or inspection notes."""
    event_type = payload.get("event_type", "Manual Inspection")
    priority = payload.get("priority", "MEDIUM")
    description = payload.get("description", "Operator logged maintenance inspection")
    inspection_area = payload.get("inspection_area", "General Motor & Electronics")
    notes = payload.get("notes", "")
    
    event_id = DataService.add_maintenance_event(event_type, priority, description, inspection_area, notes)
    return {"status": "success", "event_id": event_id, "message": "Maintenance log saved."}

@router.get("/device-status", response_model=DeviceStatusResponse)
def get_device_status(device_id: str = "MOTOR-001"):
    """Returns ESP32 connectivity state, heartbeat freshness, staleness indicator, and power source."""
    return DeviceService.get_status(device_id)

@router.post("/relay")
async def control_relay(req: RelayCommandRequest):
    """Activates or deactivates the safety relay that cuts power to the motor driver."""
    try:
        res = await ControlService.set_relay(req.command, reason=req.reason)
        return {"status": "success", "data": res}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

@router.post("/emergency-stop")
async def trigger_emergency_stop(req: EmergencyStopRequest):
    """
    Initiates immediate emergency motor stop. Latches safety interlock and trips relay.
    Requires manual reset to resume.
    """
    res = await ControlService.emergency_stop(reason=req.reason)
    return {"status": "success", "message": "Emergency Stop engaged.", "data": res}

@router.post("/reset")
async def reset_emergency_latch():
    """Resets the safety interlock and emergency stop latch, permitting motor restart."""
    res = await ControlService.reset_emergency_stop()
    return {"status": "success", "message": "Safety latch cleared. System ready.", "data": res}

@router.get("/settings", response_model=SystemSettings)
def get_settings():
    """Returns configurable operational thresholds, moving average window, and simulation state."""
    return DataService.get_settings()

@router.post("/settings", response_model=SystemSettings)
def update_settings(settings: SystemSettings):
    """Updates operational thresholds and operational mode."""
    updated = DataService.update_settings(settings)
    return updated

@router.get("/statistics", response_model=StatisticsResponse)
def get_statistics():
    """Returns summary analytics across all recorded telemetry."""
    return DataService.get_statistics()

@router.get("/export-csv")
def export_csv_data():
    """Exports recorded historical sensor data as a downloadable CSV."""
    csv_content = DataService.export_csv()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=motorguard_telemetry.csv"}
    )

@router.post("/simulation/mode")
def set_simulation_mode(payload: Dict[str, str]):
    """
    Sets simulation scenario:
    NORMAL, HIGH_VIBRATION, OVERHEATING, OVERLOAD, COMBINED_FAULT, CRITICAL_FAULT
    """
    mode = payload.get("mode", "NORMAL").upper()
    valid_modes = ["NORMAL", "HIGH_VIBRATION", "OVERHEATING", "OVERLOAD", "COMBINED_FAULT", "CRITICAL_FAULT"]
    if mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid simulation mode. Allowed: {valid_modes}")
    
    settings = DataService.get_settings()
    settings.simulation_mode = mode
    settings.system_mode = "SIMULATION"
    DataService.update_settings(settings)
    return {"status": "success", "simulation_mode": mode}
