import React, { useState } from 'react';
import {
  ComparisonResult,
  AlgorithmType,
  AlgorithmSummary
} from '../types';
import { compareAlgorithms } from '../services/api';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Play,
  TrendingDown,
  Info,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line
} from 'recharts';

interface AlgorithmLabViewProps {
  initialComparison?: ComparisonResult | null;
  onComparisonComplete?: (result: ComparisonResult) => void;
}

export const AlgorithmLabView: React.FC<AlgorithmLabViewProps> = ({
  initialComparison,
  onComparisonComplete
}) => {
  const [sequenceInput, setSequenceInput] = useState('7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2');
  const [numFrames, setNumFrames] = useState(3);
  const [sweepMax, setSweepMax] = useState(8);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(initialComparison || null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const algorithmsToCompare: AlgorithmType[] = ['fifo', 'lru', 'optimal', 'markov', 'adaptive'];

  const handleRunComparison = async (overrideSeq?: string, overrideFrames?: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const raw = overrideSeq || sequenceInput;
      const fCount = overrideFrames !== undefined ? overrideFrames : numFrames;
      const seq = raw.split(/[\s,]+/).map(x => parseInt(x.trim())).filter(x => !isNaN(x));

      if (seq.length === 0) {
        throw new Error('Please enter a valid comma-separated sequence of page numbers.');
      }

      const res = await compareAlgorithms(seq, fCount, algorithmsToCompare, sweepMax);
      setComparisonResult(res);
      if (onComparisonComplete) onComparisonComplete(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBeladyDemonstration = () => {
    const beladySeq = '1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5';
    setSequenceInput(beladySeq);
    setNumFrames(3);
    setSweepMax(6);
    handleRunComparison(beladySeq, 3);
  };

  // Format bar chart data
  const barData = comparisonResult?.summaries.map(s => ({
    name: s.algorithm.replace(' (THEORETICAL BENCHMARK)', ''),
    hits: s.total_hits,
    faults: s.total_faults,
    faultRate: +(s.fault_rate * 100).toFixed(1),
    hitRatio: +(s.hit_ratio * 100).toFixed(1)
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Config Card */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-indigo-400" />
              Algorithm Laboratory & Performance Benchmark
            </h3>
            <p className="text-xs text-slate-400">
              Run FIFO, LRU, Optimal (offline oracle), Markov, and Adaptive policies under identical reference stream
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleBeladyDemonstration}
              className="px-3.5 py-2 rounded-lg bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-700/50 font-mono font-semibold text-xs transition-all flex items-center gap-1.5"
              title="Load classic sequence demonstrating Belady's Anomaly in FIFO"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Prove Belady's Anomaly
            </button>
            <button
              onClick={() => handleRunComparison()}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isLoading ? 'Running Benchmark...' : 'Run All Algorithms'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Reference Sequence
            </label>
            <input
              type="text"
              value={sequenceInput}
              onChange={(e) => setSequenceInput(e.target.value)}
              className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Physical Frames
              </label>
              <input
                type="number"
                min={2}
                max={12}
                value={numFrames}
                onChange={(e) => setNumFrames(parseInt(e.target.value) || 3)}
                className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Sweep Max
              </label>
              <input
                type="number"
                min={3}
                max={16}
                value={sweepMax}
                onChange={(e) => setSweepMax(parseInt(e.target.value) || 8)}
                className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Belady Anomaly Alert Banner if detected */}
      {comparisonResult?.belady_detected && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs font-mono flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-300 uppercase tracking-wide">
              Empirical Proof of Belady's Anomaly Observed
            </h4>
            <p className="mt-1 leading-relaxed text-amber-100">
              {comparisonResult.belady_detail}
            </p>
            <p className="mt-1.5 text-[11px] text-amber-300/80">
              Explanation: FIFO does not satisfy the inclusion property of stack algorithms. Adding more memory can paradoxically cause the FIFO queue to replace pages that are needed sooner.
            </p>
          </div>
        </div>
      )}

      {/* Results Comparison Table */}
      {comparisonResult && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Comparative Performance Metrics (Frames = {comparisonResult.num_frames})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-dark-850 border-b border-dark-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Algorithm</th>
                  <th className="py-2.5 px-3">References</th>
                  <th className="py-2.5 px-3">Hits</th>
                  <th className="py-2.5 px-3">Faults</th>
                  <th className="py-2.5 px-3">Hit Ratio</th>
                  <th className="py-2.5 px-3">Fault Rate</th>
                  <th className="py-2.5 px-3">Evictions</th>
                  <th className="py-2.5 px-3">OS Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {comparisonResult.summaries.map((s, idx) => {
                  const isOptimal = s.algorithm.includes('OPTIMAL');
                  const isAdaptive = s.algorithm.includes('ADAPTIVE');
                  return (
                    <tr
                      key={idx}
                      className={
                        isOptimal
                          ? 'bg-pink-950/20 text-pink-200 font-semibold'
                          : isAdaptive
                          ? 'bg-indigo-950/20 text-indigo-200 font-semibold'
                          : 'hover:bg-dark-800/40 text-slate-300'
                      }
                    >
                      <td className="py-2.5 px-3 flex items-center gap-1.5">
                        {s.algorithm}
                        {isOptimal && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-900/60 text-pink-300 border border-pink-700/60 uppercase">
                            Oracle
                          </span>
                        )}
                        {isAdaptive && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 uppercase">
                            Adaptive
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{s.total_references}</td>
                      <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.total_hits}</td>
                      <td className="py-2.5 px-3 text-rose-400 font-bold">{s.total_faults}</td>
                      <td className="py-2.5 px-3">{(s.hit_ratio * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3">{(s.fault_rate * 100).toFixed(1)}%</td>
                      <td className="py-2.5 px-3">{s.total_evictions}</td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                        {isOptimal ? 'Theoretical Offline Bound' : isAdaptive ? 'Dynamic Online Feedback' : 'Static Traditional'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Visual Charts: Bar comparison & Frame Sweep */}
      {comparisonResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart Hits vs Faults */}
          <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-2">
              Page Hits vs Faults Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="name" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Bar dataKey="hits" name="Page Hits" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="faults" name="Page Faults" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Frame Sweep Line Curve */}
          {comparisonResult.frame_sweep && (
            <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Fault Curve vs Frame Count Sweep
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">2 to {sweepMax} frames</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonResult.frame_sweep}>
                    <XAxis dataKey="num_frames" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="faults.FIFO" name="FIFO" stroke="#F59E0B" strokeWidth={2} />
                    <Line type="monotone" dataKey="faults.LRU" name="LRU" stroke="#3B82F6" strokeWidth={2} />
                    <Line type="monotone" dataKey="faults.OPTIMAL (THEORETICAL BENCHMARK)" name="Optimal" stroke="#EC4899" strokeWidth={2} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="faults.MARKOV PAGING" name="Markov" stroke="#8B5CF6" strokeWidth={2} />
                    <Line type="monotone" dataKey="faults.ADAPTIVE (LRU)" name="Adaptive" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
