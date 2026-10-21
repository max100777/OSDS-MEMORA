import React, { useState } from 'react';
import { SimulationStepEvent } from '../types';
import { CheckCircle2, AlertCircle, ArrowRight, Filter, Search } from 'lucide-react';

interface EventLogProps {
  trace: SimulationStepEvent[];
  activeStep?: number;
  onSelectStep?: (step: number) => void;
}

export const EventLog: React.FC<EventLogProps> = ({ trace, activeStep, onSelectStep }) => {
  const [filter, setFilter] = useState<'all' | 'hits' | 'faults' | 'evictions'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTrace = trace.filter(event => {
    if (filter === 'hits' && !event.is_hit) return false;
    if (filter === 'faults' && event.is_hit) return false;
    if (filter === 'evictions' && event.evicted_page === null) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        event.page.toString().includes(q) ||
        event.reason.toLowerCase().includes(q) ||
        event.step.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            Memory Reference Event Log ({trace.length} Events)
          </h3>
          <p className="text-xs text-slate-400">Step-by-step OS trace of frame allocations and page replacements</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex bg-dark-800 border border-dark-700 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded ${filter === 'all' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('hits')}
              className={`px-2.5 py-1 rounded ${filter === 'hits' ? 'bg-emerald-700 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Hits
            </button>
            <button
              onClick={() => setFilter('faults')}
              className={`px-2.5 py-1 rounded ${filter === 'faults' ? 'bg-rose-700 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Faults
            </button>
            <button
              onClick={() => setFilter('evictions')}
              className={`px-2.5 py-1 rounded ${filter === 'evictions' ? 'bg-amber-700 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Evictions
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-dark-800 border border-dark-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 w-28 sm:w-36"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[380px] border border-dark-750 rounded-lg">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead className="bg-dark-850 sticky top-0 border-b border-dark-700 text-slate-400 z-10">
            <tr>
              <th className="py-2.5 px-3">Step</th>
              <th className="py-2.5 px-3">Ref Page</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Frames State</th>
              <th className="py-2.5 px-3">Evicted</th>
              <th className="py-2.5 px-3">OS Decision Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/80">
            {filteredTrace.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  No events match the selected criteria.
                </td>
              </tr>
            ) : (
              filteredTrace.map((event) => {
                const isSelected = activeStep === event.step;
                return (
                  <tr
                    key={event.step}
                    onClick={() => onSelectStep && onSelectStep(event.step)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/60 border-l-2 border-indigo-400'
                        : event.is_hit
                        ? 'hover:bg-emerald-950/15'
                        : 'hover:bg-rose-950/15'
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-400">t={event.step}</td>
                    <td className="py-2 px-3">
                      <span className="font-bold text-white px-2 py-0.5 rounded bg-dark-800 border border-dark-700">
                        {event.page}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {event.is_hit ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded font-semibold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> HIT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-950/50 border border-rose-800/60 px-2 py-0.5 rounded font-semibold text-[11px]">
                          <AlertCircle className="w-3 h-3" /> FAULT
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300">
                      [{event.frames_after.map(p => p !== null ? p : '-').join(', ')}]
                    </td>
                    <td className="py-2 px-3">
                      {event.evicted_page !== null ? (
                        <span className="text-rose-300 bg-rose-950/60 border border-rose-800/50 px-1.5 py-0.5 rounded">
                          Page {event.evicted_page}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-300 max-w-md truncate" title={event.reason}>
                      {event.reason}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
