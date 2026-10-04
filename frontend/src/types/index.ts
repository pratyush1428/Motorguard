export type MotorStatus = 'RUNNING' | 'WARNING' | 'FAULT' | 'OFF';
export type RelayStatus = 'ACTIVE' | 'INACTIVE';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type Severity = 'INFO' | 'WARNING' | 'CRITICAL' | 'NORMAL';
export type SystemMode = 'SIMULATION' | 'HARDWARE';
export type SimulationMode = 'NORMAL' | 'HIGH_VIBRATION' | 'OVERHEATING' | 'OVERLOAD' | 'COMBINED_FAULT' | 'CRITICAL_FAULT';

export interface HealthEvaluation {
  health_score: number;
  health_status: 'Healthy' | 'Warning' | 'Critical';
  risk_level: RiskLevel;
  risk_reasons: string[];
  urgency: 'Routine' | 'Scheduled' | 'Immediate';
  recommendation: string;
  observation: string;
  rate_of_change_temp: number;
  rate_of_change_current: number;
  rate_of_change_vib: number;
  anomalies_detected: string[];
}

export interface SensorStats {
  min: number;
  max: number;
  mean: number;
  std: number;
}

export interface TelemetryReading {
  reading_id?: number;
  id?: number;
  device_id: string;
  timestamp: string;
  temperature: number;
  current: number;
  vibration: number;
  raw_vib_x?: number;
  raw_vib_y?: number;
  raw_vib_z?: number;
  motor_status: MotorStatus;
  relay_status: RelayStatus;
  is_simulated: boolean;
  health_score?: number;
  risk_level?: RiskLevel;
  health?: HealthEvaluation;
  faults?: FaultRecord[];
  alerts?: AlertEvent[];
  stats?: {
    vibration: SensorStats;
    temperature: SensorStats;
    current: SensorStats;
    trend_vib: string;
    trend_temp: string;
    trend_current: string;
  };
}

export interface FaultRecord {
  id?: number;
  timestamp: string;
  fault_name: string;
  severity: Severity;
  sensor: string;
  current_value: number;
  threshold: number;
  duration_seconds: number;
  reason: string;
  recommended_action: string;
  is_resolved: boolean;
}

export interface AlertEvent {
  id?: number;
  timestamp: string;
  severity: Severity;
  parameter: string;
  value: number;
  threshold: number;
  duration: string;
  reason: string;
  recommended_action: string;
  acknowledged: boolean;
}

export interface MaintenanceEvent {
  id?: number;
  timestamp: string;
  event_type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  description: string;
  inspection_area: string;
  notes?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
}

export interface DeviceStatus {
  device_id: string;
  esp32_connected: boolean;
  backend_online: boolean;
  database_connected: boolean;
  last_heartbeat: string | null;
  seconds_since_last_update: number | null;
  is_stale: boolean;
  mode: SystemMode;
  power_source: string;
  relay_status: RelayStatus;
  motor_status: MotorStatus;
  emergency_stop_latched: boolean;
}

export interface SystemSettings {
  temp_warning: number;
  temp_critical: number;
  current_warning: number;
  current_critical: number;
  vibration_warning: number;
  vibration_critical: number;
  moving_avg_window: number;
  alert_duration_seconds: number;
  auto_relay_shutdown: boolean;
  refresh_interval_ms: number;
  system_mode: SystemMode;
  simulation_mode: SimulationMode;
}

export interface SystemStatistics {
  avg_temp: number;
  max_temp: number;
  avg_current: number;
  max_current: number;
  avg_vibration: number;
  max_vibration: number;
  avg_health_score: number;
  fault_count: number;
  warning_count: number;
  emergency_stop_count: number;
  operating_duration_minutes: number;
  maintenance_event_count: number;
}
