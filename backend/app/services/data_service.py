import json
import io
import csv
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from ..database.connection import get_db
from ..models.schemas import (
    SensorDataPayload,
    HealthEvaluation,
    FaultRecord,
    AlertEvent,
    SystemSettings,
    StatisticsResponse
)
from ..analytics.trend_analyzer import TrendAnalyzer
from ..analytics.fault_detector import FaultDetector
from ..analytics.health_engine import HealthEngine
from .websocket_manager import ws_manager

class DataService:
    @staticmethod
    def get_settings() -> SystemSettings:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'config'")
            row = cursor.fetchone()
            if row:
                try:
                    data = json.loads(row["value"])
                    return SystemSettings(**data)
                except Exception:
                    pass
            # Default settings
            default_settings = SystemSettings()
            cursor.execute(
                "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('config', ?)",
                (json.dumps(default_settings.model_dump()),)
            )
            return default_settings

    @staticmethod
    def update_settings(new_settings: SystemSettings) -> SystemSettings:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('config', ?)",
                (json.dumps(new_settings.model_dump()),)
            )
        return new_settings

    @staticmethod
    def get_recent_readings(limit: int = 15) -> List[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT timestamp, temperature, current, vibration, motor_status, relay_status
                FROM sensor_readings
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in reversed(rows)]

    @staticmethod
    def get_device_state(device_id: str = "MOTOR-001") -> Dict[str, Any]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM device_state WHERE device_id = ?", (device_id,))
            row = cursor.fetchone()
            if row:
                return dict(row)
            return {
                "device_id": device_id,
                "last_heartbeat": None,
                "is_connected": 0,
                "emergency_stop_latched": 0,
                "relay_state": "ACTIVE",
                "motor_state": "RUNNING"
            }

    @staticmethod
    async def process_sensor_data(payload: SensorDataPayload) -> Dict[str, Any]:
        settings = DataService.get_settings()
        now_iso = payload.timestamp or datetime.now(timezone.utc).isoformat()

        # Update Device Heartbeat and state
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO device_state (device_id, last_heartbeat, is_connected, relay_state, motor_state)
                VALUES (?, ?, 1, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET
                    last_heartbeat = excluded.last_heartbeat,
                    is_connected = 1,
                    relay_state = excluded.relay_state,
                    motor_state = excluded.motor_state
            """, (payload.device_id, now_iso, payload.relay_status, payload.motor_status))

        # Check existing emergency stop latch
        state = DataService.get_device_state(payload.device_id)
        if state.get("emergency_stop_latched", 0) == 1:
            payload.motor_status = "OFF"
            payload.relay_status = "INACTIVE"

        # Fetch recent readings to compute dynamic rates of change and rolling stats
        recent = DataService.get_recent_readings(settings.moving_avg_window)
        rate_temp = TrendAnalyzer.calculate_rate_of_change(recent, "temperature")
        rate_current = TrendAnalyzer.calculate_rate_of_change(recent, "current")
        rate_vib = TrendAnalyzer.calculate_rate_of_change(recent, "vibration")

        vib_values = [r["vibration"] for r in recent] + [payload.vibration]
        temp_values = [r["temperature"] for r in recent] + [payload.temperature]
        curr_values = [r["current"] for r in recent] + [payload.current]

        vib_stats = TrendAnalyzer.compute_summary_stats(vib_values)
        temp_stats = TrendAnalyzer.compute_summary_stats(temp_values)
        curr_stats = TrendAnalyzer.compute_summary_stats(curr_values)

        # Estimate abnormal duration if recent readings were elevated
        abnormal_count = sum(1 for r in recent if (
            r["temperature"] >= settings.temp_warning or
            r["current"] >= settings.current_warning or
            r["vibration"] >= settings.vibration_warning
        ))
        abnormal_duration_sec = abnormal_count * (settings.refresh_interval_ms / 1000.0)

        # Run Rule-Based Fault Detector
        faults, alerts = FaultDetector.detect_faults(
            temperature=payload.temperature,
            current=payload.current,
            vibration=payload.vibration,
            settings=settings,
            rate_temp=rate_temp,
            rate_current=rate_current,
            rate_vib=rate_vib,
            timestamp=now_iso,
            duration_abnormal_seconds=abnormal_duration_sec
        )

        # Run Explainable Health Engine
        health = HealthEngine.evaluate(
            temperature=payload.temperature,
            current=payload.current,
            vibration=payload.vibration,
            settings=settings,
            rate_temp=rate_temp,
            rate_current=rate_current,
            rate_vib=rate_vib,
            abnormal_duration_sec=abnormal_duration_sec,
            historical_stats={"vib": vib_stats, "temp": temp_stats, "curr": curr_stats}
        )

        # Check Auto-Relay Shutdown on Critical Fault
        has_critical = any(f.severity == "CRITICAL" for f in faults) or health.risk_level == "CRITICAL"
        if has_critical and settings.auto_relay_shutdown:
            payload.relay_status = "INACTIVE"
            payload.motor_status = "FAULT"
            # Latch emergency state
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE device_state
                    SET emergency_stop_latched = 1, relay_state = 'INACTIVE', motor_state = 'FAULT'
                    WHERE device_id = ?
                """, (payload.device_id,))
                cursor.execute("""
                    INSERT INTO control_events (timestamp, command, source, previous_state, new_state, reason)
                    VALUES (?, 'SAFETY_SHUTDOWN', 'AUTO_SAFETY_INTERLOCK', 'ACTIVE', 'INACTIVE', ?)
                """, (now_iso, "Auto relay shutdown triggered by critical fault threshold"))

        # Save to Database
        reading_id = None
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sensor_readings (
                    device_id, timestamp, temperature, current, vibration,
                    raw_vib_x, raw_vib_y, raw_vib_z, motor_status, relay_status, is_simulated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                payload.device_id, now_iso, payload.temperature, payload.current, payload.vibration,
                payload.raw_vib_x, payload.raw_vib_y, payload.raw_vib_z, payload.motor_status,
                payload.relay_status, 1 if payload.is_simulated else 0
            ))
            reading_id = cursor.lastrowid

            cursor.execute("""
                INSERT INTO health_evaluations (
                    reading_id, timestamp, health_score, health_status, risk_level,
                    risk_reasons, urgency, recommendation, observation,
                    rate_of_change_temp, rate_of_change_current, rate_of_change_vib, anomalies_detected
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                reading_id, now_iso, health.health_score, health.health_status, health.risk_level,
                json.dumps(health.risk_reasons), health.urgency, health.recommendation, health.observation,
                health.rate_of_change_temp, health.rate_of_change_current, health.rate_of_change_vib,
                json.dumps(health.anomalies_detected)
            ))

            for fault in faults:
                if fault.fault_name != "Normal Operation":
                    cursor.execute("""
                        INSERT INTO fault_records (
                            timestamp, fault_name, severity, sensor, current_value,
                            threshold, duration_seconds, reason, recommended_action, is_resolved
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        fault.timestamp, fault.fault_name, fault.severity, fault.sensor, fault.current_value,
                        fault.threshold, fault.duration_seconds, fault.reason, fault.recommended_action,
                        1 if fault.is_resolved else 0
                    ))

            for alert in alerts:
                cursor.execute("""
                    INSERT INTO alert_events (
                        timestamp, severity, parameter, value, threshold, duration,
                        reason, recommended_action, acknowledged
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                """, (
                    alert.timestamp, alert.severity, alert.parameter, alert.value, alert.threshold,
                    alert.duration, alert.reason, alert.recommended_action
                ))

        # Prepare live telemetry broadcast packet
        packet = {
            "type": "TELEMETRY_UPDATE",
            "data": {
                "reading_id": reading_id,
                "device_id": payload.device_id,
                "timestamp": now_iso,
                "temperature": payload.temperature,
                "current": payload.current,
                "vibration": payload.vibration,
                "raw_vib_x": payload.raw_vib_x,
                "raw_vib_y": payload.raw_vib_y,
                "raw_vib_z": payload.raw_vib_z,
                "motor_status": payload.motor_status,
                "relay_status": payload.relay_status,
                "is_simulated": payload.is_simulated,
                "health": health.model_dump(),
                "faults": [f.model_dump() for f in faults],
                "alerts": [a.model_dump() for a in alerts],
                "stats": {
                    "vibration": vib_stats,
                    "temperature": temp_stats,
                    "current": curr_stats,
                    "trend_vib": TrendAnalyzer.evaluate_trend_direction(rate_vib),
                    "trend_temp": TrendAnalyzer.evaluate_trend_direction(rate_temp),
                    "trend_current": TrendAnalyzer.evaluate_trend_direction(rate_current)
                }
            }
        }

        # Real-time WebSocket Broadcast
        await ws_manager.broadcast(packet)
        return packet["data"]

    @staticmethod
    def get_latest_data() -> Optional[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT r.*, h.health_score, h.health_status, h.risk_level, h.risk_reasons,
                       h.urgency, h.recommendation, h.observation, h.rate_of_change_temp,
                       h.rate_of_change_current, h.rate_of_change_vib, h.anomalies_detected
                FROM sensor_readings r
                LEFT JOIN health_evaluations h ON r.id = h.reading_id
                ORDER BY r.id DESC LIMIT 1
            """)
            row = cursor.fetchone()
            if not row:
                return None
            
            d = dict(row)
            try:
                d["risk_reasons"] = json.loads(d["risk_reasons"]) if d.get("risk_reasons") else []
            except Exception:
                d["risk_reasons"] = []
            try:
                d["anomalies_detected"] = json.loads(d["anomalies_detected"]) if d.get("anomalies_detected") else []
            except Exception:
                d["anomalies_detected"] = []
            return d

    @staticmethod
    def get_history(time_window: str = "30m", limit: int = 200, sensor: Optional[str] = None) -> List[Dict[str, Any]]:
        window_map = {
            "1m": "-1 minute",
            "5m": "-5 minutes",
            "30m": "-30 minutes",
            "1h": "-1 hour",
            "6h": "-6 hours",
            "24h": "-24 hours",
            "7d": "-7 days",
            "all": "-30 days"
        }
        time_modifier = window_map.get(time_window, "-30 minutes")

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"""
                SELECT r.id, r.timestamp, r.temperature, r.current, r.vibration,
                       r.motor_status, r.relay_status, r.is_simulated,
                       h.health_score, h.health_status, h.risk_level
                FROM sensor_readings r
                LEFT JOIN health_evaluations h ON r.id = h.reading_id
                WHERE r.timestamp >= datetime('now', '{time_modifier}')
                ORDER BY r.id DESC LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in reversed(rows)]

    @staticmethod
    def get_faults(limit: int = 50) -> List[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM fault_records
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_alerts(limit: int = 50) -> List[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM alert_events
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_maintenance_events(limit: int = 50) -> List[Dict[str, Any]]:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM maintenance_events
                ORDER BY id DESC LIMIT ?
            """, (limit,))
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def add_maintenance_event(event_type: str, priority: str, description: str, inspection_area: str, notes: Optional[str] = ""):
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO maintenance_events (timestamp, event_type, priority, description, inspection_area, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
            """, (now_iso, event_type, priority, description, inspection_area, notes))
            return cursor.lastrowid

    @staticmethod
    def get_statistics() -> StatisticsResponse:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT
                    AVG(temperature) as avg_temp, MAX(temperature) as max_temp,
                    AVG(current) as avg_current, MAX(current) as max_current,
                    AVG(vibration) as avg_vib, MAX(vibration) as max_vib,
                    COUNT(*) as total_readings
                FROM sensor_readings
            """)
            stats_row = cursor.fetchone()
            
            cursor.execute("SELECT AVG(health_score) FROM health_evaluations")
            avg_health = cursor.fetchone()[0] or 100.0

            cursor.execute("SELECT COUNT(*) FROM fault_records WHERE severity = 'CRITICAL'")
            fault_count = cursor.fetchone()[0] or 0

            cursor.execute("SELECT COUNT(*) FROM alert_events WHERE severity = 'WARNING'")
            warning_count = cursor.fetchone()[0] or 0

            cursor.execute("SELECT COUNT(*) FROM control_events WHERE command IN ('EMERGENCY_STOP', 'SAFETY_SHUTDOWN')")
            e_stop_count = cursor.fetchone()[0] or 0

            cursor.execute("SELECT COUNT(*) FROM maintenance_events")
            maint_count = cursor.fetchone()[0] or 0

            # Estimate motor operating duration (minutes)
            cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE motor_status = 'RUNNING'")
            running_samples = cursor.fetchone()[0] or 0
            operating_minutes = round((running_samples * 1.0) / 60.0, 1)

            return StatisticsResponse(
                avg_temp=round(stats_row["avg_temp"] or 0.0, 1),
                max_temp=round(stats_row["max_temp"] or 0.0, 1),
                avg_current=round(stats_row["avg_current"] or 0.0, 2),
                max_current=round(stats_row["max_current"] or 0.0, 2),
                avg_vibration=round(stats_row["avg_vib"] or 0.0, 2),
                max_vibration=round(stats_row["max_vib"] or 0.0, 2),
                avg_health_score=round(avg_health, 1),
                fault_count=fault_count,
                warning_count=warning_count,
                emergency_stop_count=e_stop_count,
                operating_duration_minutes=operating_minutes,
                maintenance_event_count=maint_count
            )

    @staticmethod
    def export_csv() -> str:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT r.id, r.timestamp, r.device_id, r.temperature, r.current, r.vibration,
                       r.motor_status, r.relay_status, r.is_simulated,
                       h.health_score, h.health_status, h.risk_level, h.urgency
                FROM sensor_readings r
                LEFT JOIN health_evaluations h ON r.id = h.reading_id
                ORDER BY r.id DESC LIMIT 1000
            """)
            rows = cursor.fetchall()
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                "ID", "Timestamp", "Device ID", "Temperature (°C)", "Current (A)",
                "Vibration (g)", "Motor Status", "Relay Status", "Is Simulated",
                "Health Score", "Health Status", "Risk Level", "Maintenance Urgency"
            ])
            for r in rows:
                writer.writerow(list(r))
            return output.getvalue()
