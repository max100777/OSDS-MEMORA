import React from 'react';
import { Cpu, CheckCircle2, AlertCircle, ArrowRightLeft } from 'lucide-react';

interface FrameGridProps {
  frames: (number | null)[];
  activePage: number | null;
  evictedPage: number | null;
  isHit: boolean | null;
  algorithmName?: string;
}

export const FrameGrid: React.FC<FrameGridProps> = ({
  frames,
  activePage,
  evictedPage,
  isHit,
  algorithmName = 'Paging'
}) => {
  return (
    <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Physical Memory Frames ({frames.length} Slots)
          </h3>
        </div>
        <span className="text-xs px-2.5 py-1 rounded bg-dark-800 border border-dark-700 text-slate-400 font-mono">
          Policy: <span className="text-indigo-300 font-semibold">{algorithmName}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {frames.map((page, idx) => {
          const isCurrentTarget = activePage !== null && page === activePage;
          const wasEvicted = evictedPage !== null && evictedPage === page;

          let borderClass = 'border-dark-700/80 bg-dark-850/80';
          let badgeText = 'Resident';
          let badgeClass = 'text-slate-400 bg-dark-750';

          if (page === null) {
            borderClass = 'border-dashed border-dark-700 bg-dark-950/40 opacity-70';
            badgeText = 'Free Frame';
            badgeClass = 'text-slate-500 bg-dark-850';
          } else if (isCurrentTarget) {
            if (isHit) {
              borderClass = 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-emerald-950/50';
              badgeText = 'PAGE HIT';
              badgeClass = 'text-emerald-300 bg-emerald-900/60 border border-emerald-700/60';
            } else {
              borderClass = 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50 shadow-rose-950/50';
              badgeText = 'LOADED (FAULT)';
              badgeClass = 'text-rose-300 bg-rose-900/60 border border-rose-700/60';
            }
          }

          return (
            <div
              key={idx}
              className={`rounded-lg border p-3 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${borderClass}`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                <span>Frame #{idx}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${badgeClass}`}>
                  {badgeText}
                </span>
              </div>

              <div className="py-2 text-center">
                {page !== null ? (
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-slate-500 font-mono">VIRTUAL PAGE</span>
                    <span className="text-3xl font-extrabold font-mono text-white tracking-wider">
                      {page}
                    </span>
                  </div>
                ) : (
                  <div className="py-3 text-slate-600 font-mono text-xs italic">
                    [ Unallocated ]
                  </div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-dark-750/50 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Status</span>
                <span>{page !== null ? 'Resident' : 'Available'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {evictedPage !== null && (
        <div className="mt-4 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center gap-2 text-xs text-rose-300 font-mono">
          <ArrowRightLeft className="w-4 h-4 text-rose-400" />
          <span>Eviction Notice: Virtual Page <strong className="text-white">#{evictedPage}</strong> was evicted to backstore to fulfill capacity demand.</span>
        </div>
      )}
    </div>
  );
};
