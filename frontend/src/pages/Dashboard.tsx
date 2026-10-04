import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Thermometer,
  Zap,
  Activity,
  ShieldAlert,
  RotateCcw,
  Power,
  ChevronRight,
  Clock,
  Wrench,
  CheckCircle2,
  Volume2,
  VolumeX,
  Hourglass,
  SlidersHorizontal,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { TelemetryReading, DeviceStatus, SystemSettings } from '../types';
import { api } from '../services/api';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface DashboardProps {
  telemetry: TelemetryReading | null;
  deviceStatus: DeviceStatus | null;
  settings: SystemSettings | null;
  recentBuffer?: TelemetryReading[];
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  telemetry,
  deviceStatus,
  settings,
  recentBuffer = [],
  onRefresh
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [alerts, setAlerts] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
  const lastSoundRef = useRef<number>(0);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch recent alarms
  useEffect(() => {
    api.getAlerts(4).then(setAlerts).catch(console.error);
  }, [telemetry?.reading_id]);

  // Telemetry core values
  const healthScore = Math.round(telemetry?.health?.health_score ?? 100);
  const healthStatus = telemetry?.health?.health_status ?? 'Healthy';
  const riskLevel = telemetry?.health?.risk_level ?? 'LOW';
  const riskReasons = telemetry?.health?.risk_reasons ?? ['All parameters operating within safe limits.'];
  const motorStatus = deviceStatus?.motor_status ?? telemetry?.motor_status ?? 'RUNNING';
  const relayStatus = deviceStatus?.relay_status ?? telemetry?.relay_status ?? 'ACTIVE';

  const temp = telemetry?.temperature ?? 34.0;
  const curr = telemetry?.current ?? 0.85;
  const vib = telemetry?.vibration ?? 0.28;

  const tempWarn = settings?.temp_warning ?? 50.0;
  const currWarn = settings?.current_warning ?? 1.80;
  const vibWarn = settings?.vibration_warning ?? 0.85;

  // Estimated Remaining Useful Life (RUL) based on health score
  const estimatedHours = Math.max(120, Math.round((healthScore / 100) * 1500));

  // Audio Beep Alert for Critical Alarm
  useEffect(() => {
    if (!soundEnabled) return;
    const isCritical = motorStatus === 'FAULT' || riskLevel === 'CRITICAL';
    const now = Date.now();
    if (isCritical && now - lastSoundRef.current > 4000) {
      lastSoundRef.current = now;
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {
        // Audio policy ignore
      }
    }
  }, [motorStatus, riskLevel, soundEnabled]);

  // Clean sparkline telemetry data
  const chartData = useMemo(() => {
    if (!recentBuffer || recentBuffer.length === 0) {
      return Array.from({ length: 15 }, (_, i) => ({
        time: `${i}s`,
        temp: 34.0,
        curr: 0.85,
        vib: 0.28
      }));
    }
    return recentBuffer.slice(-20).map((r, i) => ({
      time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' }) : `${i}`,
      temp: Number(r.temperature.toFixed(1)),
      curr: Number(r.current.toFixed(2)),
      vib: Number(r.vibration.toFixed(3))
    }));
  }, [recentBuffer]);

  const handleEStop = async () => {
    try {
      await api.triggerEmergencyStop('Dashboard Manual E-Stop');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetEmergencyStop();
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const chartGridColor = isDark ? '#161f30' : '#e2e8f0';
  const chartAxisColor = isDark ? '#48618e' : '#64748b';
  const chartTooltipBg = isDark ? '#0b0f17' : '#ffffff';
  const chartTooltipBorder = isDark ? '#222f48' : '#cbd5e1';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      {/* FOUR VITAL CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Index Card */}
        <div className={`rounded-2xl border p-5 bg-industrial-900/90 shadow-card-dark transition-all flex flex-col justify-between ${
          healthScore >= 90
            ? 'border-emerald-500/40 shadow-glow-emerald/10'
            : healthScore >= 70
            ? 'border-amber-500/40 shadow-glow-amber/10'
            : 'border-rose-500/50 shadow-glow-rose/20'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800/80">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-300">Health Index</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? 'Alarm Sound: Enabled (Click to Mute)' : 'Alarm Sound: Muted (Click to Enable)'}
                  className="p-1 rounded text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-gray-500" />}
                </button>
                <StatusBadge status={healthStatus} size="sm" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-mono font-extrabold text-white">
                {healthScore}
                <span className="text-xs font-normal text-gray-400 ml-1">/100</span>
              </div>
              <ShieldCheck className={`h-6 w-6 ${healthScore >= 90 ? 'text-emerald-400' : healthScore >= 70 ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>

            {/* Health Bar */}
            <div className="w-full bg-industrial-950 rounded-full h-2 mt-3 overflow-hidden border border-industrial-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  healthScore >= 90 ? 'bg-emerald-500' : healthScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>

          {/* Estimated RUL */}
          <div className="mt-4 pt-2.5 border-t border-industrial-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Hourglass className="h-3 w-3 text-cyan-400" />
              Est. RUL:
            </span>
            <span className="text-cyan-400 font-bold">~{estimatedHours} hrs</span>
          </div>
        </div>

        {/* Temperature Card */}
        <div className="rounded-2xl border border-industrial-800 bg-industrial-900/90 p-5 shadow-card-dark transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800/80">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-300">Temperature</span>
              <Thermometer className={`h-4 w-4 ${temp >= tempWarn ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-mono font-extrabold text-white">
                {temp.toFixed(1)}
                <span className="text-sm font-normal text-gray-400 ml-1">°C</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                temp >= tempWarn ? 'bg-amber-950 text-amber-300 border border-amber-500/50' : 'bg-emerald-950/60 text-emerald-400'
              }`}>
                {temp >= tempWarn ? 'WARM' : 'NORMAL'}
              </span>
            </div>

            {/* Temperature Progress relative to 65C */}
            <div className="w-full bg-industrial-950 rounded-full h-2 mt-3 overflow-hidden border border-industrial-800">
              <div
                className={`h-full rounded-full transition-all ${
                  temp >= tempWarn ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (temp / 65) * 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-industrial-800/80 flex items-center justify-between text-xs font-mono text-gray-400">
            <span>Limit: {tempWarn}°C</span>
            <span className="text-gray-400">DS18B20</span>
          </div>
        </div>

        {/* Current Draw Card */}
        <div className="rounded-2xl border border-industrial-800 bg-industrial-900/90 p-5 shadow-card-dark transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800/80">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-300">Current</span>
              <Zap className={`h-4 w-4 ${curr >= currWarn ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`} />
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-mono font-extrabold text-white">
                {curr.toFixed(2)}
                <span className="text-sm font-normal text-gray-400 ml-1">A</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                curr >= currWarn ? 'bg-amber-950 text-amber-300 border border-amber-500/50' : 'bg-emerald-950/60 text-emerald-400'
              }`}>
                {curr >= currWarn ? 'HEAVY' : 'NORMAL'}
              </span>
            </div>

            {/* Current Load Bar relative to 2.8A */}
            <div className="w-full bg-industrial-950 rounded-full h-2 mt-3 overflow-hidden border border-industrial-800">
              <div
                className={`h-full rounded-full transition-all ${
                  curr >= currWarn ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (curr / 2.8) * 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-industrial-800/80 flex items-center justify-between text-xs font-mono text-gray-400">
            <span>Limit: {currWarn}A</span>
            <span className="text-gray-400">ACS712</span>
          </div>
        </div>

        {/* Vibration Card */}
        <div className="rounded-2xl border border-industrial-800 bg-industrial-900/90 p-5 shadow-card-dark transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-industrial-800/80">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-gray-300">Vibration</span>
              <ShieldAlert className={`h-4 w-4 ${vib >= vibWarn ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <div className="text-3xl font-mono font-extrabold text-white">
                {vib.toFixed(3)}
                <span className="text-sm font-normal text-gray-400 ml-1">g</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                vib >= vibWarn ? 'bg-amber-950 text-amber-300 border border-amber-500/50' : 'bg-emerald-950/60 text-emerald-400'
              }`}>
                {vib >= vibWarn ? 'ELEVATED' : 'SMOOTH'}
              </span>
            </div>

            {/* Vibration Bar relative to 1.6g */}
            <div className="w-full bg-industrial-950 rounded-full h-2 mt-3 overflow-hidden border border-industrial-800">
              <div
                className={`h-full rounded-full transition-all ${
                  vib >= vibWarn ? 'bg-amber-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, (vib / 1.6) * 100))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-2.5 border-t border-industrial-800/80 flex items-center justify-between text-xs font-mono text-gray-400">
            <span>Limit: {vibWarn}g</span>
            <span className="text-gray-400">MPU6050</span>
          </div>
        </div>
      </div>

      {/* 3. SINGLE CLEAN REAL-TIME TELEMETRY CHART */}
      <div className="rounded-2xl border border-industrial-800 bg-industrial-900/90 p-5 shadow-card-dark">
        <div className="flex items-center justify-between pb-3 border-b border-industrial-800/80">
          <div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              Live Telemetry Waveform
            </h3>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Continuous multi-sensor real-time stream
            </p>
          </div>
          <Link
            to="/live"
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>Full Waveform View</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Clean Responsive Chart */}
        <div className="h-56 w-full pt-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
              <XAxis dataKey="time" stroke={chartAxisColor} fontSize={10} tickLine={false} />
              <YAxis stroke={chartAxisColor} fontSize={10} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTooltipBg,
                  borderColor: chartTooltipBorder,
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: isDark ? '#f1f5f9' : '#0f172a'
                }}
              />
              <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="curr" name="Current (A)" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="vib" name="Vibration (g)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-6 pt-3 border-t border-industrial-800/60 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="h-2 w-2 rounded-full bg-cyan-400" /> Temperature (°C)
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Current (A)
          </span>
          <span className="flex items-center gap-1.5 text-gray-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Vibration (g)
          </span>
        </div>
      </div>

      {/* 4. CLEAN 2-COLUMN BOTTOM SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Status Diagnosis & Recommendation */}
        <Card
          title="Condition Diagnosis"
          subtitle="Real-time multi-sensor assessment"
          action={<StatusBadge status={riskLevel} size="sm" />}
        >
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-industrial-950 border border-industrial-800">
              <div className="text-xs font-mono font-bold uppercase text-cyan-400 mb-1">
                Root Cause Analysis
              </div>
              <p className="text-xs text-gray-300 font-sans leading-relaxed">
                {riskReasons[0] || 'All parameters operating within safe limits.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-industrial-950 border border-industrial-800 flex items-start gap-2.5">
              <Wrench className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-mono font-bold uppercase text-emerald-400 mb-0.5">
                  Recommendation
                </div>
                <p className="text-xs text-gray-300 font-sans leading-relaxed">
                  {telemetry?.health?.recommendation || 'Continue routine operational monitoring.'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Alarms */}
        <Card
          title="Recent Events"
          subtitle="System threshold & status log"
          action={
            <Link to="/faults" className="text-xs font-mono text-cyan-400 hover:underline">
              View All →
            </Link>
          }
        >
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-xs font-mono gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Zero active alarms. System operating normally.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alt, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-industrial-950 border border-industrial-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge status={alt.severity} size="sm" />
                    <span className="font-bold text-white">{alt.parameter}</span>
                    <span className="text-gray-400 text-[11px] truncate max-w-[150px]">{alt.reason}</span>
                  </div>
                  <span className="text-cyan-400 font-bold">{alt.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
