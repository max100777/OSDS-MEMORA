import React, { useState, useEffect } from 'react';
import {
  MultiProcessResponse,
  AllocationPolicy
} from '../types';
import { runMultiProcess } from '../services/api';
import { MetricCard } from '../components/MetricCard';
import {
  Users,
  Cpu,
  Layers,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Scale
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';

export const MultiProcessView: React.FC = () => {
  const [totalFrames, setTotalFrames] = useState(9);
  const [allocationPolicy, setAllocationPolicy] = useState<AllocationPolicy>('adaptive');

  // Pre-configured distinct processes
  const [processes, setProcesses] = useState([
    {
      pid: 'P1',
      name: 'P1: PostgreSQL Engine',
      reference_sequence: [1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 2, 4, 1, 2, 3, 1, 2, 4],
      min_frames: 2
    },
    {
      pid: 'P2',
      name: 'P2: NGINX Web Server',
      reference_sequence: [5, 6, 7, 8, 5, 6, 7, 8, 5, 6, 7, 8, 5, 6, 7, 8, 5, 6],
      min_frames: 2
    },
    {
      pid: 'P3',
      name: 'P3: LLVM Compiler',
      reference_sequence: [0, 1, 2, 3, 4, 5, 6, 7, 0, 1, 2, 3, 4, 5, 6, 7, 0, 1],
      min_frames: 1
    }
  ]);

  const [multiResult, setMultiResult] = useState<MultiProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    handleRunMultiProcess();
  }, [allocationPolicy, totalFrames]);

  const handleRunMultiProcess = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await runMultiProcess(processes, totalFrames, allocationPolicy);
      setMultiResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Multi-process execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Chart data for process frame allocations over time
  const allocationTimeline = multiResult?.allocation_steps.map(s => ({
    step: `t=${s.step}`,
    active: s.active_pid,
    P1_frames: s.allocations['P1'] || 0,
    P2_frames: s.allocations['P2'] || 0,
    P3_frames: s.allocations['P3'] || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Top Configuration Bar */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Intelligent Multi-Process Memory Allocation
            </h3>
            <p className="text-xs text-slate-400">
              Interleaved concurrent simulation across independent virtual address spaces with dynamic frame redistribution
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunMultiProcess}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isLoading ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Frame Allocation Policy
            </label>
            <select
              value={allocationPolicy}
              onChange={(e) => setAllocationPolicy(e.target.value as AllocationPolicy)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="adaptive">Adaptive Dynamic (PFF + WSS Balancing)</option>
              <option value="equal">Equal Static Allocation</option>
              <option value="proportional">Proportional to Address Space</option>
              <option value="working_set">Working-Set Proportional</option>
              <option value="pff">Page-Fault-Frequency (PFF) Dynamic</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>Total Physical Frame Budget</span>
              <span className="text-white font-bold">{totalFrames} Frames</span>
            </div>
            <input
              type="range"
              min={6}
              max={18}
              value={totalFrames}
              onChange={(e) => setTotalFrames(parseInt(e.target.value))}
              className="w-full accent-indigo-500 bg-dark-800 h-2 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>6 Frames</span>
              <span>12 Frames</span>
              <span>18 Frames</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-dark-850 border border-dark-750 font-mono text-xs">
            <div>
              <span className="text-slate-400 uppercase text-[10px] block">Global Budget Conservation</span>
              <span className={multiResult?.budget_conserved ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {multiResult?.budget_conserved ? '✓ CONSERVED (Σf_i = TOTAL)' : 'VIOLATION'}
              </span>
            </div>
            <Scale className="w-5 h-5 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Global Multi-Process Performance Metrics */}
      {multiResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Jain's Fairness Index"
            value={multiResult.jains_fairness_index.toFixed(3)}
            subtitle="1.000 = perfectly equitable hit rates"
            icon={Scale}
            trend={multiResult.jains_fairness_index >= 0.85 ? 'EQUITABLE' : 'UNEVEN'}
            trendColor={multiResult.jains_fairness_index >= 0.85 ? 'green' : 'amber'}
            tooltip="Measures fairness of memory service across all competing processes."
          />
          <MetricCard
            title="Global Page Fault Rate"
            value={`${(multiResult.global_fault_rate * 100).toFixed(1)}%`}
            subtitle={`${multiResult.total_faults} total faults across procs`}
            icon={AlertTriangle}
            trendColor={multiResult.global_fault_rate > 0.4 ? 'red' : 'green'}
          />
          <MetricCard
            title="Active Simulated Tasks"
            value={`${multiResult.process_metrics.length} Processes`}
            subtitle="Concurrent round-robin dispatch"
            icon={Users}
            trendColor="blue"
          />
          <MetricCard
            title="Total Physical Memory"
            value={`${totalFrames} Frames`}
            subtitle="Strict global cap enforced"
            icon={Cpu}
            trend="100% UTILIZED"
            trendColor="green"
          />
        </div>
      )}

      {/* Per-Process Metrics Table */}
      {multiResult && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Per-Process Partition Metrics & Memory Pressure
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead className="bg-dark-850 border-b border-dark-700 text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Process ID</th>
                  <th className="py-2.5 px-3">Task Name</th>
                  <th className="py-2.5 px-3">Frames Allocated</th>
                  <th className="py-2.5 px-3">Working Set Size</th>
                  <th className="py-2.5 px-3">Hits</th>
                  <th className="py-2.5 px-3">Faults</th>
                  <th className="py-2.5 px-3">Hit Ratio</th>
                  <th className="py-2.5 px-3">Pressure State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {multiResult.process_metrics.map(proc => (
                  <tr key={proc.pid} className="hover:bg-dark-850/60">
                    <td className="py-2.5 px-3 font-bold text-white">{proc.pid}</td>
                    <td className="py-2.5 px-3 text-slate-300">{proc.name}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-bold">
                        {proc.allocated_frames} Frames
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">{proc.working_set_size} Pages</td>
                    <td className="py-2.5 px-3 text-emerald-400">{proc.hits}</td>
                    <td className="py-2.5 px-3 text-rose-400">{proc.faults}</td>
                    <td className="py-2.5 px-3 font-bold">{(proc.hit_ratio * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          proc.memory_pressure === 'Thrashing'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : proc.memory_pressure === 'Elevated'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {proc.memory_pressure}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Frame Allocation Dynamics Chart */}
      {multiResult && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Dynamic Frame Reallocation Over Interleaved Steps
              </h3>
              <p className="text-xs text-slate-400">
                Demonstrates dynamic transfer of physical frames from low-pressure to high-pressure processes
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                P1 PostgreSQL
              </span>
              <span className="flex items-center gap-1.5 text-violet-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
                P2 NGINX
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                P3 LLVM
              </span>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={allocationTimeline}>
                <XAxis dataKey="step" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Area type="stepAfter" dataKey="P1_frames" name="P1 Frames" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
                <Area type="stepAfter" dataKey="P2_frames" name="P2 Frames" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                <Area type="stepAfter" dataKey="P3_frames" name="P3 Frames" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
