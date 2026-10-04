import React, { useState } from 'react';
import { Wifi, WifiOff, Server, AlertTriangle, Sun, Moon, Maximize, Minimize } from 'lucide-react';
import { DeviceStatus, SystemSettings } from '../types';
import { StatusBadge } from './StatusBadge';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  deviceStatus: DeviceStatus | null;
  settings: SystemSettings | null;
  isWsConnected: boolean;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  deviceStatus,
  settings,
  isWsConnected,
  onRefresh
}) => {
  const { theme, toggleTheme } = useTheme();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSimulation = settings?.system_mode === 'SIMULATION';
  const isStale = deviceStatus?.is_stale ?? false;
  const esp32Connected = deviceStatus?.esp32_connected ?? false;
  const secondsAgo = deviceStatus?.seconds_since_last_update;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const toggleMode = async () => {
    if (!settings) return;
    const newMode = isSimulation ? 'HARDWARE' : 'SIMULATION';
    try {
      await api.updateSettings({
        ...settings,
        system_mode: newMode
      });
      onRefresh();
    } catch (e) {
      console.error('Failed to toggle system mode:', e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-industrial-950/95 backdrop-blur-md border-b border-industrial-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="MotorGuard Logo"
          className="h-10 w-10 object-contain rounded-lg drop-shadow-[0_2px_8px_rgba(6,182,212,0.3)]"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white font-mono">MotorGuard</h1>
          </div>
          <p className="text-xs text-gray-400 font-sans">
            IoT DC Motor Condition Monitoring & Predictive Maintenance
          </p>
        </div>
      </div>

      {/* Center: Mode Pill */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Mode Switcher */}
        <button
          onClick={toggleMode}
          title="Click to toggle between Hardware and Simulation mode"
          className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono font-semibold transition-all shadow-sm ${
            isSimulation
              ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40'
              : 'bg-cyan-950/40 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/40'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isSimulation ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400 animate-pulse'}`} />
          <span>{isSimulation ? 'SIMULATION MODE — DEMO DATA' : 'HARDWARE MODE — REAL DATA'}</span>
          <span className="text-[10px] underline text-gray-400 ml-1">Switch</span>
        </button>
      </div>

      {/* Right: Connectivity Status */}
      <div className="flex items-center gap-3 text-xs font-mono">
        {/* Stale Data Warning */}
        {isStale && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-950/80 text-rose-300 border border-rose-600/50 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            <span>STALE DATA</span>
          </div>
        )}

        {/* ESP32 Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-industrial-900 border border-industrial-800">
          {esp32Connected ? (
            <Wifi className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-rose-400" />
          )}
          <span className="text-gray-400">ESP32:</span>
          <span className={esp32Connected ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
            {esp32Connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Backend & WS */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-industrial-900 border border-industrial-800">
          <Server className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-gray-400">BACKEND:</span>
          <span className="text-cyan-400 font-semibold">ONLINE</span>
          <span className={`h-1.5 w-1.5 rounded-full ${isWsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} title={isWsConnected ? 'WebSocket Live' : 'Polling'} />
        </div>

        {/* Heartbeat seconds */}
        {secondsAgo !== undefined && secondsAgo !== null && (
          <div className="text-[11px] text-gray-400 hidden xl:block">
            {secondsAgo < 2 ? 'Live' : `${Math.round(secondsAgo)}s ago`}
          </div>
        )}

        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-gray-300 hover:text-cyan-400 hover:border-cyan-500/50 transition-all shadow-sm group ml-1"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-400 group-hover:rotate-45 transition-transform duration-200" />
              <span className="hidden sm:inline font-mono text-[11px]">Light</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-cyan-500 group-hover:-rotate-12 transition-transform duration-200" />
              <span className="hidden sm:inline font-mono text-[11px]">Dark</span>
            </>
          )}
        </button>

        {/* Fullscreen Kiosk Mode Button */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Kiosk Mode'}
          className="p-1.5 rounded-lg bg-industrial-900 border border-industrial-800 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all shadow-sm"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
