import {
  SimulationResult,
  ComparisonResult,
  WorkloadType,
  AlgorithmType,
  MarkovPredictResponse,
  LSTMPredictResponse,
  LSTMTrainResponse,
  ThrashingAnalysisResponse,
  MultiProcessResponse,
  ExperimentRecord,
  AllocationPolicy
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

export async function fetchHealth(): Promise<{ status: string; models: Record<string, string> }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Failed to connect to backend.');
  return res.json();
}

export async function generateWorkload(
  workload_type: WorkloadType,
  length: number = 30,
  page_range: number = 8,
  locality_strength: number = 0.8,
  custom_sequence?: string
): Promise<{ sequence: number[]; description: string; length: number; page_range: number }> {
  const res = await fetch(`${API_BASE}/generate-workload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workload_type,
      length,
      page_range,
      locality_strength,
      custom_sequence
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Workload generation failed.');
  }
  return res.json();
}

export async function runSimulation(
  reference_sequence: number[],
  num_frames: number,
  algorithm: AlgorithmType
): Promise<SimulationResult> {
  const res = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference_sequence, num_frames, algorithm })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Simulation execution failed.');
  }
  return res.json();
}

export async function compareAlgorithms(
  reference_sequence: number[],
  num_frames: number,
  algorithms: AlgorithmType[],
  frame_sweep_max?: number
): Promise<ComparisonResult> {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference_sequence, num_frames, algorithms, frame_sweep_max })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Comparison failed.');
  }
  return res.json();
}

export async function predictMarkov(history: number[], top_k: number = 4): Promise<MarkovPredictResponse> {
  const res = await fetch(`${API_BASE}/predict/markov`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, top_k })
  });
  if (!res.ok) throw new Error('Markov prediction failed.');
  return res.json();
}

export async function predictLSTM(history: number[], top_k: number = 4): Promise<LSTMPredictResponse> {
  const res = await fetch(`${API_BASE}/predict/lstm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history, top_k })
  });
  if (!res.ok) throw new Error('LSTM prediction failed.');
  return res.json();
}

export async function trainLSTM(
  epochs: number = 25,
  sequence_length: number = 5,
  hidden_size: number = 32,
  lr: number = 0.01,
  dataset_size: number = 600
): Promise<LSTMTrainResponse> {
  const res = await fetch(`${API_BASE}/model/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ epochs, sequence_length, hidden_size, lr, dataset_size })
  });
  if (!res.ok) throw new Error('LSTM training failed.');
  return res.json();
}

export async function getModelStatus(): Promise<any> {
  const res = await fetch(`${API_BASE}/model/status`);
  if (!res.ok) throw new Error('Failed to get model status.');
  return res.json();
}

export async function analyzeThrashing(
  reference_sequence: number[],
  num_frames: number,
  algorithm: AlgorithmType = 'lru',
  window_size: number = 8,
  high_threshold: number = 0.6,
  critical_threshold: number = 0.8
): Promise<ThrashingAnalysisResponse> {
  const res = await fetch(`${API_BASE}/thrashing/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference_sequence,
      num_frames,
      algorithm,
      window_size,
      high_fault_threshold: high_threshold,
      critical_threshold
    })
  });
  if (!res.ok) throw new Error('Thrashing analysis failed.');
  return res.json();
}

export async function runMultiProcess(
  processes: { pid: string; name: string; reference_sequence: number[]; min_frames?: number }[],
  total_frames: number,
  allocation_policy: AllocationPolicy
): Promise<MultiProcessResponse> {
  const res = await fetch(`${API_BASE}/multiprocess/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      processes,
      total_frames,
      allocation_policy
    })
  });
  if (!res.ok) throw new Error('Multi-process simulation failed.');
  return res.json();
}

export async function saveExperiment(
  name: string,
  hypothesis: string,
  configuration: Record<string, any>,
  results: Record<string, any>,
  notes?: string
): Promise<ExperimentRecord> {
  const res = await fetch(`${API_BASE}/experiments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, hypothesis, configuration, results, notes })
  });
  if (!res.ok) throw new Error('Failed to save experiment.');
  return res.json();
}

export async function listExperiments(): Promise<ExperimentRecord[]> {
  const res = await fetch(`${API_BASE}/experiments`);
  if (!res.ok) throw new Error('Failed to list experiments.');
  return res.json();
}

export function getExperimentExportUrl(id: string): string {
  return `${API_BASE}/experiments/${id}/export`;
}
