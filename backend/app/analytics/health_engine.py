from typing import List, Dict, Any
from ..models.schemas import HealthEvaluation, SystemSettings

class HealthEngine:
    @staticmethod
    def evaluate(
        temperature: float,
        current: float,
        vibration: float,
        settings: SystemSettings,
        rate_temp: float,
        rate_current: float,
        rate_vib: float,
        abnormal_duration_sec: float = 0.0,
        historical_stats: Dict[str, Any] = None
    ) -> HealthEvaluation:
        # Base health score starts at 100
        health_score = 100.0
        risk_reasons: List[str] = []
        anomalies: List[str] = []
        penalties = 0.0

        # --- 1. Vibration Penalty ---
        if vibration >= settings.vibration_critical:
            penalties += 40.0
            anomalies.append(f"Critical Vibration ({vibration}g >= {settings.vibration_critical}g)")
            risk_reasons.append(f"Vibration is severely elevated at {vibration}g, exceeding the critical limit ({settings.vibration_critical}g).")
        elif vibration >= settings.vibration_warning:
            fraction = (vibration - settings.vibration_warning) / max(0.01, (settings.vibration_critical - settings.vibration_warning))
            v_pen = 15.0 + (fraction * 15.0)
            penalties += v_pen
            anomalies.append(f"Warning Vibration ({vibration}g)")
            if historical_stats and historical_stats.get("vib", {}).get("mean"):
                mean_v = historical_stats["vib"]["mean"]
                pct_above = ((vibration - mean_v) / max(0.01, mean_v)) * 100
                risk_reasons.append(f"Vibration ({vibration}g) is {pct_above:+.0f}% above historical mean ({mean_v}g).")
            else:
                risk_reasons.append(f"Vibration ({vibration}g) is above the warning threshold ({settings.vibration_warning}g).")

        # --- 2. Temperature Penalty ---
        if temperature >= settings.temp_critical:
            penalties += 40.0
            anomalies.append(f"Critical Overheating ({temperature}°C >= {settings.temp_critical}°C)")
            risk_reasons.append(f"Motor housing temperature is critical at {temperature}°C, exceeding safe limit ({settings.temp_critical}°C).")
        elif temperature >= settings.temp_warning:
            fraction = (temperature - settings.temp_warning) / max(0.01, (settings.temp_critical - settings.temp_warning))
            t_pen = 15.0 + (fraction * 15.0)
            penalties += t_pen
            anomalies.append(f"Warning Temperature ({temperature}°C)")
            risk_reasons.append(f"Temperature is elevated at {temperature}°C (warning threshold: {settings.temp_warning}°C).")

        # --- 3. Current Penalty ---
        if current >= settings.current_critical:
            penalties += 40.0
            anomalies.append(f"Critical Overcurrent/Stall ({current}A >= {settings.current_critical}A)")
            risk_reasons.append(f"Current draw is critical at {current}A, indicating motor stall or extreme mechanical overload.")
        elif current >= settings.current_warning:
            fraction = (current - settings.current_warning) / max(0.01, (settings.current_critical - settings.current_warning))
            c_pen = 15.0 + (fraction * 15.0)
            penalties += c_pen
            anomalies.append(f"Warning Overcurrent ({current}A)")
            risk_reasons.append(f"Current ({current}A) exceeds warning threshold ({settings.current_warning}A).")

        # --- 4. Dynamic Rates of Change ---
        if rate_temp > 1.2:
            penalties += 8.0
            risk_reasons.append(f"Temperature is rising rapidly at {rate_temp:+.2f}°C/min.")
        if rate_vib > 0.4:
            penalties += 8.0
            risk_reasons.append(f"Vibration rate of change is accelerating at {rate_vib:+.2f}g/min.")
        if rate_current > 0.5:
            penalties += 8.0
            risk_reasons.append(f"Current draw is spiking at {rate_current:+.2f}A/min.")

        # --- 5. Sustained Duration in Abnormal State ---
        if abnormal_duration_sec > 30.0:
            duration_pen = min(15.0, (abnormal_duration_sec / 30.0) * 5.0)
            penalties += duration_pen
            risk_reasons.append(f"Abnormal conditions have persisted continuously for {int(abnormal_duration_sec)} seconds.")

        # Calculate final health score (bounded 0 to 100)
        health_score = max(0.0, min(100.0, round(100.0 - penalties, 1)))

        # Categorize Health Status
        if health_score >= 90.0:
            health_status = "Healthy"
        elif health_score >= 70.0:
            health_status = "Warning"
        else:
            health_status = "Critical"

        # Categorize Risk Level & Urgency
        if health_score < 60.0 or any("Critical" in a for a in anomalies):
            risk_level = "CRITICAL"
            urgency = "Immediate"
            recommendation = "Execute immediate controlled shutdown. Isolate 2S Li-ion battery pack and inspect motor winding, shaft binding, and drive electronics."
            observation = "Motor is experiencing critical operational distress. Immediate intervention required to prevent permanent hardware damage."
        elif health_score < 75.0 or len(anomalies) >= 2:
            risk_level = "HIGH"
            urgency = "Immediate"
            recommendation = "Schedule inspection within the shift. Check motor mounting tightness, shaft alignment, and thermal dissipation path."
            observation = "Multiple abnormal parameters detected. Thermal and mechanical stress compounding."
        elif health_score < 90.0 or len(anomalies) == 1:
            risk_level = "MODERATE"
            urgency = "Scheduled"
            recommendation = "Monitor trend progression. Verify coupling tightness and ensure motor is not operating near torque stall."
            observation = "Minor parameter deviation above baseline. Condition is non-critical but trending unfavorably."
        else:
            risk_level = "LOW"
            urgency = "Routine"
            recommendation = "Continue standard operating protocol. No immediate mechanical or electrical servicing needed."
            observation = "All electromechanical parameters within nominal prototype specifications."
            risk_reasons = ["All sensor telemetry values reside within calibrated normal envelopes."]

        return HealthEvaluation(
            health_score=health_score,
            health_status=health_status,
            risk_level=risk_level,
            risk_reasons=risk_reasons,
            urgency=urgency,
            recommendation=recommendation,
            observation=observation,
            rate_of_change_temp=rate_temp,
            rate_of_change_current=rate_current,
            rate_of_change_vib=rate_vib,
            anomalies_detected=anomalies
        )
