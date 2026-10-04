import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toUpperCase();

  let bgClass = 'bg-industrial-800 text-gray-300 border-gray-700';
  let dotClass = 'bg-gray-400';

  if (s === 'RUNNING' || s === 'HEALTHY' || s === 'ACTIVE' || s === 'CONNECTED' || s === 'ONLINE' || s === 'NORMAL' || s === 'LOW' || s === 'RESOLVED') {
    bgClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-glow-emerald/20';
    dotClass = 'bg-emerald-400 animate-pulse';
  } else if (s === 'WARNING' || s === 'MODERATE' || s === 'IN_PROGRESS' || s === 'MEDIUM') {
    bgClass = 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-glow-amber/20';
    dotClass = 'bg-amber-400 animate-pulse';
  } else if (s === 'CRITICAL' || s === 'FAULT' || s === 'INACTIVE' || s === 'DISCONNECTED' || s === 'OFFLINE' || s === 'OFF' || s === 'HIGH' || s === 'URGENT') {
    bgClass = 'bg-rose-950/70 text-rose-300 border-rose-500/50 shadow-glow-rose/25';
    dotClass = 'bg-rose-500 animate-ping';
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm font-semibold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide uppercase ${sizeClasses[size]} ${bgClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {status}
    </span>
  );
};
