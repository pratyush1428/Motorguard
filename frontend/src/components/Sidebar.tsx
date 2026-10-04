import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  LineChart,
  BrainCircuit,
  AlertOctagon,
  Wrench,
  History,
  Cpu,
  Settings,
  Power,
  RotateCcw,
  Zap
} from 'lucide-react';
import { DeviceStatus } from '../types';
import { api } from '../services/api';

interface SidebarProps {
  deviceStatus: DeviceStatus | null;
  onRefresh: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ deviceStatus, onRefresh }) => {
  const isLatched = deviceStatus?.emergency_stop_latched ?? false;
  const relayActive = deviceStatus?.relay_status === 'ACTIVE';

  const handleEmergencyStop = async () => {
    try {
      await api.triggerEmergencyStop('Manual Emergency Stop from Sidebar');
      onRefresh();
    } catch (e) {
      console.error('Failed to trigger emergency stop:', e);
    }
  };

  const handleReset = async () => {
    try {
      await api.resetEmergencyStop();
      onRefresh();
    } catch (e) {
      console.error('Failed to reset safety latch:', e);
    }
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/live', label: 'Live Monitoring', icon: LineChart },
    { to: '/predictive', label: 'Predictive Maint.', icon: BrainCircuit },
    { to: '/faults', label: 'Fault Detection', icon: AlertOctagon },
    { to: '/maintenance', label: 'Maintenance Log', icon: Wrench },
    { to: '/history', label: 'History & Logs', icon: History },
    { to: '/hardware', label: 'Hardware Spec', icon: Cpu },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-industrial-950 border-r border-industrial-800 flex flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px]">
      {/* Navigation links */}
      <nav className="p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
          SYSTEM NAVIGATION
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-industrial-800 text-cyan-400 border border-cyan-500/40 shadow-glow-cyan/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-industrial-900'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Safety & Actuator Controls Panel */}
      <div className="p-4 border-t border-industrial-800/80 bg-industrial-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-gray-400 uppercase flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-cyan-400" />
            Relay Interlock
          </span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
            relayActive 
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/50' 
              : 'bg-rose-950/80 text-rose-400 border-rose-600/50'
          }`}>
            {relayActive ? 'ACTIVE (7.4V ON)' : 'ISOLATED (CUT)'}
          </span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={handleEmergencyStop}
          className={`w-full py-2.5 px-3 rounded-lg font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            isLatched
              ? 'bg-rose-900/60 text-rose-200 border-2 border-rose-500 shadow-glow-rose cursor-not-allowed'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-glow-rose hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          <Power className="h-4 w-4" />
          {isLatched ? 'E-STOP LATCHED' : 'EMERGENCY STOP'}
        </button>

        {/* Reset Interlock Button */}
        <button
          onClick={handleReset}
          className="w-full py-2 px-3 rounded-lg font-mono text-xs text-gray-300 bg-industrial-800 hover:bg-industrial-700 border border-industrial-700 flex items-center justify-center gap-2 transition-all hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
          RESET INTERLOCK
        </button>
      </div>
    </aside>
  );
};
