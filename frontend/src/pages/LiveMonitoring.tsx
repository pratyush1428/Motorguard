import React, { useState, useEffect } from 'react';
import { SensorChart } from '../charts/SensorChart';
import { TelemetryReading, SystemSettings } from '../types';
import { api } from '../services/api';
import { Clock, RefreshCw } from 'lucide-react';

interface LiveMonitoringProps {
  telemetry: TelemetryReading | null;
  settings: SystemSettings | null;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({ telemetry, settings }) => {
  const [timeWindow, setTimeWindow] = useState<string>('30m');
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getHistory(timeWindow, 300);
      setHistory(data);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [timeWindow]);

  // When live telemetry arrives, append to chart buffer
  useEffect(() => {
    if (telemetry) {
      setHistory((prev) => [...prev.slice(-300), telemetry]);
    }
  }, [telemetry?.reading_id]);

  const timeFilters = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '6h', value: '6h' },
    { label: '24h', value: '24h' },
    { label: '7d', value: '7d' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Time Window Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-industrial-800">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            INTELLIGENT LIVE SENSOR MONITORING
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Real-time sensor telemetry with rolling moving averages, rate of change, and threshold envelopes
          </p>
        </div>

        <div className="flex items-center gap-2 bg-industrial-950 p-1.5 rounded-lg border border-industrial-800">
          <Clock className="h-4 w-4 text-cyan-400 ml-1" />
          <div className="flex items-center gap-1">
            {timeFilters.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeWindow(tf.value)}
                className={`px-2.5 py-1 text-xs font-mono rounded font-medium transition-all ${
                  timeWindow === tf.value
                    ? 'bg-cyan-600 text-white shadow-glow-cyan/40'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-industrial-800'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchHistory}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-industrial-800 transition-all ml-1"
            title="Refresh history"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Real-Time Intelligent Charts Grid */}
      <div className="space-y-6">
        {/* Vibration Chart */}
        <SensorChart
          title="GY-521 MPU6050 — Dynamic Vibration"
          field="vibration"
          unit="g"
          data={history}
          warningThreshold={settings?.vibration_warning ?? 0.85}
          criticalThreshold={settings?.vibration_critical ?? 1.60}
          color="#38bdf8"
          stats={telemetry?.stats?.vibration}
          trend={telemetry?.stats?.trend_vib}
          rateOfChange={telemetry?.health?.rate_of_change_vib}
        />

        {/* Temperature Chart */}
        <SensorChart
          title="DS18B20 — Motor Casing Temperature"
          field="temperature"
          unit="°C"
          data={history}
          warningThreshold={settings?.temp_warning ?? 50.0}
          criticalThreshold={settings?.temp_critical ?? 65.0}
          color="#f43f5e"
          stats={telemetry?.stats?.temperature}
          trend={telemetry?.stats?.trend_temp}
          rateOfChange={telemetry?.health?.rate_of_change_temp}
        />

        {/* Current Draw Chart */}
        <SensorChart
          title="ACS712 20A — Motor Current Draw"
          field="current"
          unit="A"
          data={history}
          warningThreshold={settings?.current_warning ?? 1.80}
          criticalThreshold={settings?.current_critical ?? 2.80}
          color="#34d399"
          stats={telemetry?.stats?.current}
          trend={telemetry?.stats?.trend_current}
          rateOfChange={telemetry?.health?.rate_of_change_current}
        />
      </div>
    </div>
  );
};
