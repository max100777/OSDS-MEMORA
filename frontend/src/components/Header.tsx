import React from 'react';
import { RotateCcw, Play, BookOpen } from 'lucide-react';

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
    <header className="h-16 bg-dark-900 border-b border-dark-750 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
      <div>
        <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          {title}
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Viva Defence Guide Button */}
        <button
          onClick={onOpenVivaGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-dark-700 text-slate-300 hover:bg-dark-800 transition-colors font-medium"
          title="Open OSDS Viva & Project Defense Cheat Sheet"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Reference</span>
        </button>

        {/* Quick Sample Workload Button */}
        <button
          onClick={onQuickSample}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-slate-200 hover:bg-white text-slate-950 font-semibold transition-colors disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run sample</span>
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
