import React from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { TelemetryReading, SystemSettings } from '../types';
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Info,
  Clock,
  Layers,
  Gauge
} from 'lucide-react';

interface PredictiveMaintenanceProps {
  telemetry: TelemetryReading | null;
  settings: SystemSettings | null;
}

export const PredictiveMaintenance: React.FC<PredictiveMaintenanceProps> = ({
  telemetry,
  settings
}) => {
  const health = telemetry?.health;
  const healthScore = health?.health_score ?? 100;
  const riskLevel = health?.risk_level ?? 'LOW';
  const urgency = health?.urgency ?? 'Routine';
  const stats = telemetry?.stats;

  const rateVib = health?.rate_of_change_vib ?? 0.0;
  const rateTemp = health?.rate_of_change_temp ?? 0.0;
  const rateCurr = health?.rate_of_change_current ?? 0.0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Disclaimer / Engineering Honesty Banner */}
      <div className="p-4 rounded-xl bg-industrial-900 border border-cyan-500/30 flex items-start gap-3 shadow-card-dark">
        <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300">
          <span className="font-bold text-cyan-300 font-mono uppercase mr-1">
            Condition Monitoring & Diagnostics:
          </span>
          Estimations are computed using rolling moving averages, rates of change, multi-sensor correlation, and threshold crossing analytics.
        </div>
      </div>

      {/* Top Level Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card title="Motor Health Condition" subtitle="0–100 Weighted Score">
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-4xl font-mono font-bold text-white">
              {healthScore.toFixed(0)}%
            </div>
            <StatusBadge status={health?.health_status ?? 'Healthy'} size="md" />
          </div>
          <div className="w-full bg-industrial-950 rounded-full h-2 mt-4 overflow-hidden border border-industrial-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                healthScore >= 90
                  ? 'bg-emerald-500'
                  : healthScore >= 70
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-mono">
            Category: {healthScore >= 90 ? 'Healthy (90-100)' : healthScore >= 70 ? 'Warning (70-89)' : 'Critical (<70)'}
          </p>
        </Card>

        <Card title="Maintenance Urgency" subtitle="Recommended intervention timeline">
          <div className="flex items-baseline justify-between mt-2">
            <div className={`text-2xl font-mono font-bold ${
              urgency === 'Immediate' ? 'text-rose-400' : urgency === 'Scheduled' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {urgency.toUpperCase()}
            </div>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-xs text-gray-300 mt-3 font-sans">
            {urgency === 'Immediate'
              ? 'Critical distress detected. Halt motor and inspect before restart.'
              : urgency === 'Scheduled'
              ? 'Abnormal drift observed. Schedule inspection during maintenance window.'
              : 'Standard operational status. No immediate intervention required.'}
          </p>
        </Card>

        <Card title="Risk Evaluation" subtitle="Current risk severity">
          <div className="flex items-baseline justify-between mt-2">
            <div className="text-2xl font-mono font-bold text-white">
              {riskLevel}
            </div>
            <StatusBadge status={riskLevel} size="md" />
          </div>
          <p className="text-xs text-gray-400 mt-3 font-mono">
            {health?.anomalies_detected?.length
              ? `Anomalies: ${health.anomalies_detected.join(', ')}`
              : 'No abnormal parameters detected.'}
          </p>
        </Card>
      </div>

      {/* Dynamic Rate of Change & Trend Analysis Matrix */}
      <Card title="Sensor Trend & Rate-Of-Change Analysis" subtitle="Dynamic derivatives over the configured moving average window">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Vibration Trend */}
          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300">VIBRATION TREND</span>
              <StatusBadge status={stats?.trend_vib ?? 'STABLE'} size="sm" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-white">
              {rateVib > 0 ? `+${rateVib.toFixed(3)}` : rateVib.toFixed(3)} g/min
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Historical Mean: {stats?.vibration?.mean ?? 0.28}g
            </p>
          </div>

          {/* Temperature Trend */}
          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-rose-300">TEMPERATURE TREND</span>
              <StatusBadge status={stats?.trend_temp ?? 'STABLE'} size="sm" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-white">
              {rateTemp > 0 ? `+${rateTemp.toFixed(2)}` : rateTemp.toFixed(2)} °C/min
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Historical Mean: {stats?.temperature?.mean ?? 34.0}°C
            </p>
          </div>

          {/* Current Trend */}
          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-300">CURRENT DRAW TREND</span>
              <StatusBadge status={stats?.trend_current ?? 'STABLE'} size="sm" />
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-white">
              {rateCurr > 0 ? `+${rateCurr.toFixed(2)}` : rateCurr.toFixed(2)} A/min
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Historical Mean: {stats?.current?.mean ?? 0.85}A
            </p>
          </div>
        </div>
      </Card>

      {/* Explainable Insights & Actionable Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Diagnostic Observations" subtitle="System synopsis">
          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 text-xs font-sans text-gray-300 leading-relaxed">
            {health?.observation || 'All electromechanical parameters within nominal prototype specifications.'}
          </div>
          <div className="mt-4">
            <h4 className="text-xs font-mono text-cyan-400 font-bold uppercase mb-2">
              WHY DID THE RISK LEVEL CHANGE?
            </h4>
            <div className="space-y-2">
              {(health?.risk_reasons || []).map((reason, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-gray-300 font-sans p-2 rounded bg-industrial-950/60 border border-industrial-800/80">
                  <span className="text-cyan-400 font-bold">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Actionable Maintenance Guidance" subtitle="Targeted mechanical & electrical recommendations">
          <div className="p-4 rounded-lg bg-industrial-950 border border-industrial-800 space-y-3">
            <div className="text-xs font-bold font-mono text-emerald-400 uppercase">
              RECOMMENDED PROCEDURES:
            </div>
            <p className="text-xs text-gray-300 font-sans leading-relaxed">
              {health?.recommendation || 'Continue standard operating protocol. No immediate mechanical or electrical servicing needed.'}
            </p>
          </div>

          <div className="mt-4 space-y-2 text-xs font-mono text-gray-400">
            <div className="p-2.5 rounded bg-industrial-950/60 border border-industrial-800">
              <span className="text-cyan-400 font-bold">1. Mechanical Coupling: </span>
              Verify motor shaft set screw and rubber spider element for looseness or wear.
            </div>
            <div className="p-2.5 rounded bg-industrial-950/60 border border-industrial-800">
              <span className="text-cyan-400 font-bold">2. Thermal Ventilation: </span>
              Ensure motor casing has unrestricted convection; check for dust buildup on cooling fins.
            </div>
            <div className="p-2.5 rounded bg-industrial-950/60 border border-industrial-800">
              <span className="text-cyan-400 font-bold">3. Drive Circuit: </span>
              Verify L298N heat sink temperature and ensure battery pack terminal voltage &gt; 7.0V.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
