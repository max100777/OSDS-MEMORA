import React, { useState, useEffect, useRef } from 'react';
import {
  SimulationResult,
  AlgorithmType,
  WorkloadType
} from '../types';
import { runSimulation, generateWorkload } from '../services/api';
import { FrameGrid } from '../components/FrameGrid';
import { EventLog } from '../components/EventLog';
import { MetricCard } from '../components/MetricCard';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sliders,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Wand2
} from 'lucide-react';

interface SimulatorViewProps {
  onSimulationComplete: (result: SimulationResult) => void;
  initialResult?: SimulationResult | null;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
  onSimulationComplete,
  initialResult
}) => {
  // Input settings
  const [customSequence, setCustomSequence] = useState('7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2');
  const [numFrames, setNumFrames] = useState(3);
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('lru');
  const [workloadType, setWorkloadType] = useState<WorkloadType>('custom');
  const [workloadLength, setWorkloadLength] = useState(25);
  const [pageRange, setPageRange] = useState(8);

  // Simulation execution state
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(initialResult || null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(600); // ms per step
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  // Execute simulation when user clicks "Run Simulation"
  const handleExecuteSimulation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);
    try {
      let seq: number[] = [];
      if (workloadType === 'custom') {
        const genRes = await generateWorkload('custom', 30, 10, 0.8, customSequence);
        seq = genRes.sequence;
      } else {
        const genRes = await generateWorkload(workloadType, workloadLength, pageRange, 0.8);
        seq = genRes.sequence;
        setCustomSequence(seq.join(', '));
      }

      if (seq.length === 0) {
        throw new Error('Please enter at least one valid page number.');
      }

      const res = await runSimulation(seq, numFrames, algorithm);
      setSimulationResult(res);
      setCurrentStepIndex(0);
      onSimulationComplete(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Simulation execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Stepping playback loop
  useEffect(() => {
    if (isPlaying && simulationResult) {
      timerRef.current = window.setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev >= simulationResult.trace.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, simulationResult, playbackSpeed]);

  const handleStepForward = () => {
    if (!simulationResult) return;
    setIsPlaying(false);
    if (currentStepIndex < simulationResult.trace.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleStepBackward = () => {
    if (!simulationResult) return;
    setIsPlaying(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  };

  // Current active step data
  const currentStep = simulationResult?.trace[currentStepIndex] || null;
  const currentFrames = currentStep ? currentStep.frames_after : Array(numFrames).fill(null);

  return (
    <div className="space-y-6">
      {/* Configuration Controls Bar */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              Workload & Replacement Configuration
            </h3>
            <p className="text-xs text-slate-400">Configure reference sequence, memory frames, and algorithm policy</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecuteSimulation}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Activity className="w-4 h-4" />
              {isLoading ? 'Running Engine...' : 'Run Simulation Trace'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Workload Pattern Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Workload Access Pattern
            </label>
            <select
              value={workloadType}
              onChange={(e) => setWorkloadType(e.target.value as WorkloadType)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="custom">Custom Sequence</option>
              <option value="locality">Locality-of-Reference (80/20)</option>
              <option value="repeated_loop">Repeated Nested Loop</option>
              <option value="sequential">Sequential Scan</option>
              <option value="phase_change">Phase-Changing Working Set</option>
              <option value="thrashing">Thrashing-Prone Workload</option>
              <option value="random">Uniform Random</option>
            </select>
          </div>

          {/* Replacement Algorithm */}
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Page Replacement Policy
            </label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="lru">LRU — Least Recently Used</option>
              <option value="fifo">FIFO — First-In, First-Out</option>
              <option value="optimal">Optimal — Oracle Benchmark (Offline)</option>
              <option value="markov">Markov-Guided Replacement</option>
              <option value="lstm">LSTM-Guided Replacement</option>
              <option value="adaptive">Self-Learning Adaptive Controller</option>
            </select>
          </div>

          {/* Number of Physical Frames */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>Physical Memory Frames</span>
              <span className="text-white font-bold">{numFrames} Frames</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={numFrames}
              onChange={(e) => setNumFrames(parseInt(e.target.value))}
              className="w-full accent-indigo-500 bg-dark-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1 Frame</span>
              <span>6 Frames</span>
              <span>12 Frames</span>
            </div>
          </div>

          {/* Workload Length if non-custom */}
          {workloadType !== 'custom' ? (
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                <span>Sequence Length</span>
                <span className="text-white font-bold">{workloadLength} Refs</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={workloadLength}
                onChange={(e) => setWorkloadLength(parseInt(e.target.value))}
                className="w-full accent-indigo-500 bg-dark-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>10</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5">
                Presets Quick Paste
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomSequence('7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2')}
                  className="px-2 py-1.5 bg-dark-800 hover:bg-dark-750 text-[10px] font-mono rounded border border-dark-700 text-slate-300"
                >
                  Standard LRU
                </button>
                <button
                  type="button"
                  onClick={() => setCustomSequence('1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5')}
                  className="px-2 py-1.5 bg-amber-950/40 hover:bg-amber-900/40 text-[10px] font-mono rounded border border-amber-800/40 text-amber-300"
                >
                  Belady Anomaly
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Custom Reference Input */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5">
            Page Reference Sequence (Comma-separated integers)
          </label>
          <input
            type="text"
            value={customSequence}
            onChange={(e) => {
              setCustomSequence(e.target.value);
              setWorkloadType('custom');
            }}
            placeholder="e.g. 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2"
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono tracking-wide focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Stepping & Playback Controller */}
      {simulationResult && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-400">Step:</span>
            <span className="text-lg font-bold font-mono text-white px-3 py-0.5 rounded bg-dark-800 border border-dark-700">
              {currentStepIndex + 1} / {simulationResult.trace.length}
            </span>
            {currentStep && (
              <span
                className={`text-xs px-2.5 py-1 rounded font-mono font-bold flex items-center gap-1.5 ${
                  currentStep.is_hit
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                    : 'bg-rose-950/80 text-rose-400 border border-rose-800'
                }`}
              >
                {currentStep.is_hit ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {currentStep.is_hit ? 'HIT' : 'FAULT'}: Page {currentStep.page}
              </span>
            )}
          </div>

          {/* Media Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetPlayback}
              className="p-2 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-750 text-slate-300 hover:text-white"
              title="Reset to Beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={handleStepBackward}
              disabled={currentStepIndex === 0}
              className="p-2 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-750 text-slate-300 hover:text-white disabled:opacity-40"
              title="Step Backward (Deterministic Replay)"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center gap-2"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleStepForward}
              disabled={currentStepIndex >= simulationResult.trace.length - 1}
              className="p-2 rounded-lg bg-dark-800 border border-dark-700 hover:bg-dark-750 text-slate-300 hover:text-white disabled:opacity-40"
              title="Step Forward"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Speed Slider */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Speed:</span>
            <input
              type="range"
              min={150}
              max={1500}
              step={50}
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
              className="accent-indigo-500 bg-dark-800 h-1.5 w-24 rounded cursor-pointer"
            />
            <span className="w-12 text-right">{playbackSpeed}ms</span>
          </div>
        </div>
      )}

      {/* Frame Visualizer at current step */}
      {simulationResult && (
        <FrameGrid
          frames={currentFrames}
          activePage={currentStep?.page ?? null}
          evictedPage={currentStep?.evicted_page ?? null}
          isHit={currentStep?.is_hit ?? null}
          algorithmName={simulationResult.algorithm}
        />
      )}

      {/* Current Step Detailed Metrics */}
      {currentStep && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-dark-900 border border-dark-750 rounded-xl p-3 font-mono">
            <span className="text-[11px] text-slate-400 uppercase">Cumulative Hits</span>
            <span className="block text-xl font-bold text-emerald-400">{currentStep.cumulative_hits}</span>
            <span className="text-[10px] text-slate-500">Ratio: {(currentStep.hit_ratio * 100).toFixed(1)}%</span>
          </div>
          <div className="bg-dark-900 border border-dark-750 rounded-xl p-3 font-mono">
            <span className="text-[11px] text-slate-400 uppercase">Cumulative Faults</span>
            <span className="block text-xl font-bold text-rose-400">{currentStep.cumulative_faults}</span>
            <span className="text-[10px] text-slate-500">Rate: {(currentStep.fault_rate * 100).toFixed(1)}%</span>
          </div>
          <div className="bg-dark-900 border border-dark-750 rounded-xl p-3 font-mono">
            <span className="text-[11px] text-slate-400 uppercase">Last Evicted Victim</span>
            <span className="block text-xl font-bold text-amber-300">
              {currentStep.evicted_page !== null ? `Page ${currentStep.evicted_page}` : 'None'}
            </span>
            <span className="text-[10px] text-slate-500">Frame Capacity Demand</span>
          </div>
          <div className="bg-dark-900 border border-dark-750 rounded-xl p-3 font-mono">
            <span className="text-[11px] text-slate-400 uppercase">Engine Policy</span>
            <span className="block text-xl font-bold text-indigo-400">{simulationResult.algorithm}</span>
            <span className="text-[10px] text-slate-500">Deterministic Online State</span>
          </div>
        </div>
      )}

      {/* Event Log with filter */}
      {simulationResult && (
        <EventLog
          trace={simulationResult.trace}
          activeStep={currentStepIndex}
          onSelectStep={(step) => {
            setIsPlaying(false);
            setCurrentStepIndex(step);
          }}
        />
      )}
    </div>
  );
};
