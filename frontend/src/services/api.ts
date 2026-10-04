import {
  TelemetryReading,
  HealthEvaluation,
  FaultRecord,
  AlertEvent,
  MaintenanceEvent,
  DeviceStatus,
  SystemSettings,
  SystemStatistics,
  SimulationMode,
  RelayStatus
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = {
  async getLatest(): Promise<TelemetryReading | null> {
    const res = await fetch(`${API_BASE_URL}/api/latest`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.status === 'empty' ? null : data;
  },

  async getHistory(window: string = '30m', limit: number = 300, sensor?: string): Promise<TelemetryReading[]> {
    let url = `${API_BASE_URL}/api/history?window=${encodeURIComponent(window)}&limit=${limit}`;
    if (sensor) url += `&sensor=${encodeURIComponent(sensor)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getHealth(): Promise<HealthEvaluation> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getFaults(limit: number = 50): Promise<FaultRecord[]> {
    const res = await fetch(`${API_BASE_URL}/api/faults?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getAlerts(limit: number = 50): Promise<AlertEvent[]> {
    const res = await fetch(`${API_BASE_URL}/api/alerts?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getMaintenance(limit: number = 50): Promise<MaintenanceEvent[]> {
    const res = await fetch(`${API_BASE_URL}/api/maintenance?limit=${limit}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async createMaintenance(payload: Partial<MaintenanceEvent>): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/maintenance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getDeviceStatus(): Promise<DeviceStatus> {
    const res = await fetch(`${API_BASE_URL}/api/device-status`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async triggerEmergencyStop(reason: string = 'Operator clicked Emergency Stop'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/emergency-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async resetEmergencyStop(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async setRelay(command: RelayStatus, reason: string = 'Manual operator control'): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/relay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: command === 'ACTIVE' ? 'ON' : 'OFF', reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `HTTP error ${res.status}`);
    }
    return res.json();
  },

  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async updateSettings(settings: SystemSettings): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async getStatistics(): Promise<SystemStatistics> {
    const res = await fetch(`${API_BASE_URL}/api/statistics`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  async setSimulationMode(mode: SimulationMode): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/simulation/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res.json();
  },

  getExportCsvUrl(): string {
    return `${API_BASE_URL}/api/export-csv`;
  }
};
