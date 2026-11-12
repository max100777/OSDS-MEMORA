import React from 'react';
import { AlertCircle, CheckCircle2, Lightbulb, Zap } from 'lucide-react';
import { SimulationStepEvent } from '../types';

interface StepExplanationProps {
  event: SimulationStepEvent;
  algorithm: string;
}

export const StepExplanation: React.FC<StepExplanationProps> = ({ event, algorithm }) => {
  const prediction = event.prediction_info;
  const statusLabel = event.is_hit ? 'Hit' : event.evicted_page === null ? 'Cold page fault' : 'Capacity page fault';

  return (
    <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Explain This Decision
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Why the virtual memory manager produced this result at reference t={event.step}.
          </p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold ${
          event.is_hit
            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
            : 'bg-rose-950/60 text-rose-300 border border-rose-800'
        }`}>
          {event.is_hit ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="bg-dark-850 border border-dark-750 rounded-lg p-3">
          <span className="text-slate-500 uppercase">Reference</span>
          <strong className="block text-white text-lg mt-1">Page {event.page}</strong>
          <span className="text-slate-400">{event.operation.toUpperCase()} access</span>
        </div>
        <div className="bg-dark-850 border border-dark-750 rounded-lg p-3">
          <span className="text-slate-500 uppercase">Policy</span>
          <strong className="block text-indigo-300 text-lg mt-1">{event.algorithm_used || algorithm}</strong>
          <span className="text-slate-400">Frames before: [{event.frames_before.map(page => page ?? '-').join(', ')}]</span>
        </div>
        <div className="bg-dark-850 border border-dark-750 rounded-lg p-3">
          <span className="text-slate-500 uppercase">Transition</span>
          <strong className="block text-white text-lg mt-1">[{event.frames_after.map(page => page ?? '-').join(', ')}]</strong>
          <span className="text-slate-400">{event.evicted_page === null ? 'No eviction' : `Evicted page ${event.evicted_page}`}</span>
        </div>
      </div>

      <div className="rounded-lg bg-indigo-950/30 border border-indigo-800/50 p-3 text-xs text-indigo-100 leading-relaxed">
        <span className="font-semibold text-indigo-300">OS decision rationale: </span>
        {event.reason}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div><span className="text-slate-500 block">Step cost</span><strong className="text-white">{event.simulated_access_cost.toFixed(1)} units</strong></div>
        <div><span className="text-slate-500 block">Cumulative cost</span><strong className="text-white">{event.cumulative_access_cost.toFixed(1)} units</strong></div>
        <div><span className="text-slate-500 block">Dirty write-back</span><strong className={event.dirty_writeback ? 'text-amber-300' : 'text-slate-300'}>{event.dirty_writeback ? 'Yes' : 'No'}</strong></div>
        <div><span className="text-slate-500 block">Prediction</span><strong className="text-violet-300">{prediction?.predicted_next == null ? 'Unavailable' : `Page ${prediction.predicted_next}`}</strong></div>
      </div>

      {prediction && (
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <Zap className="w-3.5 h-3.5 text-violet-400" />
          {prediction.strategy || 'Prediction feedback'}{prediction.confidence !== undefined ? ` · confidence ${(prediction.confidence * 100).toFixed(1)}%` : ''}
          {prediction.switch_reason ? ` · ${prediction.switch_reason}` : ''}
        </div>
      )}
    </div>
  );
};
