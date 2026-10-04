from typing import List, Dict, Any, Optional, Tuple
from ..models.schemas import FaultRecord, AlertEvent, SystemSettings

class FaultDetector:
    @staticmethod
    def detect_faults(
        temperature: float,
        current: float,
        vibration: float,
        settings: SystemSettings,
        rate_temp: float,
        rate_current: float,
        rate_vib: float,
        timestamp: str,
        duration_abnormal_seconds: float = 0.0
    ) -> Tuple[List[FaultRecord], List[AlertEvent]]:
        faults: List[FaultRecord] = []
        alerts: List[AlertEvent] = []

        # Check Critical Conditions
        is_critical_temp = temperature >= settings.temp_critical
        is_critical_current = current >= settings.current_critical
        is_critical_vib = vibration >= settings.vibration_critical
        has_critical = is_critical_temp or is_critical_current or is_critical_vib

        # Check Warning Conditions
        is_warn_temp = temperature >= settings.temp_warning
        is_warn_current = current >= settings.current_warning
        is_warn_vib = vibration >= settings.vibration_warning

        warn_count = sum([is_warn_temp, is_warn_current, is_warn_vib])

        # 1. Critical Fault check
        if has_critical:
            crit_param = []
            if is_critical_temp: crit_param.append(f"Temperature ({temperature}°C >= {settings.temp_critical}°C)")
            if is_critical_current: crit_param.append(f"Current ({current}A >= {settings.current_critical}A)")
            if is_critical_vib: crit_param.append(f"Vibration ({vibration}g >= {settings.vibration_critical}g)")

            fault_msg = "Critical physical threshold exceeded: " + ", ".join(crit_param)
            action_msg = "Initiate emergency motor shutdown immediately. Inspect motor and electrical supply."
            
            faults.append(FaultRecord(
                timestamp=timestamp,
                fault_name="Critical Fault",
                severity="CRITICAL",
                sensor="MULTI" if len(crit_param) > 1 else ("TEMPERATURE" if is_critical_temp else ("CURRENT" if is_critical_current else "VIBRATION")),
                current_value=max(temperature, current, vibration),
                threshold=settings.temp_critical if is_critical_temp else (settings.current_critical if is_critical_current else settings.vibration_critical),
                duration_seconds=duration_abnormal_seconds,
                reason=fault_msg,
                recommended_action=action_msg,
                is_resolved=False
            ))
            alerts.append(AlertEvent(
                timestamp=timestamp,
                severity="CRITICAL",
                parameter="SAFETY_SHUTDOWN",
                value=max(temperature, current, vibration),
                threshold=0.0,
                duration=f"{int(duration_abnormal_seconds)}s",
                reason=fault_msg,
                recommended_action=action_msg,
                acknowledged=False
            ))
            return faults, alerts

        # 2. Combined Abnormal Condition
        if warn_count >= 2:
            faults.append(FaultRecord(
                timestamp=timestamp,
                fault_name="Combined Abnormal Condition",
                severity="WARNING",
                sensor="MULTI-SENSOR",
                current_value=round(vibration, 2),
                threshold=settings.vibration_warning,
                duration_seconds=duration_abnormal_seconds,
                reason=f"Multiple sensors simultaneously abnormal (Temp: {temperature}°C, Current: {current}A, Vib: {vibration}g).",
                recommended_action="Inspect electro-mechanical coupling, bearings, and drive circuit under reduced load.",
                is_resolved=False
            ))
            alerts.append(AlertEvent(
                timestamp=timestamp,
                severity="WARNING",
                parameter="MULTI_SENSOR",
                value=round(vibration, 2),
                threshold=settings.vibration_warning,
                duration=f"{int(duration_abnormal_seconds)}s",
                reason="Correlated multi-parameter degradation detected.",
                recommended_action="Perform comprehensive mechanical and electrical audit.",
                acknowledged=False
            ))

        # 3. Vibration & Imbalance Checks
        if is_warn_vib:
            fault_name = "Possible Imbalance" if (vibration > 1.2 and current < settings.current_warning) else "High Vibration"
            faults.append(FaultRecord(
                timestamp=timestamp,
                fault_name=fault_name,
                severity="WARNING",
                sensor="VIBRATION",
                current_value=vibration,
                threshold=settings.vibration_warning,
                duration_seconds=duration_abnormal_seconds,
                reason=f"Vibration magnitude {vibration}g exceeds warning threshold {settings.vibration_warning}g (rate: {rate_vib:+.2f}g/min).",
                recommended_action="Inspect motor mounting rigidity, shaft alignment, coupling, and rotating eccentric mass.",
                is_resolved=False
            ))
            alerts.append(AlertEvent(
                timestamp=timestamp,
                severity="WARNING",
                parameter="VIBRATION",
                value=vibration,
                threshold=settings.vibration_warning,
                duration=f"{int(duration_abnormal_seconds)}s",
                reason=f"Elevated vibration ({vibration}g).",
                recommended_action="Check rotor balance and secure mounting hardware.",
                acknowledged=False
            ))

        # 4. Temperature & Overheating Checks
        if is_warn_temp:
            fault_name = "Possible Overheating" if rate_temp > 1.5 else "High Temperature"
            faults.append(FaultRecord(
                timestamp=timestamp,
                fault_name=fault_name,
                severity="WARNING",
                sensor="TEMPERATURE",
                current_value=temperature,
                threshold=settings.temp_warning,
                duration_seconds=duration_abnormal_seconds,
                reason=f"Motor housing temperature {temperature}°C exceeds {settings.temp_warning}°C (rate: {rate_temp:+.2f}°C/min).",
                recommended_action="Inspect motor ventilation, ambient cooling, and verify mechanical friction or duty cycle.",
                is_resolved=False
            ))
            alerts.append(AlertEvent(
                timestamp=timestamp,
                severity="WARNING",
                parameter="TEMPERATURE",
                value=temperature,
                threshold=settings.temp_warning,
                duration=f"{int(duration_abnormal_seconds)}s",
                reason=f"Elevated motor temperature ({temperature}°C).",
                recommended_action="Ensure adequate airflow and reduce duty cycle.",
                acknowledged=False
            ))

        # 5. Current & Overload Checks
        if is_warn_current:
            fault_name = "Possible Overload" if current > 2.2 else "High Current"
            faults.append(FaultRecord(
                timestamp=timestamp,
                fault_name=fault_name,
                severity="WARNING",
                sensor="CURRENT",
                current_value=current,
                threshold=settings.current_warning,
                duration_seconds=duration_abnormal_seconds,
                reason=f"Motor current {current}A exceeds warning threshold {settings.current_warning}A (rate: {rate_current:+.2f}A/min).",
                recommended_action="Check mechanical shaft for resistance, jamming, binding gears, or excessive torque demand.",
                is_resolved=False
            ))
            alerts.append(AlertEvent(
                timestamp=timestamp,
                severity="WARNING",
                parameter="CURRENT",
                value=current,
                threshold=settings.current_warning,
                duration=f"{int(duration_abnormal_seconds)}s",
                reason=f"Elevated current draw ({current}A).",
                recommended_action="Check for mechanical obstruction or gear binding.",
                acknowledged=False
            ))

        # 6. Normal Operation if no warnings or critical
        if not faults:
            faults.append(FaultRecord(
                timestamp=timestamp,
                fault_name="Normal Operation",
                severity="NORMAL",
                sensor="ALL",
                current_value=max(temperature, current, vibration),
                threshold=0.0,
                duration_seconds=0.0,
                reason="All parameters are within nominal operational boundaries.",
                recommended_action="Continue standard monitoring routine.",
                is_resolved=True
            ))

        return faults, alerts
