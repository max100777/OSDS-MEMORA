import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendColor?: 'green' | 'red' | 'amber' | 'blue';
  tooltip?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendColor = 'blue',
  tooltip
}) => {
  const getTrendColor = () => {
    switch (trendColor) {
      case 'green': return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50';
      case 'red': return 'text-rose-400 bg-rose-950/60 border-rose-800/50';
      case 'amber': return 'text-amber-400 bg-amber-950/60 border-amber-800/50';
      default: return 'text-indigo-400 bg-indigo-950/60 border-indigo-800/50';
    }
  };

  return (
    <div
      className="bg-dark-900 border border-dark-750 rounded-lg p-4 relative group"
      title={tooltip}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-semibold font-mono tracking-tight text-slate-100">{value}</span>
            {trend && (
              <span className={`text-xs px-2 py-0.5 rounded-full border font-mono ${getTrendColor()}`}>
                {trend}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 font-mono">{subtitle}</p>
          )}
        </div>
        <div className="p-2 bg-dark-850 border border-dark-750 rounded-md text-slate-500">
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
