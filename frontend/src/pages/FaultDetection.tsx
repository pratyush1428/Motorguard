import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { FaultRecord, SystemSettings, SimulationMode } from '../types';
import { api } from '../services/api';
import {
  AlertOctagon,
  Flame,
  Zap,
  Activity,
  Layers,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface FaultDetectionProps {
  settings: SystemSettings | null;
  onRefresh: () => void;
}

export const FaultDetection: React.FC<FaultDetectionProps> = ({ settings, onRefresh }) => {
  const [faults, setFaults] = useState<FaultRecord[]>([]);
  const [activeSimulationMode, setActiveSimulationMode] = useState<SimulationMode>(
    settings?.simulation_mode || 'NORMAL'
  );
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (settings?.simulation_mode) {
      setActiveSimulationMode(settings.simulation_mode);
    }
  }, [settings?.simulation_mode]);

  const loadFaults = async () => {
    try {
      const data = await api.getFaults(50);
      setFaults(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadFaults();
    const interval = setInterval(loadFaults, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSetSimulationMode = async (mode: SimulationMode) => {
    try {
      setLoading(true);
      await api.setSimulationMode(mode);
      setActiveSimulationMode(mode);
      onRefresh();
    } catch (e) {
      console.error('Failed to set simulation mode:', e);
    } finally {
      setLoading(false);
    }
  };

  const simulationOptions: {
    mode: SimulationMode;
    label: string;
    desc: string;
    icon: any;
    color: string;
  }[] = [
    {
      mode: 'NORMAL',
      label: 'Normal Operation',
      desc: 'Small natural fluctuations within safe calibrated envelopes.',
      icon: ShieldCheck,
      color: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20'
    },
    {
      mode: 'HIGH_VIBRATION',
      label: 'High Vibration',
      desc: 'Gradual ramp up in acceleration magnitude (>0.85g), simulating loose mounting.',
      icon: Activity,
      color: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/20'
    },
    {
      mode: 'OVERHEATING',
      label: 'Overheating',
      desc: 'Continuous thermal rise (>50°C), simulating restricted airflow.',
      icon: Flame,
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/20'
    },
    {
      mode: 'OVERLOAD',
      label: 'Overload',
      desc: 'Current rises above warning (>1.80A), simulating shaft friction or binding.',
      icon: Zap,
      color: 'text-amber-400 border-amber-500/40 bg-amber-950/20'
    },
    {
      mode: 'COMBINED_FAULT',
      label: 'Combined Fault',
      desc: 'Simultaneous elevation of vibration, temperature, and current.',
      icon: Layers,
      color: 'text-rose-400 border-rose-500/40 bg-rose-950/20'
    },
    {
      mode: 'CRITICAL_FAULT',
      label: 'Critical Fault',
      desc: 'Breaches critical thresholds (3.2A, 1.85g), triggering auto relay shutdown.',
      icon: AlertOctagon,
      color: 'text-rose-500 border-rose-600 bg-rose-950/40'
    }
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Simulation Scenario Trigger Panel */}
      <Card
        title="Electromechanical Fault Simulation Engine"
        subtitle="Inject realistic physical time-series conditions to test detection and automatic safety trip"
      >
        <div className="mb-3 px-3 py-1.5 rounded bg-industrial-950 border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center justify-between">
          <span>ACTIVE SCENARIO: {activeSimulationMode}</span>
          <span className="text-[10px] text-gray-400">Time-series generation active in backend</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulationOptions.map((opt) => {
            const isSelected = activeSimulationMode === opt.mode;
            const Icon = opt.icon;
            return (
              <button
                key={opt.mode}
                onClick={() => handleSetSimulationMode(opt.mode)}
                disabled={loading}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? `${opt.color} ring-2 ring-cyan-400 shadow-glow-cyan/30`
                    : 'bg-industrial-950/60 border-industrial-800 hover:border-industrial-700 hover:bg-industrial-900'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase text-white flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-cyan-400" />
                      {opt.label}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500 text-cyan-300">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-sans mt-2">{opt.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-industrial-800/80 flex items-center justify-between text-[11px] font-mono text-cyan-400">
                  <span>{isSelected ? 'Currently Running' : 'Activate Scenario'}</span>
                  <Play className="h-3 w-3" />
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Fault Log Table */}
      <Card
        title="Detected Fault Records"
        subtitle="Comprehensive log of rule-based fault triggers and safety evaluations"
      >
        {faults.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-gray-500 text-xs font-mono gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            No abnormal faults logged. All operations within threshold limits.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-gray-400 border-b border-industrial-800 uppercase">
                <tr>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Fault Name</th>
                  <th className="pb-3">Severity</th>
                  <th className="pb-3">Sensor</th>
                  <th className="pb-3">Value</th>
                  <th className="pb-3">Threshold</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-800/60 text-gray-300">
                {faults.map((f, i) => (
                  <tr key={f.id || i} className="hover:bg-industrial-850/50">
                    <td className="py-3 text-gray-400 whitespace-nowrap">
                      {new Date(f.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 font-bold text-white whitespace-nowrap">{f.fault_name}</td>
                    <td className="py-3">
                      <StatusBadge status={f.severity} size="sm" />
                    </td>
                    <td className="py-3 text-cyan-300">{f.sensor}</td>
                    <td className="py-3 text-white font-bold">{f.current_value.toFixed(2)}</td>
                    <td className="py-3 text-gray-400">{f.threshold.toFixed(2)}</td>
                    <td className="py-3 text-gray-400">{Math.round(f.duration_seconds)}s</td>
                    <td className="py-3 text-gray-300 max-w-xs">{f.reason}</td>
                    <td className="py-3 text-emerald-400 max-w-xs">{f.recommended_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
