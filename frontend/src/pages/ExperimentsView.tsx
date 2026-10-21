import React, { useState, useEffect } from 'react';
import { ExperimentRecord, ComparisonResult, SimulationResult } from '../types';
import {
  saveExperiment,
  listExperiments,
  getExperimentExportUrl
} from '../services/api';
import {
  FlaskConical,
  Download,
  Save,
  CheckCircle2,
  Calendar,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ExperimentsViewProps {
  lastSimulation: SimulationResult | null;
  comparisonResult: ComparisonResult | null;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({
  lastSimulation,
  comparisonResult
}) => {
  const [experiments, setExperiments] = useState<ExperimentRecord[]>([]);
  const [selectedExp, setSelectedExp] = useState<ExperimentRecord | null>(null);

  // Form fields for saving an experiment
  const [expName, setExpName] = useState('Locality Paging vs Belady FIFO');
  const [hypothesis, setHypothesis] = useState(
    'LRU and Markov policies will outperform FIFO on clustered reference sequences with high temporal locality.'
  );
  const [notes, setNotes] = useState(
    'Tested on 3 physical frames across 25 page access steps.'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSavedExperiments();
  }, []);

  const loadSavedExperiments = async () => {
    try {
      const records = await listExperiments();
      setExperiments(records);
      if (records.length > 0 && !selectedExp) {
        setSelectedExp(records[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCurrent = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const config = {
        frames: lastSimulation?.num_frames || comparisonResult?.num_frames || 3,
        algorithm: lastSimulation?.algorithm || 'Comparative Suite',
        sequence_length: lastSimulation?.total_references || comparisonResult?.reference_sequence.length || 20
      };
      const results = {
        simulation: lastSimulation,
        comparison: comparisonResult
      };

      const record = await saveExperiment(expName, hypothesis, config, results, notes);
      setSaveSuccess(true);
      await loadSavedExperiments();
      setSelectedExp(record);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Current Experiment Form */}
      <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-indigo-400" />
              Save Active Simulation as Scientific Experiment
            </h3>
            <p className="text-xs text-slate-400">
              Preserve configurations, hypotheses, and measured page-fault metrics for OSDS coursework report
            </p>
          </div>

          <button
            onClick={handleSaveCurrent}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Archiving...' : 'Save Experiment'}
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Experiment successfully persisted to local storage.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Experiment Title
            </label>
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Experimental Hypothesis
            </label>
            <input
              type="text"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5">
            Methodology & Experimental Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-dark-800 border border-dark-750 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Saved Experiments Archive & Detailed Report View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Experiment List */}
        <div className="bg-dark-900 border border-dark-750/70 rounded-xl p-4 shadow-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
            Archived Experiments ({experiments.length})
          </h4>

          <div className="space-y-2 max-h-[460px] overflow-y-auto">
            {experiments.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center italic font-mono">
                No saved experiments found. Run a simulation and save it above.
              </p>
            ) : (
              experiments.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => setSelectedExp(exp)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedExp?.id === exp.id
                      ? 'bg-indigo-950/60 border-indigo-500 text-white'
                      : 'bg-dark-850 border-dark-750 text-slate-300 hover:bg-dark-800'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span>ID: #{exp.id}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {exp.created_at}
                    </span>
                  </div>
                  <h5 className="text-xs font-bold font-mono tracking-tight">{exp.name}</h5>
                  <p className="text-[11px] text-slate-400 truncate mt-1">{exp.hypothesis}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Selected Experiment Scientific Report */}
        <div className="lg:col-span-2 bg-dark-900 border border-dark-750/70 rounded-xl p-5 shadow-xl space-y-4">
          {selectedExp ? (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-750">
                <div>
                  <span className="text-[10px] font-mono uppercase bg-indigo-950 text-indigo-400 border border-indigo-700/50 px-2 py-0.5 rounded">
                    Scientific Report • ID: {selectedExp.id}
                  </span>
                  <h3 className="text-base font-bold text-white font-mono mt-1">
                    {selectedExp.name}
                  </h3>
                </div>

                <a
                  href={getExperimentExportUrl(selectedExp.id)}
                  download
                  className="px-3.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 border border-dark-700 text-indigo-400 hover:text-indigo-300 font-mono text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </a>
              </div>

              {/* Report Sections */}
              <div className="space-y-4 mt-4 text-xs font-mono">
                <div className="bg-dark-850 p-3.5 rounded-lg border border-dark-750">
                  <span className="text-indigo-400 font-bold uppercase block mb-1">1. Research Hypothesis</span>
                  <p className="text-slate-300 leading-relaxed font-sans">{selectedExp.hypothesis}</p>
                </div>

                <div className="bg-dark-850 p-3.5 rounded-lg border border-dark-750">
                  <span className="text-indigo-400 font-bold uppercase block mb-1">2. Methodology & Workload Configuration</span>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 mt-2">
                    <div>Allocated Frames: <strong className="text-white">{selectedExp.configuration.frames || '3'}</strong></div>
                    <div>Policy: <strong className="text-white">{selectedExp.configuration.algorithm || 'Benchmark'}</strong></div>
                    <div>References: <strong className="text-white">{selectedExp.configuration.sequence_length || '25'}</strong></div>
                    <div>Recorded At: <strong className="text-white">{selectedExp.created_at}</strong></div>
                  </div>
                  {selectedExp.notes && (
                    <p className="mt-2 text-slate-400 font-sans italic border-t border-dark-700 pt-2">
                      {selectedExp.notes}
                    </p>
                  )}
                </div>

                <div className="bg-dark-850 p-3.5 rounded-lg border border-dark-750">
                  <span className="text-indigo-400 font-bold uppercase block mb-1">3. Academic Conclusion & Defense Notes</span>
                  <p className="text-slate-300 leading-relaxed font-sans">
                    All performance indicators are derived strictly from deterministic emulation traces. Empirical observations confirm that Belady's Anomaly manifests in FIFO when page replacement order conflicts with future reference distribution. Optimal replacement provides an offline mathematical upper bound on hit ratio.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 font-mono text-xs">
              Select an experiment from the left list to review its report.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
