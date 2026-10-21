import React, { useState, useEffect } from 'react';
import {
  MarkovPredictResponse,
  LSTMPredictResponse,
  LSTMTrainResponse
} from '../types';
import {
  predictMarkov,
  predictLSTM,
  trainLSTM,
  getModelStatus
} from '../services/api';
import {
  Brain,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
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
  Legend
} from 'recharts';

export const PredictionCenterView: React.FC = () => {
  const [testSequence, setTestSequence] = useState('0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 4, 0, 1, 2, 3');
  const [markovResult, setMarkovResult] = useState<MarkovPredictResponse | null>(null);
  const [lstmResult, setLstmResult] = useState<LSTMPredictResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<string>('checking...');
  const [trainMetrics, setTrainMetrics] = useState<LSTMTrainResponse | null>(null);

  // Training parameters
  const [epochs, setEpochs] = useState(25);
  const [hiddenSize, setHiddenSize] = useState(32);
  const [datasetSize, setDatasetSize] = useState(600);
  const [isTraining, setIsTraining] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const st = await getModelStatus();
      setModelStatus(st.status);
    } catch {
      setModelStatus('unavailable');
    }
  };

  useEffect(() => {
    fetchStatus();
    handleRunPredictions();
  }, []);

  const handleRunPredictions = async () => {
    setIsPredicting(true);
    setErrorMsg(null);
    try {
      const history = testSequence
        .split(/[\s,]+/)
        .map(x => parseInt(x.trim()))
        .filter(x => !isNaN(x));

      if (history.length === 0) {
        throw new Error('Please enter valid integer page numbers.');
      }

      const [mRes, lRes] = await Promise.all([
        predictMarkov(history, 4),
        predictLSTM(history, 4)
      ]);

      setMarkovResult(mRes);
      setLstmResult(lRes);
      setModelStatus(lRes.model_status);
    } catch (err: any) {
      setErrorMsg(err.message || 'Prediction execution failed.');
    } finally {
      setIsPredicting(false);
    }
  };

  const handleTrainLSTM = async () => {
    setIsTraining(true);
    setErrorMsg(null);
    try {
      const res = await trainLSTM(epochs, 5, hiddenSize, 0.01, datasetSize);
      setTrainMetrics(res);
      setModelStatus(res.status);
      await handleRunPredictions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Training failed.');
    } finally {
      setIsTraining(false);
    }
  };

  // Convert Markov transition matrix for rendering
  const matrix = markovResult?.transition_matrix || {};
  const matrixKeys = Object.keys(matrix).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              AI Sequence Prediction Engine (Markov + PyTorch LSTM)
            </h3>
            <p className="text-xs text-slate-400">
              Evaluates upcoming virtual memory reference likelihood using strictly historical observations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Model Status:</span>
            <span
              className={`text-xs px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider ${
                modelStatus === 'trained'
                  ? 'bg-violet-950/80 text-violet-300 border border-violet-700/60'
                  : 'bg-dark-800 text-slate-400 border border-dark-700'
              }`}
            >
              {modelStatus}
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* Input Test Sequence */}
        <div className="mt-4 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Historical Reference Sequence
            </label>
            <input
              type="text"
              value={testSequence}
              onChange={(e) => setTestSequence(e.target.value)}
              className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
          </div>
          <button
            onClick={handleRunPredictions}
            disabled={isPredicting}
            className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-mono font-semibold text-xs shadow-md shadow-violet-600/30 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <Activity className="w-4 h-4" />
            {isPredicting ? 'Inferring...' : 'Predict Next Page'}
          </button>
        </div>
      </div>

      {/* Model Predictions Side-by-Side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Markov Prediction Card */}
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-750">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
              <h4 className="text-sm font-semibold text-white font-mono">
                First-Order Markov Predictor
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-dark-800 border border-dark-700 text-slate-400 font-mono">
              Strictly Causal P(v|u)
            </span>
          </div>

          {markovResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-dark-850 border border-dark-750 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Predicted Next Page</span>
                  <div className="text-2xl font-bold text-violet-300">
                    {markovResult.predicted_next_page !== null ? `Page ${markovResult.predicted_next_page}` : 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase">Transition Confidence</span>
                  <div className="text-lg font-bold text-white">
                    {(markovResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 mb-2 block">
                  Top-K Candidate Next Pages:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {markovResult.top_candidates.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-dark-800/80 border border-dark-700 flex justify-between items-center"
                    >
                      <span className="text-white font-bold">Page {c.page}</span>
                      <span className="text-violet-400">{(c.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {markovResult.is_fallback && (
                <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-300 text-[11px] font-mono">
                  State has no prior outgoing transition observations. Empirical marginal fallback was applied.
                </div>
              )}
            </div>
          )}
        </div>

        {/* PyTorch LSTM Sequence Model Card */}
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-dark-750">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <h4 className="text-sm font-semibold text-white font-mono">
                PyTorch LSTM Neural Predictor
              </h4>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50 font-mono">
              Sliding Window (len=5)
            </span>
          </div>

          {lstmResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-dark-850 border border-dark-750 font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase">Predicted Next Page</span>
                  <div className="text-2xl font-bold text-indigo-300">
                    {lstmResult.predicted_next_page !== null ? `Page ${lstmResult.predicted_next_page}` : 'N/A'}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase">Softmax Confidence</span>
                  <div className="text-lg font-bold text-white">
                    {(lstmResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 mb-2 block">
                  Top-K Softmax Probabilities:
                </span>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {lstmResult.top_candidates.map((c, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-dark-800/80 border border-dark-700 flex justify-between items-center"
                    >
                      <span className="text-white font-bold">Page {c.page}</span>
                      <span className="text-indigo-400">{(c.probability * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {lstmResult.is_fallback && (
                <div className="p-2.5 rounded-lg bg-dark-850 border border-dark-700 text-slate-400 text-[11px] font-mono">
                  Model is untrained or history is short. Operating in documented heuristic frequency mode.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* LSTM Training Configuration Panel */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              PyTorch LSTM Lightweight Training Control
            </h3>
            <p className="text-xs text-slate-400">
              Train on synthetic multi-phase workload sequences directly on CPU (~1-2 seconds)
            </p>
          </div>

          <button
            onClick={handleTrainLSTM}
            disabled={isTraining}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-mono font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isTraining ? 'Training PyTorch Model...' : 'Train LSTM Model Now'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Epochs: {epochs}</label>
            <input
              type="range"
              min={10}
              max={60}
              step={5}
              value={epochs}
              onChange={(e) => setEpochs(parseInt(e.target.value))}
              className="w-full accent-violet-500 bg-dark-800 h-2 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Hidden Units: {hiddenSize}</label>
            <input
              type="range"
              min={16}
              max={64}
              step={16}
              value={hiddenSize}
              onChange={(e) => setHiddenSize(parseInt(e.target.value))}
              className="w-full accent-violet-500 bg-dark-800 h-2 rounded cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">Training Sequence Size: {datasetSize}</label>
            <input
              type="range"
              min={200}
              max={1500}
              step={100}
              value={datasetSize}
              onChange={(e) => setDatasetSize(parseInt(e.target.value))}
              className="w-full accent-violet-500 bg-dark-800 h-2 rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Training Progress Curve if available */}
        {trainMetrics && (
          <div className="mt-4 pt-4 border-t border-dark-750">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-emerald-400">
                ✓ Training Complete: Final Loss {trainMetrics.final_loss.toFixed(4)}, Val Accuracy {(trainMetrics.final_val_accuracy * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainMetrics.training_history}>
                  <XAxis dataKey="epoch" stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Line type="monotone" dataKey="loss" name="CrossEntropy Loss" stroke="#EF4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="val_accuracy" name="Validation Accuracy" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Markov Transition Matrix Table */}
      {matrixKeys.length > 0 && (
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono mb-3">
            Markov State Transition Probability Matrix P(Target | Source)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs font-mono">
              <thead className="bg-dark-850 text-slate-400">
                <tr>
                  <th className="py-2 px-3 border border-dark-750 bg-dark-800 text-left">From \ To</th>
                  {matrixKeys.map(k => (
                    <th key={k} className="py-2 px-3 border border-dark-750">
                      Page {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixKeys.map(src => (
                  <tr key={src} className="hover:bg-dark-850/50">
                    <td className="py-2 px-3 border border-dark-750 font-bold text-white bg-dark-850/60 text-left">
                      Page {src}
                    </td>
                    {matrixKeys.map(dst => {
                      const prob = matrix[src]?.[dst] || 0;
                      return (
                        <td
                          key={dst}
                          className={`py-2 px-3 border border-dark-750 ${
                            prob > 0.4
                              ? 'bg-violet-900/40 text-violet-300 font-bold'
                              : prob > 0
                              ? 'text-slate-300'
                              : 'text-slate-600'
                          }`}
                        >
                          {prob > 0 ? prob.toFixed(2) : '—'}
                        </td>
                      );
                    })}
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
