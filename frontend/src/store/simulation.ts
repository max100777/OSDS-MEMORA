import { create } from 'zustand';
import type { ComparisonResult, SimulationResult, ThrashingAnalysisResponse } from '../types';

interface SimulationStore {
  simulation: SimulationResult | null;
  comparison: ComparisonResult | null;
  thrashing: ThrashingAnalysisResponse | null;
  setSimulation: (value: SimulationResult | null) => void;
  setComparison: (value: ComparisonResult | null) => void;
  setThrashing: (value: ThrashingAnalysisResponse | null) => void;
  reset: () => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  simulation: null,
  comparison: null,
  thrashing: null,
  setSimulation: (simulation) => set({ simulation }),
  setComparison: (comparison) => set({ comparison }),
  setThrashing: (thrashing) => set({ thrashing }),
  reset: () => set({ simulation: null, comparison: null, thrashing: null }),
}));
