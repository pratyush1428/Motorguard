import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { SystemSettings } from '../types';
import { api } from '../services/api';
import { Save, RotateCcw, CheckCircle, Sliders, Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SettingsPageProps {
  settings: SystemSettings | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onRefresh }) => {
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState<SystemSettings | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  if (!formData) {
    return <div className="p-6 text-gray-400 font-mono text-xs">Loading settings...</div>;
  }

  const handleChange = (field: keyof SystemSettings, val: any) => {
    setFormData(prev => prev ? ({ ...prev, [field]: val }) : null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    try {
      setLoading(true);
      await api.updateSettings(formData);
      setSaveSuccess(true);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-industrial-800">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            <Sliders className="h-6 w-6 text-cyan-400" />
            OPERATIONAL THRESHOLDS & ENGINE SETTINGS
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Configure dynamic warning and critical safety trip levels, rolling average filters, and mode toggles
          </p>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-mono">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            Configuration Updated
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance & Theme Setting */}
        <Card title="Display Theme & Appearance" subtitle="Select interface color scheme for industrial operations or high-contrast daylight visibility">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'dark'
                  ? 'bg-industrial-950 border-cyan-500 text-cyan-300 shadow-glow-cyan/20 ring-1 ring-cyan-500'
                  : 'bg-industrial-950/60 border-industrial-800 text-gray-400 hover:border-industrial-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme === 'dark' ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/40' : 'bg-industrial-900 text-gray-400'}`}>
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono font-bold text-xs uppercase text-white flex items-center gap-2">
                    Dark Industrial Theme {theme === 'dark' && <span className="text-[10px] text-cyan-400 font-sans font-medium">(Active)</span>}
                  </div>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    Sleek dark engineering palette with glowing status accents. Ideal for control rooms.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border text-left transition-all ${
                theme === 'light'
                  ? 'bg-industrial-850 border-cyan-500 text-cyan-600 shadow-sm ring-1 ring-cyan-500'
                  : 'bg-industrial-950/60 border-industrial-800 text-gray-400 hover:border-industrial-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${theme === 'light' ? 'bg-cyan-100 text-cyan-700 border border-cyan-300' : 'bg-industrial-900 text-gray-400'}`}>
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-mono font-bold text-xs uppercase text-white flex items-center gap-2">
                    Light Engineering Theme {theme === 'light' && <span className="text-[10px] text-cyan-600 font-sans font-medium">(Active)</span>}
                  </div>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    High-contrast daylight theme for outdoor motor inspections and high-ambient lighting.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </Card>

        {/* Operational Mode Card */}
        <Card title="System Operational Mode" subtitle="Select between simulated prototype data and physical ESP32 hardware telemetry">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
              formData.system_mode === 'SIMULATION'
                ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-glow-amber/20'
                : 'bg-industrial-950 border-industrial-800 text-gray-400 hover:border-industrial-700'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="system_mode"
                  checked={formData.system_mode === 'SIMULATION'}
                  onChange={() => handleChange('system_mode', 'SIMULATION')}
                  className="accent-amber-400"
                />
                <div>
                  <div className="font-mono font-bold text-xs uppercase text-white">Simulation Mode — Demo Data</div>
                  <p className="text-xs text-gray-400 font-sans mt-1">
                    Generates realistic time-series data with configurable fault injection scenarios for testing.
                  </p>
                </div>
              </div>
            </label>

            <label className={`p-4 rounded-xl border cursor-pointer transition-all ${
              formData.system_mode === 'HARDWARE'
                ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-glow-cyan/20'
                : 'bg-industrial-950 border-industrial-800 text-gray-400 hover:border-industrial-700'
            }`}>
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="system_mode"
                  checked={formData.system_mode === 'HARDWARE'}
                  onChange={() => handleChange('system_mode', 'HARDWARE')}
                  className="accent-cyan-400"
                />
                <div>
                  <div className="font-mono font-bold text-xs uppercase text-white">Hardware Mode — Real Data</div>
                  <p className="text-xs text-gray-400 font-sans mt-1">
                    Ingests live telemetry from physical ESP32, GY-521, DS18B20, and ACS712 over Wi-Fi.
                  </p>
                </div>
              </div>
            </label>
          </div>
        </Card>

        {/* Safety Trip & Threshold Envelopes */}
        <Card title="Threshold Calibration Envelopes" subtitle="Define boundary levels for Warning and Critical Safety Shutdown">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
            {/* Temperature */}
            <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-3">
              <span className="text-xs font-bold text-rose-300 uppercase block">Motor Temperature (°C)</span>
              <div>
                <label className="text-gray-400 block mb-1">Warning Threshold (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.temp_warning}
                  onChange={(e) => handleChange('temp_warning', parseFloat(e.target.value))}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Critical Shutdown (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.temp_critical}
                  onChange={(e) => handleChange('temp_critical', parseFloat(e.target.value))}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded p-2 text-white"
                />
              </div>
            </div>

            {/* Current */}
            <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-3">
              <span className="text-xs font-bold text-emerald-300 uppercase block">Current Draw (A)</span>
              <div>
                <label className="text-gray-400 block mb-1">Warning Threshold (A)</label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.current_warning}
                  onChange={(e) => handleChange('current_warning', parseFloat(e.target.value))}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Critical Trip / Stall (A)</label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.current_critical}
                  onChange={(e) => handleChange('current_critical', parseFloat(e.target.value))}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded p-2 text-white"
                />
              </div>
            </div>

            {/* Vibration */}
            <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-3">
              <span className="text-xs font-bold text-cyan-300 uppercase block">Vibration (g)</span>
              <div>
                <label className="text-gray-400 block mb-1">Warning Threshold (g)</label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.vibration_warning}
                  onChange={(e) => handleChange('vibration_warning', parseFloat(e.target.value))}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="text-gray-400 block mb-1">Critical Shutdown (g)</label>
                <input
                  type="number"
                  step="0.05"
                  value={formData.vibration_critical}
                  onChange={(e) => handleChange('vibration_critical', parseFloat(e.target.value))}
                  className="w-full bg-industrial-900 border border-industrial-700 rounded p-2 text-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Analytics & Relay Safety Configuration */}
        <Card title="Algorithm & Safety Interlock Parameters" subtitle="Rolling window smoothing and automatic trip logic">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
            <div>
              <label className="text-gray-400 block mb-1">Moving Average Window (Samples)</label>
              <input
                type="number"
                min="3"
                max="50"
                value={formData.moving_avg_window}
                onChange={(e) => handleChange('moving_avg_window', parseInt(e.target.value, 10))}
                className="w-full bg-industrial-950 border border-industrial-700 rounded p-2 text-white"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Number of samples for rolling mean calculation</span>
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Telemetry Refresh Interval (ms)</label>
              <input
                type="number"
                step="100"
                min="500"
                max="5000"
                value={formData.refresh_interval_ms}
                onChange={(e) => handleChange('refresh_interval_ms', parseInt(e.target.value, 10))}
                className="w-full bg-industrial-950 border border-industrial-700 rounded p-2 text-white"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">Default: 1000ms (1 Hz update rate)</span>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.auto_relay_shutdown}
                  onChange={(e) => handleChange('auto_relay_shutdown', e.target.checked)}
                  className="h-4 w-4 rounded accent-rose-500"
                />
                <div>
                  <span className="font-mono font-bold text-white text-xs">Auto Relay Safety Trip</span>
                  <p className="text-[11px] text-gray-400 font-sans">
                    Automatically de-energizes the safety relay upon any critical threshold violation.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Save button */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs uppercase tracking-wider shadow-glow-cyan/40 transition-all"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving Changes...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
};
