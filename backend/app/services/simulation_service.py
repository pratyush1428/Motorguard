import asyncio
import math
import random
from datetime import datetime, timezone
from typing import Optional
from ..models.schemas import SensorDataPayload
from .data_service import DataService

class SimulationService:
    def __init__(self):
        self.is_running = False
        self.task: Optional[asyncio.Task] = None
        self.step = 0
        
        # Internal state memory for smooth continuous time-series curves
        self.temp_state = 34.5
        self.curr_state = 0.82
        self.vib_state = 0.28

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.task = asyncio.create_task(self._run_loop())

    def stop(self):
        self.is_running = False
        if self.task:
            self.task.cancel()
            self.task = None

    async def _run_loop(self):
        while self.is_running:
            try:
                settings = DataService.get_settings()
                if settings.system_mode != "SIMULATION":
                    await asyncio.sleep(1.0)
                    continue

                state = DataService.get_device_state("MOTOR-001")
                is_motor_off = (state.get("motor_state") == "OFF" or 
                                state.get("relay_state") == "INACTIVE" or 
                                state.get("emergency_stop_latched") == 1)

                self.step += 1
                sim_mode = settings.simulation_mode

                # If motor is OFF / isolated by Relay:
                if is_motor_off:
                    self.curr_state = 0.0
                    self.vib_state = round(max(0.02, 0.04 + 0.01 * math.sin(self.step)), 3)
                    # Ambient thermal decay toward 26.0°C
                    if self.temp_state > 26.5:
                        self.temp_state -= 0.35
                    else:
                        self.temp_state = 26.0 + 0.2 * math.sin(self.step * 0.1)
                else:
                    # Motor is RUNNING
                    if sim_mode == "NORMAL":
                        # Smooth natural oscillation around nominal operating point
                        self.temp_state = 34.0 + 1.2 * math.sin(self.step * 0.05) + random.uniform(-0.15, 0.15)
                        self.curr_state = 0.85 + 0.06 * math.sin(self.step * 0.1) + random.uniform(-0.03, 0.03)
                        self.vib_state = 0.28 + 0.05 * math.sin(self.step * 0.2) + random.uniform(-0.02, 0.02)

                    elif sim_mode == "HIGH_VIBRATION":
                        # Mechanical looseness / unbalance: vibration gradually ramps up above warning (0.85g)
                        self.temp_state = 36.0 + 1.0 * math.sin(self.step * 0.05)
                        self.curr_state = 0.95 + 0.08 * math.sin(self.step * 0.1)
                        target_vib = 1.35 + 0.18 * math.sin(self.step * 0.3) + random.uniform(-0.04, 0.04)
                        self.vib_state += (target_vib - self.vib_state) * 0.15

                    elif sim_mode == "OVERHEATING":
                        # Ventilation blocked / high ambient: temp gradually ramps up past warning (50°C) toward 62°C
                        target_temp = 58.5 + 2.0 * math.sin(self.step * 0.05)
                        self.temp_state += (target_temp - self.temp_state) * 0.08
                        self.curr_state = 1.15 + 0.05 * math.sin(self.step * 0.1)
                        self.vib_state = 0.35 + 0.04 * math.sin(self.step * 0.2)

                    elif sim_mode == "OVERLOAD":
                        # Heavy mechanical torque / binding shaft: current rises above warning (1.8A)
                        self.temp_state = 42.0 + 1.5 * math.sin(self.step * 0.05)
                        target_curr = 2.35 + 0.12 * math.sin(self.step * 0.2) + random.uniform(-0.05, 0.05)
                        self.curr_state += (target_curr - self.curr_state) * 0.2
                        self.vib_state = 0.55 + 0.08 * math.sin(self.step * 0.2)

                    elif sim_mode == "COMBINED_FAULT":
                        # Compound multi-parameter deterioration: elevated vibration + temp + current
                        target_temp = 55.0 + 1.5 * math.sin(self.step * 0.05)
                        target_curr = 2.15 + 0.10 * math.sin(self.step * 0.15)
                        target_vib = 1.25 + 0.15 * math.sin(self.step * 0.25)
                        self.temp_state += (target_temp - self.temp_state) * 0.1
                        self.curr_state += (target_curr - self.curr_state) * 0.15
                        self.vib_state += (target_vib - self.vib_state) * 0.15

                    elif sim_mode == "CRITICAL_FAULT":
                        # Severe emergency condition (stall or severe unbalance)
                        # Breaches critical current (2.8A) and critical vibration (1.60g)
                        self.curr_state = 3.25 + random.uniform(-0.1, 0.1)
                        self.vib_state = 1.85 + random.uniform(-0.05, 0.05)
                        self.temp_state = min(72.0, self.temp_state + 0.8)

                # Construct realistic 3-axis accelerometer readings from magnitude
                # |a| = sqrt(x^2 + y^2 + z^2) - 1.0 (gravity compensated)
                raw_x = round(self.vib_state * 0.707 + random.uniform(-0.02, 0.02), 3)
                raw_y = round(self.vib_state * 0.707 + random.uniform(-0.02, 0.02), 3)
                raw_z = round(1.0 + random.uniform(-0.03, 0.03), 3)  # gravity along Z

                now_iso = datetime.now(timezone.utc).isoformat()
                payload = SensorDataPayload(
                    device_id="MOTOR-001",
                    timestamp=now_iso,
                    temperature=round(self.temp_state, 1),
                    current=round(self.curr_state, 2),
                    vibration=round(self.vib_state, 3),
                    raw_vib_x=raw_x,
                    raw_vib_y=raw_y,
                    raw_vib_z=raw_z,
                    motor_status="OFF" if is_motor_off else ("WARNING" if sim_mode != "NORMAL" else "RUNNING"),
                    relay_status="INACTIVE" if is_motor_off else "ACTIVE",
                    is_simulated=True
                )

                await DataService.process_sensor_data(payload)
                interval = max(0.5, settings.refresh_interval_ms / 1000.0)
                await asyncio.sleep(interval)

            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[SimulationEngine Error]: {e}")
                await asyncio.sleep(2.0)

simulation_engine = SimulationService()
