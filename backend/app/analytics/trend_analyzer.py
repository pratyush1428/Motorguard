import statistics
from typing import List, Dict, Any, Tuple
from datetime import datetime

class TrendAnalyzer:
    @staticmethod
    def calculate_rate_of_change(recent_readings: List[Dict[str, Any]], field: str) -> float:
        """
        Calculates rate of change per minute for a given field over the recent time window.
        Returns value/minute.
        """
        if len(recent_readings) < 2:
            return 0.0
        
        first = recent_readings[0]
        last = recent_readings[-1]
        
        try:
            t1 = datetime.fromisoformat(first["timestamp"].replace("Z", ""))
            t2 = datetime.fromisoformat(last["timestamp"].replace("Z", ""))
            time_delta_sec = max(1.0, (t2 - t1).total_seconds())
        except Exception:
            time_delta_sec = max(1.0, float(len(recent_readings)))
        
        val_delta = last.get(field, 0.0) - first.get(field, 0.0)
        rate_per_minute = (val_delta / time_delta_sec) * 60.0
        return round(rate_per_minute, 3)

    @staticmethod
    def compute_summary_stats(values: List[float]) -> Dict[str, float]:
        """
        Returns min, max, mean, and standard deviation for a list of floats.
        """
        if not values:
            return {"min": 0.0, "max": 0.0, "mean": 0.0, "std": 0.0}
        
        mn = min(values)
        mx = max(values)
        mean_val = statistics.mean(values)
        std_val = statistics.stdev(values) if len(values) > 1 else 0.0
        return {
            "min": round(mn, 2),
            "max": round(mx, 2),
            "mean": round(mean_val, 2),
            "std": round(std_val, 3)
        }

    @staticmethod
    def evaluate_trend_direction(rate: float, threshold: float = 0.05) -> str:
        """
        Determines if the sensor is INCREASING, DECREASING, or STABLE.
        """
        if rate > threshold:
            return "INCREASING"
        elif rate < -threshold:
            return "DECREASING"
        else:
            return "STABLE"
