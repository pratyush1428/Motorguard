import React, { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { TelemetryReading, SystemStatistics } from '../types';
import { api } from '../services/api';
import { Download, Filter, RefreshCw, BarChart2 } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<TelemetryReading[]>([]);
  const [statistics, setStatistics] = useState<SystemStatistics | null>(null);
  const [windowFilter, setWindowFilter] = useState<string>('1h');
  const [sensorFilter, setSensorFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const loadData = async () => {
    try {
      setLoading(true);
      const [histData, statsData] = await Promise.all([
        api.getHistory(windowFilter, 500, sensorFilter !== 'all' ? sensorFilter : undefined),
        api.getStatistics()
      ]);
      setHistory(histData);
      setStatistics(statsData);
      setPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [windowFilter, sensorFilter]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(history.length / pageSize));
  const displayedRecords = history.slice((page - 1) * pageSize, page * pageSize);

  const handleDownloadCsv = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-industrial-800">
        <div>
          <h2 className="text-xl font-bold font-mono text-white flex items-center gap-2">
            TELEMETRY AUDIT & HISTORICAL ARCHIVE
          </h2>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Query logged time-series readings, operating run-time analytics, and CSV data export
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold shadow-glow-emerald/30 transition-all"
          >
            <Download className="h-4 w-4" />
            Download Full CSV
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-industrial-900 border border-industrial-800 text-gray-400 hover:text-white hover:bg-industrial-800 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="p-3.5 rounded-lg bg-industrial-900 border border-industrial-800">
            <span className="text-[10px] font-mono text-gray-400 uppercase">AVG HEALTH SCORE</span>
            <div className="text-xl font-mono font-bold text-cyan-300 mt-1">{statistics.avg_health_score}%</div>
          </div>
          <div className="p-3.5 rounded-lg bg-industrial-900 border border-industrial-800">
            <span className="text-[10px] font-mono text-gray-400 uppercase">AVG / MAX TEMP</span>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {statistics.avg_temp}° / <span className="text-rose-400">{statistics.max_temp}°C</span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-industrial-900 border border-industrial-800">
            <span className="text-[10px] font-mono text-gray-400 uppercase">AVG / MAX CURRENT</span>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {statistics.avg_current}A / <span className="text-amber-400">{statistics.max_current}A</span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-industrial-900 border border-industrial-800">
            <span className="text-[10px] font-mono text-gray-400 uppercase">AVG / MAX VIB</span>
            <div className="text-xl font-mono font-bold text-white mt-1">
              {statistics.avg_vibration}g / <span className="text-cyan-400">{statistics.max_vibration}g</span>
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-industrial-900 border border-industrial-800">
            <span className="text-[10px] font-mono text-gray-400 uppercase">CRITICAL FAULTS</span>
            <div className="text-xl font-mono font-bold text-rose-400 mt-1">{statistics.fault_count}</div>
          </div>
          <div className="p-3.5 rounded-lg bg-industrial-900 border border-industrial-800">
            <span className="text-[10px] font-mono text-gray-400 uppercase">OPERATING DURATION</span>
            <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
              {statistics.operating_duration_minutes} min
            </div>
          </div>
        </div>
      )}

      {/* Query Filters */}
      <div className="p-4 rounded-xl bg-industrial-900 border border-industrial-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-mono text-gray-300 font-bold uppercase">Query Filters:</span>
          
          <select
            value={windowFilter}
            onChange={(e) => setWindowFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-700 rounded px-3 py-1.5 text-xs font-mono text-white"
          >
            <option value="5m">Last 5 Minutes</option>
            <option value="30m">Last 30 Minutes</option>
            <option value="1h">Last 1 Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">Full Database History</option>
          </select>

          <select
            value={sensorFilter}
            onChange={(e) => setSensorFilter(e.target.value)}
            className="bg-industrial-950 border border-industrial-700 rounded px-3 py-1.5 text-xs font-mono text-white"
          >
            <option value="all">All Parameters</option>
            <option value="temperature">Temperature Focus</option>
            <option value="current">Current Draw Focus</option>
            <option value="vibration">Vibration Focus</option>
          </select>
        </div>

        <div className="text-xs font-mono text-gray-400">
          Showing {history.length} records retrieved
        </div>
      </div>

      {/* History Data Table */}
      <Card title="Recorded Telemetry Logs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-gray-400 border-b border-industrial-800 uppercase">
              <tr>
                <th className="pb-3">Timestamp</th>
                <th className="pb-3">Motor State</th>
                <th className="pb-3">Relay</th>
                <th className="pb-3">Temp (°C)</th>
                <th className="pb-3">Current (A)</th>
                <th className="pb-3">Vib (g)</th>
                <th className="pb-3">Health</th>
                <th className="pb-3">Risk Level</th>
                <th className="pb-3">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-industrial-800/60 text-gray-300">
              {displayedRecords.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-industrial-850/50">
                  <td className="py-2.5 text-gray-400 whitespace-nowrap">
                    {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2.5"><StatusBadge status={r.motor_status} size="sm" /></td>
                  <td className="py-2.5"><StatusBadge status={r.relay_status} size="sm" /></td>
                  <td className="py-2.5 text-white font-bold">{r.temperature.toFixed(1)}°C</td>
                  <td className="py-2.5 text-white font-bold">{r.current.toFixed(2)}A</td>
                  <td className="py-2.5 text-cyan-300">{r.vibration.toFixed(3)}g</td>
                  <td className="py-2.5 font-bold text-white">{r.health_score ? `${r.health_score}%` : '--'}</td>
                  <td className="py-2.5">{r.risk_level ? <StatusBadge status={r.risk_level} size="sm" /> : '--'}</td>
                  <td className="py-2.5 text-gray-400">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-industrial-950 border border-industrial-800">
                      {r.is_simulated ? 'SIM' : 'REAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-industrial-800 text-xs font-mono">
          <span className="text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded bg-industrial-950 border border-industrial-800 text-gray-300 disabled:opacity-40 hover:bg-industrial-800"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded bg-industrial-950 border border-industrial-800 text-gray-300 disabled:opacity-40 hover:bg-industrial-800"
            >
              Next
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
