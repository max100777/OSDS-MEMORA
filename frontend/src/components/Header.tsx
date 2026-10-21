import React from 'react';
import { RotateCcw, Play, HelpCircle, Activity, Sparkles, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onReset: () => void;
  onQuickSample: () => void;
  onOpenVivaGuide: () => void;
  isSimulating?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onReset,
  onQuickSample,
  onOpenVivaGuide,
  isSimulating = false
}) => {
  return (
    <header className="h-16 bg-dark-900/90 backdrop-blur border-b border-dark-750/70 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div>
        <h2 className="text-base font-bold text-white tracking-wide font-mono flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-400 font-sans">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Viva Defence Guide Button */}
        <button
          onClick={onOpenVivaGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-950/40 border border-amber-700/50 text-amber-300 hover:bg-amber-900/50 transition-colors font-medium font-mono"
          title="Open OSDS Viva & Project Defense Cheat Sheet"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Viva Defense Guide</span>
        </button>

        {/* Quick Sample Workload Button */}
        <button
          onClick={onQuickSample}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 transition-all font-mono disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Launch Sample</span>
        </button>

        {/* Global Reset */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-750 text-slate-300 hover:text-white transition-colors"
          title="Reset Simulation State"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
