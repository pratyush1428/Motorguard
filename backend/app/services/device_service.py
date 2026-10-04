from datetime import datetime, timezone
from typing import Dict, Any
from ..database.connection import get_db
from ..models.schemas import DeviceStatusResponse
from .data_service import DataService

class DeviceService:
    TIMEOUT_SECONDS = 10.0  # Mark ESP32 offline if no update within 10 seconds

    @staticmethod
    def get_status(device_id: str = "MOTOR-001") -> DeviceStatusResponse:
        settings = DataService.get_settings()
        state = DataService.get_device_state(device_id)
        
        last_heartbeat_str = state.get("last_heartbeat")
        seconds_ago = None
        is_stale = False
        is_connected = False

        if last_heartbeat_str:
            try:
                # Handle ISO timestamps with or without timezone
                hb_clean = last_heartbeat_str.replace("Z", "+00:00")
                if "+" not in hb_clean and "-" not in hb_clean[10:]:
                    hb_clean += "+00:00"
                last_dt = datetime.fromisoformat(hb_clean)
                now_dt = datetime.now(timezone.utc)
                seconds_ago = max(0.0, (now_dt - last_dt).total_seconds())
                
                # In simulation mode, device is considered connected as long as simulation ticks
                if settings.system_mode == "SIMULATION":
                    is_connected = seconds_ago <= (DeviceService.TIMEOUT_SECONDS * 2)
                    is_stale = seconds_ago > DeviceService.TIMEOUT_SECONDS
                else:
                    is_connected = seconds_ago <= DeviceService.TIMEOUT_SECONDS
                    is_stale = seconds_ago > DeviceService.TIMEOUT_SECONDS
            except Exception:
                seconds_ago = 999.0
                is_connected = False
                is_stale = True
        else:
            is_connected = False
            is_stale = True

        return DeviceStatusResponse(
            device_id=device_id,
            esp32_connected=is_connected,
            backend_online=True,
            database_connected=True,
            last_heartbeat=last_heartbeat_str,
            seconds_since_last_update=round(seconds_ago, 1) if seconds_ago is not None else None,
            is_stale=is_stale,
            mode=settings.system_mode,
            power_source="2S Li-ion Battery Pack — 7.4V nominal",
            relay_status=state.get("relay_state", "ACTIVE"),
            motor_status=state.get("motor_state", "RUNNING"),
            emergency_stop_latched=bool(state.get("emergency_stop_latched", 0))
        )
