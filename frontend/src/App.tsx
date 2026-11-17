import React, { Suspense, useState, useEffect } from 'react';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { Header } from './components/Header';
import { VivaModal } from './components/VivaModal';

// Load each tab only when selected; App retains ownership of shared state.
const OverviewView = React.lazy(() =>
  import('./pages/OverviewView').then(({ OverviewView }) => ({ default: OverviewView }))
);
const SimulatorView = React.lazy(() =>
  import('./pages/SimulatorView').then(({ SimulatorView }) => ({ default: SimulatorView }))
);
const AlgorithmLabView = React.lazy(() =>
  import('./pages/AlgorithmLabView').then(({ AlgorithmLabView }) => ({ default: AlgorithmLabView }))
);
const PredictionCenterView = React.lazy(() =>
  import('./pages/PredictionCenterView').then(({ PredictionCenterView }) => ({ default: PredictionCenterView }))
);
const ThrashingMonitorView = React.lazy(() =>
  import('./pages/ThrashingMonitorView').then(({ ThrashingMonitorView }) => ({ default: ThrashingMonitorView }))
);
const MultiProcessView = React.lazy(() =>
  import('./pages/MultiProcessView').then(({ MultiProcessView }) => ({ default: MultiProcessView }))
);
const ExperimentsView = React.lazy(() =>
  import('./pages/ExperimentsView').then(({ ExperimentsView }) => ({ default: ExperimentsView }))
);
const EducationView = React.lazy(() =>
  import('./pages/EducationView').then(({ EducationView }) => ({ default: EducationView }))
);

import {
  SimulationResult,
  ComparisonResult,
  ThrashingAnalysisResponse
} from './types';
import {
  fetchHealth,
  runSimulation,
  compareAlgorithms,
  analyzeThrashing,
  generateWorkload
} from './services/api';

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItemKey>('overview');
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [lstmStatus, setLstmStatus] = useState<string>('untrained');
  const [isVivaModalOpen, setIsVivaModalOpen] = useState<boolean>(false);

  // Global shared simulation states
  const [lastSimulation, setLastSimulation] = useState<SimulationResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [thrashingResult, setThrashingResult] = useState<ThrashingAnalysisResponse | null>(null);
  const [isQuickRunning, setIsQuickRunning] = useState<boolean>(false);

  // Poll backend health on startup
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await fetchHealth();
        setBackendOnline(health.status === 'healthy');
        setLstmStatus(health.models?.lstm || 'untrained');
      } catch {
        setBackendOnline(false);
      }
    };
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  // Quick launch sample workload: generates real results across all engines
  const handleLaunchSampleWorkload = async () => {
    setIsQuickRunning(true);
    try {
      const sampleSeq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2];
      const frames = 3;

      const [simRes, compRes, thrashRes] = await Promise.all([
        runSimulation(sampleSeq, frames, 'adaptive'),
        compareAlgorithms(sampleSeq, frames, ['fifo', 'lru', 'optimal', 'markov', 'adaptive'], 6),
        analyzeThrashing(sampleSeq, frames, 'lru', 6)
      ]);

      setLastSimulation(simRes);
      setComparisonResult(compRes);
      setThrashingResult(thrashRes);
    } catch (e) {
      console.error('Quick sample launch error:', e);
    } finally {
      setIsQuickRunning(false);
    }
  };

  const handleReset = () => {
    setLastSimulation(null);
    setComparisonResult(null);
    setThrashingResult(null);
  };

  const handleLaunchTopicSimulation = async (preset: 'belady' | 'locality' | 'thrashing' | 'markov') => {
    if (preset === 'belady') {
      setCurrentTab('algorithms');
    } else if (preset === 'thrashing') {
      setCurrentTab('thrashing');
    } else if (preset === 'markov') {
      setCurrentTab('prediction');
    } else {
      setCurrentTab('simulator');
    }
  };

  // Determine title and subtitle per tab
  const getHeaderDetails = () => {
    switch (currentTab) {
      case 'overview':
        return {
          title: 'Overview',
          subtitle: 'Reference, fault, and frame-residency metrics'
        };
      case 'simulator':
        return {
          title: 'Memory Simulator',
          subtitle: 'Inspect each reference, frame transition, and replacement decision'
        };
      case 'algorithms':
        return {
          title: 'Algorithm Comparison',
          subtitle: 'Compare replacement policies against the same workload'
        };
      case 'prediction':
        return {
          title: 'Prediction Models',
          subtitle: 'Markov transition estimates and LSTM sequence inference'
        };
      case 'thrashing':
        return {
          title: 'Memory Pressure',
          subtitle: 'Working-set demand, page-fault frequency, and capacity warnings'
        };
      case 'multiprocess':
        return {
          title: 'Process Allocation',
          subtitle: 'Frame distribution, working sets, and allocation fairness'
        };
      case 'experiments':
        return {
          title: 'Experiments',
          subtitle: 'Save configurations, review results, and export data'
        };
      case 'learn':
        return {
          title: 'Reference',
          subtitle: 'Definitions, formulas, and implementation notes'
        };
    }
  };

  const headerDetails = getHeaderDetails();

  return (
    <div className="app-shell flex h-screen bg-dark-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        backendOnline={backendOnline}
        lstmStatus={lstmStatus}
      />

      {/* Main Content Area */}
      <div className="app-main flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={headerDetails.title}
          subtitle={headerDetails.subtitle}
          onReset={handleReset}
          onQuickSample={handleLaunchSampleWorkload}
          onOpenVivaGuide={() => setIsVivaModalOpen(true)}
          isSimulating={isQuickRunning}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="app-content max-w-7xl mx-auto pb-12">
            <Suspense
              fallback={(
                <div className="neo-page-loading" role="status" aria-live="polite">
                  <span className="neo-page-spinner" aria-hidden="true" />
                  Loading {headerDetails.title}…
                </div>
              )}
            >
              {currentTab === 'overview' && (
                <OverviewView
                  lastSimulation={lastSimulation}
                  comparisonResult={comparisonResult}
                  thrashingResult={thrashingResult}
                  onLaunchSample={handleLaunchSampleWorkload}
                  onNavigateTab={setCurrentTab}
                />
              )}

              {currentTab === 'simulator' && (
                <SimulatorView
                  initialResult={lastSimulation}
                  onSimulationComplete={(res) => setLastSimulation(res)}
                />
              )}

              {currentTab === 'algorithms' && (
                <AlgorithmLabView
                  initialComparison={comparisonResult}
                  onComparisonComplete={(res) => setComparisonResult(res)}
                />
              )}

              {currentTab === 'prediction' && (
                <PredictionCenterView />
              )}

              {currentTab === 'thrashing' && (
                <ThrashingMonitorView
                  initialResult={thrashingResult}
                  onAnalysisComplete={(res) => setThrashingResult(res)}
                />
              )}

              {currentTab === 'multiprocess' && (
                <MultiProcessView />
              )}

              {currentTab === 'experiments' && (
                <ExperimentsView
                  lastSimulation={lastSimulation}
                  comparisonResult={comparisonResult}
                />
              )}

              {currentTab === 'learn' && (
                <EducationView onLaunchTopicSimulation={handleLaunchTopicSimulation} />
              )}
            </Suspense>
          </div>
        </main>
      </div>

      {/* Viva Defense Modal */}
      <VivaModal
        isOpen={isVivaModalOpen}
        onClose={() => setIsVivaModalOpen(false)}
      />
    </div>
  );
}

export default App;
