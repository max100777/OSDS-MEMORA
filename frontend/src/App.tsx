import React, { useState, useEffect } from 'react';
import { Sidebar, NavItemKey } from './components/Sidebar';
import { Header } from './components/Header';
import { VivaModal } from './components/VivaModal';

// Pages
import { OverviewView } from './pages/OverviewView';
import { SimulatorView } from './pages/SimulatorView';
import { AlgorithmLabView } from './pages/AlgorithmLabView';
import { PredictionCenterView } from './pages/PredictionCenterView';
import { ThrashingMonitorView } from './pages/ThrashingMonitorView';
import { MultiProcessView } from './pages/MultiProcessView';
import { ExperimentsView } from './pages/ExperimentsView';
import { EducationView } from './pages/EducationView';

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
          title: 'System Observability Overview',
          subtitle: 'Real-time telemetry, hit/fault distribution, and frame residency metrics'
        };
      case 'simulator':
        return {
          title: 'Virtual Memory Step Simulator',
          subtitle: 'Interactive hardware frame animation with deterministic stepping and decision rationale'
        };
      case 'algorithms':
        return {
          title: 'Algorithm Laboratory & Benchmark',
          subtitle: 'Side-by-side execution of FIFO, LRU, Optimal benchmark, Markov, and Belady anomaly'
        };
      case 'prediction':
        return {
          title: 'AI Prediction Center',
          subtitle: 'First-order Markov conditional transitions and lightweight PyTorch sequence inference'
        };
      case 'thrashing':
        return {
          title: 'Working-Set Thrashing Monitor',
          subtitle: 'Working-Set Size WSS(t, Δ) tracking, Page-Fault Frequency, and pressure warnings'
        };
      case 'multiprocess':
        return {
          title: 'Multi-Process Partition Manager',
          subtitle: 'Concurrent address space isolation, dynamic frame reallocation, and Jain’s Fairness Index'
        };
      case 'experiments':
        return {
          title: 'Experiments & Scientific Reports',
          subtitle: 'Archive empirical trials, export CSV data, and produce viva-ready methodologies'
        };
      case 'learn':
        return {
          title: 'OSDS Coursework Educational Guide',
          subtitle: 'Academic concepts, formulas, memory management theory, and examination prep'
        };
    }
  };

  const headerDetails = getHeaderDetails();

  return (
    <div className="flex h-screen bg-dark-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        backendOnline={backendOnline}
        lstmStatus={lstmStatus}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={headerDetails.title}
          subtitle={headerDetails.subtitle}
          onReset={handleReset}
          onQuickSample={handleLaunchSampleWorkload}
          onOpenVivaGuide={() => setIsVivaModalOpen(true)}
          isSimulating={isQuickRunning}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto pb-12">
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
