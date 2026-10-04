import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'none';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  glow = 'none'
}) => {
  const glowClasses = {
    cyan: 'border-cyan-500/30 shadow-glow-cyan',
    emerald: 'border-emerald-500/30 shadow-glow-emerald',
    amber: 'border-amber-500/30 shadow-glow-amber',
    rose: 'border-rose-500/35 shadow-glow-rose',
    none: 'border-industrial-700/60'
  };

  return (
    <div className={`bg-industrial-900/90 backdrop-blur-md rounded-xl border p-5 transition-all duration-200 shadow-card-dark ${glowClasses[glow]} ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-industrial-800/80">
          <div>
            {title && <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-200 font-mono flex items-center gap-2">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
