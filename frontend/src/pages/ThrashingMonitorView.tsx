import React, { useState, useEffect } from 'react';
import { ThrashingAnalysisResponse, AlgorithmType } from '../types';
import { analyzeThrashing, generateWorkload } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

interface ThrashingMonitorViewProps {
  initialResult?: ThrashingAnalysisResponse | null;
  onAnalysisComplete?: (res: ThrashingAnalysisResponse) => void;
}

export const ThrashingMonitorView: React.FC<ThrashingMonitorViewProps> = ({
  initialResult,
  onAnalysisComplete
}) => {
  const [sequenceInput, setSequenceInput] = useState('0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5');
  const [numFrames, setNumFrames] = useState(3);
  const [windowSize, setWindowSize] = useState(8);
  const [highThreshold, setHighThreshold] = useState(0.6);
  const [critThreshold, setCritThreshold] = useState(0.75);

  const [analysisResult, setAnalysisResult] = useState<ThrashingAnalysisResponse | null>(initialResult || null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunAnalysis = async (customSeq?: string, customFrames?: number) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const raw = customSeq || sequenceInput;
      const fCount = customFrames !== undefined ? customFrames : numFrames;
      const seq = raw.split(/[\s,]+/).map(x => parseInt(x.trim())).filter(x => !isNaN(x));

      if (seq.length === 0) throw new Error('Please enter valid page numbers.');

      const res = await analyzeThrashing(seq, fCount, 'lru', windowSize, highThreshold, critThreshold);
      setAnalysisResult(res);
      if (onAnalysisComplete) onAnalysisComplete(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Thrashing analysis failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadThrashingWorkload = async () => {
    // 8 distinct pages with only 2 frames = guaranteed thrashing
    const gen = await generateWorkload('thrashing', 35, 8);
    const seqStr = gen.sequence.join(', ');
    setSequenceInput(seqStr);
    setNumFrames(2);
    handleRunAnalysis(seqStr, 2);
  };

  const handleLoadHealthyWorkload = async () => {
    // 8 distinct pages with 6 frames and strong 80/20 locality = healthy
    const gen = await generateWorkload('locality', 35, 8, 0.85);
    const seqStr = gen.sequence.join(', ');
    setSequenceInput(seqStr);
    setNumFrames(6);
    handleRunAnalysis(seqStr, 6);
  };

  const timelineChartData = analysisResult?.timeline.map(t => ({
    step: `t=${t.step}`,
    rollingFaultRate: +(t.rolling_fault_rate * 100).toFixed(1),
    wss: t.working_set_size,
    frames: t.allocated_frames,
    isHit: t.is_hit
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Controller */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Working-Set Model & Thrashing Prevention Monitor
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates Working-Set Size WSS(t, Δ) against physical frame capacity to prevent throughput collapse
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadHealthyWorkload}
              className="px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-mono text-xs hover:bg-emerald-900/40 transition-colors"
            >
              Preset: Stable Workload
            </button>
            <button
              onClick={handleLoadThrashingWorkload}
              className="px-3 py-1.5 rounded-lg bg-rose-950/40 text-rose-400 border border-rose-800/40 font-mono text-xs hover:bg-rose-900/40 transition-colors"
            >
              Preset: Thrashing Workload
            </button>
            <button
              onClick={() => handleRunAnalysis()}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-mono font-semibold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isLoading ? 'Analyzing...' : 'Analyze Pressure'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Reference Sequence
            </label>
            <input
              type="text"
              value={sequenceInput}
              onChange={(e) => setSequenceInput(e.target.value)}
              className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Allocated Frames: {numFrames}
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={numFrames}
              onChange={(e) => setNumFrames(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-dark-800 h-2 rounded cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Working-Set Window Δ: {windowSize} refs
            </label>
            <input
              type="range"
              min={4}
              max={20}
              value={windowSize}
              onChange={(e) => setWindowSize(parseInt(e.target.value))}
              className="w-full accent-amber-500 bg-dark-800 h-2 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Thrashing Summary Banner */}
      {analysisResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="System Memory Status"
            value={analysisResult.overall_status}
            subtitle={analysisResult.summary_message}
            icon={ShieldAlert}
            trend={analysisResult.thrashing_steps_count > 0 ? 'CRITICAL' : 'OPTIMAL'}
            trendColor={analysisResult.thrashing_steps_count > 0 ? 'red' : 'green'}
          />
          <MetricCard
            title="Mean Working Set Size"
            value={`${analysisResult.mean_working_set_size} Pages`}
            subtitle={`Against ${numFrames} allocated frames`}
            icon={Cpu}
            trend={analysisResult.mean_working_set_size > numFrames ? 'OVERBUDGET' : 'WITHIN LIMIT'}
            trendColor={analysisResult.mean_working_set_size > numFrames ? 'red' : 'green'}
          />
          <MetricCard
            title="Critical Thrashing Steps"
            value={`${analysisResult.thrashing_steps_count} Steps`}
            subtitle={`${analysisResult.total_alerts} pressure alerts logged`}
            icon={Flame}
            trendColor={analysisResult.thrashing_steps_count > 0 ? 'red' : 'green'}
          />
          <MetricCard
            title="Memory Health Score"
            value={`${analysisResult.memory_health_score}/100`}
            subtitle={`Recommended capacity: ${analysisResult.recommended_frame_count} frames`}
            icon={CheckCircle2}
            trendColor="blue"
          />
        </div>
      )}

      {/* Working Set Size vs Frame Allocation Chart */}
      {analysisResult && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Working-Set Demand WSS(t, Δ) vs Physical Frame Allocation
              </h3>
              <p className="text-xs text-slate-400">
                Whenever Working-Set curve rises above allocated frames line, memory pressure and thrashing spike
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Working Set Demand (pages)
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Physical Frames Limit
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineChartData}>
                <XAxis dataKey="step" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area
                  type="monotone"
                  dataKey="wss"
                  name="Working Set Size WSS"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Area
                  type="stepAfter"
                  dataKey="frames"
                  name="Allocated Frames Limit"
                  stroke="#6366F1"
                  fill="#6366F1"
                  fillOpacity={0.05}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alerts Timeline */}
      {analysisResult && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Pressure Alerts and Recommended Actions
          </h3>
          <div className="overflow-y-auto max-h-64 border border-dark-750 rounded-lg">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-dark-850 sticky top-0 border-b border-dark-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Step</th>
                  <th className="py-2.5 px-3">State</th>
                  <th className="py-2.5 px-3">PFF Rate</th>
                  <th className="py-2.5 px-3">WSS vs Frames</th>
                  <th className="py-2.5 px-3">Diagnostic Alert</th>
                  <th className="py-2.5 px-3">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {analysisResult.timeline
                  .filter(t => t.pressure_state !== 'Normal')
                  .map((t, idx) => (
                    <tr
                      key={idx}
                      className={
                        t.pressure_state === 'Potential Thrashing'
                          ? 'bg-rose-950/20 text-rose-300'
                          : 'bg-amber-950/20 text-amber-300'
                      }
                    >
                      <td className="py-2 px-3">t={t.step}</td>
                      <td className="py-2 px-3 font-bold">{t.pressure_state}</td>
                      <td className="py-2 px-3">{(t.rolling_fault_rate * 100).toFixed(0)}%</td>
                      <td className="py-2 px-3">{t.working_set_size} / {t.allocated_frames}</td>
                      <td className="py-2 px-3 max-w-xs truncate" title={t.alert || ''}>{t.alert || 'Pressure rising'}</td>
                      <td className="py-2 px-3 text-slate-200 max-w-xs truncate" title={t.recommendation || ''}>
                        {t.recommendation || 'Monitor working set'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
