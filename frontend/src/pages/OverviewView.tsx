import React from 'react';
import {
  SimulationResult,
  ComparisonResult,
  ThrashingAnalysisResponse
} from '../types';
import { MetricCard } from '../components/MetricCard';
import { FrameGrid } from '../components/FrameGrid';
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Brain,
  Flame,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface OverviewViewProps {
  lastSimulation: SimulationResult | null;
  comparisonResult: ComparisonResult | null;
  thrashingResult: ThrashingAnalysisResponse | null;
  onLaunchSample: () => void;
  onNavigateTab: (tab: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  lastSimulation,
  comparisonResult,
  thrashingResult,
  onLaunchSample,
  onNavigateTab
}) => {
  if (!lastSimulation) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center max-w-2xl mx-auto my-12 bg-dark-900 border border-dark-750/80 rounded-2xl shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-700/50 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-950">
          <Cpu className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold font-mono text-white mb-2">
          No Simulation Executed Yet
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed mb-6 font-sans">
          All metrics, graphs, prediction scores, and frame replacement traces in MEMORA are computed
          from live backend execution. Launch a verified reference sequence to populate the dashboard.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onLaunchSample}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Launch Sample Workload
          </button>
          <button
            onClick={() => onNavigateTab('simulator')}
            className="px-5 py-2.5 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 font-mono font-semibold text-xs transition-colors"
          >
            Custom Simulator Setup
          </button>
        </div>
      </div>
    );
  }

  // Real data calculations
  const totalRefs = lastSimulation.total_references;
  const hits = lastSimulation.total_hits;
  const faults = lastSimulation.total_faults;
  const hitRatio = (lastSimulation.hit_ratio * 100).toFixed(1);
  const faultRate = (lastSimulation.fault_rate * 100).toFixed(1);

  // Pie chart data
  const pieData = [
    { name: 'Page Hits', value: hits, color: '#10B981' },
    { name: 'Page Faults', value: faults, color: '#EF4444' }
  ];

  // Timeline curve data
  const chartData = lastSimulation.trace.map(t => ({
    step: `t=${t.step}`,
    faultRate: +(t.fault_rate * 100).toFixed(1),
    hitRatio: +(t.hit_ratio * 100).toFixed(1),
    page: t.page,
    isHit: t.is_hit
  }));

  // Frame occupancy
  const lastStep = lastSimulation.trace[lastSimulation.trace.length - 1];
  const currentFrames = lastStep ? lastStep.frames_after : [];
  const occupiedCount = currentFrames.filter(p => p !== null).length;
  const utilization = ((occupiedCount / lastSimulation.num_frames) * 100).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Top Real Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Page References"
          value={totalRefs}
          subtitle={`Range: ${lastSimulation.num_frames} Physical Frames`}
          icon={Activity}
          trend={`${lastSimulation.algorithm}`}
          trendColor="blue"
          tooltip="Total memory access requests executed in this workload."
        />
        <MetricCard
          title="Page Hit Ratio"
          value={`${hitRatio}%`}
          subtitle={`${hits} successful cache hits`}
          icon={CheckCircle2}
          trend={+hitRatio >= 50 ? 'HEALTHY' : 'SUB-OPTIMAL'}
          trendColor={+hitRatio >= 50 ? 'green' : 'amber'}
          tooltip="Fraction of page requests resolved immediately in physical memory frames."
        />
        <MetricCard
          title="Page Fault Rate"
          value={`${faultRate}%`}
          subtitle={`${faults} compulsory/capacity faults`}
          icon={AlertCircle}
          trend={`${lastSimulation.total_evictions} Evictions`}
          trendColor={+faultRate > 50 ? 'red' : 'green'}
          tooltip="Percentage of memory requests requiring disk page fetch."
        />
        <MetricCard
          title="Memory Utilization"
          value={`${utilization}%`}
          subtitle={`${occupiedCount}/${lastSimulation.num_frames} frames active`}
          icon={Cpu}
          trend={thrashingResult?.overall_status || 'Stable'}
          trendColor={thrashingResult?.overall_status === 'Thrashing Detected' ? 'red' : 'green'}
          tooltip="Physical frame occupancy in memory."
        />
      </div>

      {/* Second Row: Live Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Fault & Hit Rate Curve */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Page Fault Rate Dynamics Over Execution Time
              </h3>
              <p className="text-xs text-slate-400">Step-by-step rolling fault curve vs hit ratio</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Fault Rate (%)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Hit Ratio (%)
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="step" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis stroke="#475569" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#F1F5F9' }}
                />
                <Line
                  type="monotone"
                  dataKey="faultRate"
                  name="Fault Rate (%)"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#EF4444' }}
                />
                <Line
                  type="monotone"
                  dataKey="hitRatio"
                  name="Hit Ratio (%)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ r: 2, fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hit vs Fault Distribution */}
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-1">
              Hit vs Fault Distribution
            </h3>
            <p className="text-xs text-slate-400">Real ratio from {totalRefs} simulated memory accesses</p>
          </div>

          <div className="h-44 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-dark-750 text-xs font-mono">
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
              <span className="text-emerald-400 font-bold">{hits} Hits</span>
              <span className="block text-[11px] text-slate-400">({hitRatio}%)</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/40">
              <span className="text-rose-400 font-bold">{faults} Faults</span>
              <span className="block text-[11px] text-slate-400">({faultRate}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Frame Occupancy Visualizer */}
      <FrameGrid
        frames={currentFrames}
        activePage={lastStep?.page ?? null}
        evictedPage={lastStep?.evicted_page ?? null}
        isHit={lastStep?.is_hit ?? null}
        algorithmName={lastSimulation.algorithm}
      />

      {/* Recommendations & Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('algorithms')}
          className="bg-dark-900 border border-dark-750/70 hover:border-indigo-600 rounded-xl p-4 shadow-lg cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-2 mb-2 text-indigo-400">
            <Layers className="w-5 h-5" />
            <span className="font-mono text-xs uppercase font-bold text-white">Algorithm Laboratory</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Compare FIFO, LRU, Optimal, and Markov on this exact sequence across 2 to 12 frames.
          </p>
          <div className="mt-3 flex items-center text-xs text-indigo-400 font-mono group-hover:translate-x-1 transition-transform">
            <span>Explore Algorithm Lab</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('prediction')}
          className="bg-dark-900 border border-dark-750/70 hover:border-violet-600 rounded-xl p-4 shadow-lg cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-2 mb-2 text-violet-400">
            <Brain className="w-5 h-5" />
            <span className="font-mono text-xs uppercase font-bold text-white">Prediction Models</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Inspect Markov transition probabilities and train the lightweight PyTorch LSTM sequence model.
          </p>
          <div className="mt-3 flex items-center text-xs text-violet-400 font-mono group-hover:translate-x-1 transition-transform">
            <span>View models</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        <div
          onClick={() => onNavigateTab('thrashing')}
          className="bg-dark-900 border border-dark-750/70 hover:border-amber-600 rounded-xl p-4 shadow-lg cursor-pointer transition-all group"
        >
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <Flame className="w-5 h-5" />
            <span className="font-mono text-xs uppercase font-bold text-white">Thrashing Monitor</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Detect pathological paging collapse using Working-Set WSS(t, Δ) and Page-Fault Frequency metrics.
          </p>
          <div className="mt-3 flex items-center text-xs text-amber-400 font-mono group-hover:translate-x-1 transition-transform">
            <span>Open Thrashing Monitor</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
};
