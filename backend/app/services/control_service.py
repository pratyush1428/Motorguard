from datetime import datetime, timezone
from typing import Dict, Any, Optional
from ..database.connection import get_db
from .websocket_manager import ws_manager

class ControlService:
    @staticmethod
    async def emergency_stop(device_id: str = "MOTOR-001", reason: str = "Manual Emergency Stop triggered") -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE device_state
                SET emergency_stop_latched = 1, relay_state = 'INACTIVE', motor_state = 'OFF'
                WHERE device_id = ?
            """, (device_id,))
            cursor.execute("""
                INSERT INTO control_events (timestamp, command, source, previous_state, new_state, reason)
                VALUES (?, 'EMERGENCY_STOP', 'OPERATOR_WEB_UI', 'ACTIVE', 'INACTIVE', ?)
            """, (now_iso, reason))

        event = {
            "type": "CONTROL_EVENT",
            "data": {
                "command": "EMERGENCY_STOP",
                "relay_status": "INACTIVE",
                "motor_status": "OFF",
                "emergency_stop_latched": True,
                "reason": reason,
                "timestamp": now_iso
            }
        }
        await ws_manager.broadcast(event)
        return event["data"]

    @staticmethod
    async def reset_emergency_stop(device_id: str = "MOTOR-001", reason: str = "Manual reset performed") -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE device_state
                SET emergency_stop_latched = 0, relay_state = 'ACTIVE', motor_state = 'RUNNING'
                WHERE device_id = ?
            """, (device_id,))
            cursor.execute("""
                INSERT INTO control_events (timestamp, command, source, previous_state, new_state, reason)
                VALUES (?, 'RESET_LATCH', 'OPERATOR_WEB_UI', 'INACTIVE', 'ACTIVE', ?)
            """, (now_iso, reason))

        event = {
            "type": "CONTROL_EVENT",
            "data": {
                "command": "RESET",
                "relay_status": "ACTIVE",
                "motor_status": "RUNNING",
                "emergency_stop_latched": False,
                "reason": reason,
                "timestamp": now_iso
            }
        }
        await ws_manager.broadcast(event)
        return event["data"]

    @staticmethod
    async def set_relay(command: str, device_id: str = "MOTOR-001", reason: str = "Manual relay command") -> Dict[str, Any]:
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT emergency_stop_latched FROM device_state WHERE device_id = ?", (device_id,))
            row = cursor.fetchone()
            is_latched = row["emergency_stop_latched"] if row else 0

            # If emergency stop is latched, prevent turning relay back ON without reset
            if is_latched and command.upper() == "ON":
                raise ValueError("Cannot activate relay while Emergency Stop is latched! Please perform a Reset first.")

            new_relay = "ACTIVE" if command.upper() == "ON" else "INACTIVE"
            new_motor = "RUNNING" if command.upper() == "ON" else "OFF"

            cursor.execute("""
                UPDATE device_state
                SET relay_state = ?, motor_state = ?
                WHERE device_id = ?
            """, (new_relay, new_motor, device_id))

            cursor.execute("""
                INSERT INTO control_events (timestamp, command, source, previous_state, new_state, reason)
                VALUES (?, ?, 'OPERATOR_WEB_UI', ?, ?, ?)
            """, (now_iso, f"RELAY_{command.upper()}", "INACTIVE" if new_relay == "ACTIVE" else "ACTIVE", new_relay, reason))

        event = {
            "type": "CONTROL_EVENT",
            "data": {
                "command": f"RELAY_{command.upper()}",
                "relay_status": new_relay,
                "motor_status": new_motor,
                "emergency_stop_latched": bool(is_latched),
                "reason": reason,
                "timestamp": now_iso
            }
        }
        await ws_manager.broadcast(event)
        return event["data"]
