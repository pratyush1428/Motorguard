import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { TelemetryReading, SensorStats } from '../types';
import { useTheme } from '../context/ThemeContext';

interface SensorChartProps {
  title: string;
  field: 'temperature' | 'current' | 'vibration';
  unit: string;
  data: TelemetryReading[];
  warningThreshold: number;
  criticalThreshold: number;
  color: string;
  stats?: SensorStats;
  trend?: string;
  rateOfChange?: number;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  title,
  field,
  unit,
  data,
  warningThreshold,
  criticalThreshold,
  color,
  stats,
  trend = 'STABLE',
  rateOfChange = 0.0
}) => {
  // Compute rolling moving average for each point
  const formattedData = data.map((d, index, arr) => {
    const windowSlice = arr.slice(Math.max(0, index - 5), index + 1);
    const sum = windowSlice.reduce((acc, curr) => acc + (curr[field] || 0), 0);
    const movingAvg = windowSlice.length > 0 ? sum / windowSlice.length : d[field];

    const timeStr = d.timestamp
      ? new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : `${index}`;

    return {
      time: timeStr,
      value: d[field],
      movingAverage: Number(movingAvg.toFixed(2)),
      isWarning: d[field] >= warningThreshold && d[field] < criticalThreshold,
      isCritical: d[field] >= criticalThreshold
    };
  });

  const latestVal = data.length > 0 ? data[data.length - 1][field] : 0;
  const isCurrentlyCritical = latestVal >= criticalThreshold;
  const isCurrentlyWarning = latestVal >= warningThreshold && !isCurrentlyCritical;

  // Trend icon and direction
  let TrendIcon = Minus;
  let trendColor = 'text-gray-400 bg-industrial-800 border-industrial-700';
  if (trend === 'INCREASING') {
    TrendIcon = TrendingUp;
    trendColor = field === 'current' || field === 'vibration' || field === 'temperature'
      ? 'text-rose-400 bg-rose-950/40 border-rose-600/40'
      : 'text-emerald-400 bg-emerald-950/40 border-emerald-600/40';
  } else if (trend === 'DECREASING') {
    TrendIcon = TrendingDown;
    trendColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-600/40';
  }

  // Min / Max domain calculation with breathing room
  const values = data.map(d => d[field] || 0);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values, criticalThreshold * 1.1) : criticalThreshold * 1.2;
  const yDomainMin = Math.max(0, Math.floor(minVal * 0.8));
  const yDomainMax = Math.ceil(maxVal * 1.05);

  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#161f30' : '#e2e8f0';
  const axisColor = isDark ? '#48618e' : '#64748b';
  const tooltipBg = isDark ? '#0b0f17' : '#ffffff';
  const tooltipBorder = isDark ? '#222f48' : '#cbd5e1';
  const tooltipShadow = isDark ? '0 4px 20px rgba(0,0,0,0.8)' : '0 4px 16px rgba(0,0,0,0.1)';

  return (
    <div className={`rounded-xl border bg-industrial-900/90 p-5 shadow-card-dark transition-all ${
      isCurrentlyCritical 
        ? 'border-rose-500/60 shadow-glow-rose/30' 
        : isCurrentlyWarning 
        ? 'border-amber-500/50 shadow-glow-amber/20' 
        : 'border-industrial-700/60'
    }`}>
      {/* Chart Header & High-Level Intelligence KPI */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-industrial-800">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-gray-200">{title}</h3>
            {isCurrentlyCritical && (
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500 animate-pulse">
                <AlertCircle className="h-3 w-3" /> CRITICAL
              </span>
            )}
            {isCurrentlyWarning && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500">
                WARNING
              </span>
            )}
          </div>
          <div className="text-2xl font-mono font-bold text-white mt-1">
            {latestVal.toFixed(field === 'vibration' ? 3 : (field === 'current' ? 2 : 1))}
            <span className="text-xs text-gray-400 ml-1.5 font-sans font-normal">{unit}</span>
          </div>
        </div>

        {/* Statistical Metrics: Mean, Max, Trend, Rate of Change */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="px-2.5 py-1 rounded bg-industrial-950 border border-industrial-800 text-gray-300">
            <span className="text-gray-400">Mean: </span>
            <span className="text-cyan-300 font-semibold">{stats ? stats.mean.toFixed(2) : '--'}{unit}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-industrial-950 border border-industrial-800 text-gray-300">
            <span className="text-gray-400">Max: </span>
            <span className="text-amber-300 font-semibold">{stats ? stats.max.toFixed(2) : '--'}{unit}</span>
          </div>
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded border font-semibold ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{trend}</span>
          </div>
          <div className="px-2.5 py-1 rounded bg-industrial-950 border border-industrial-800 text-gray-300">
            <span className="text-gray-400">Rate: </span>
            <span className={rateOfChange > 0 ? 'text-rose-400' : 'text-emerald-400'}>
              {rateOfChange > 0 ? `+${rateOfChange.toFixed(2)}` : rateOfChange.toFixed(2)}{unit}/min
            </span>
          </div>
        </div>
      </div>

      {/* Chart Legend */}
      <div className="flex items-center gap-4 text-[11px] font-mono text-gray-400 my-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: color }} />
          <span>Raw Sensor</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-cyan-400" />
          <span>Moving Average</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-b border-dashed border-amber-400" />
          <span>Warn ({warningThreshold}{unit})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-b border-dashed border-rose-500" />
          <span>Crit ({criticalThreshold}{unit})</span>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-56 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis
              dataKey="time"
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yDomainMin, yDomainMax]}
              stroke={axisColor}
              fontSize={10}
              tickLine={false}
              tickFormatter={(v) => `${v}${unit}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                borderColor: tooltipBorder,
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxShadow: tooltipShadow,
                color: isDark ? '#f1f5f9' : '#0f172a'
              }}
              formatter={(val: any, name?: any) => [
                `${Number(val).toFixed(field === 'vibration' ? 3 : 2)} ${unit}`,
                name === 'value' ? 'Raw Sensor' : 'Moving Avg'
              ]}
              labelFormatter={(label) => `Time: ${label}`}
            />

            {/* Threshold Reference Lines */}
            <ReferenceLine
              y={warningThreshold}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: `Warn ${warningThreshold}${unit}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              y={criticalThreshold}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              label={{ value: `Crit ${criticalThreshold}${unit}`, fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }}
            />

            {/* Raw sensor curve */}
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Moving average curve */}
            <Line
              type="monotone"
              dataKey="movingAverage"
              stroke="#22d3ee"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
