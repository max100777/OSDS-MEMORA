export type WorkloadType =
  | 'random'
  | 'sequential'
  | 'repeated_loop'
  | 'locality'
  | 'phase_change'
  | 'thrashing'
  | 'custom';

export type AlgorithmType =
  | 'fifo'
  | 'lru'
  | 'optimal'
  | 'markov'
  | 'lstm'
  | 'adaptive';

export type AllocationPolicy =
  | 'equal'
  | 'proportional'
  | 'working_set'
  | 'pff'
  | 'adaptive';

export interface TopCandidate {
  page: number;
  probability: number;
}

export interface SimulationStepEvent {
  step: number;
  page: number;
  is_hit: bool_alias;
  frames_before: (number | null)[];
  frames_after: (number | null)[];
  evicted_page: number | null;
  reason: string;
  algorithm_used: string;
  cumulative_hits: number;
  cumulative_faults: number;
  hit_ratio: number;
  fault_rate: number;
  prediction_info?: {
    predicted_next?: number | null;
    confidence?: number;
    top_candidates?: { page: number; prob: number }[];
    prev_pred_correct?: boolean | null;
    strategy?: string;
    switch_reason?: string | null;
    model_status?: string;
  };
  timestamp: number;
  process_id: string;
  operation: 'read' | 'write';
  page_table: Record<string, { present: boolean; valid: boolean; frame: number | null; dirty: boolean }>;
  candidate_scores: Record<string, unknown>[];
  simulated_access_cost: number;
  cumulative_access_cost: number;
  dirty_writeback: boolean;
}

type bool_alias = boolean;

export interface SimulationResult {
  algorithm: string;
  num_frames: number;
  total_references: number;
  total_hits: number;
  total_faults: number;
  hit_ratio: number;
  fault_rate: number;
  total_evictions: number;
  trace: SimulationStepEvent[];
  prediction_accuracy: number | null;
  execution_time_ms: number;
  simulated_access_cost: number;
  dirty_writebacks: number;
  workload_pattern?: string;
}

export interface AlgorithmSummary {
  algorithm: string;
  num_frames: number;
  total_references: number;
  total_hits: number;
  total_faults: number;
  hit_ratio: number;
  fault_rate: number;
  total_evictions: number;
  prediction_accuracy?: number | null;
  simulated_access_cost: number;
  execution_time_ms: number;
}

export interface FrameSweepPoint {
  num_frames: number;
  faults: Record<string, number>;
  hit_ratios: Record<string, number>;
}

export interface ComparisonResult {
  reference_sequence: number[];
  num_frames: number;
  summaries: AlgorithmSummary[];
  frame_sweep?: FrameSweepPoint[];
  belady_detected?: boolean;
  belady_detail?: string;
  recommended_frames?: number;
  target_met?: boolean;
  optimization_message?: string;
}

export interface MarkovPredictResponse {
  predicted_next_page: number | null;
  top_candidates: TopCandidate[];
  confidence: number;
  is_fallback: boolean;
  transition_matrix: Record<string, Record<string, number>>;
}

export interface LSTMPredictResponse {
  predicted_next_page: number | null;
  top_candidates: TopCandidate[];
  confidence: number;
  model_status: string;
  is_fallback: boolean;
}

export interface LSTMTrainResponse {
  status: string;
  epochs_trained: number;
  final_loss: number;
  final_val_accuracy: number;
  training_history: { epoch: number; loss: number; val_accuracy: number }[];
  message: string;
}

export interface ThrashingTimelinePoint {
  step: number;
  page: number;
  is_hit: boolean;
  rolling_fault_rate: number;
  working_set_size: number;
  allocated_frames: number;
  pressure_state: 'Normal' | 'Elevated' | 'High' | 'Potential Thrashing';
  alert: string | null;
  recommendation: string | null;
  memory_health_score: number;
  fault_rate_trend: number;
}

export interface ThrashingAnalysisResponse {
  timeline: ThrashingTimelinePoint[];
  overall_status: string;
  total_alerts: number;
  thrashing_steps_count: number;
  mean_working_set_size: number;
  recommended_frame_count: number;
  summary_message: string;
  memory_health_score: number;
  actions_taken: string[];
}

export interface OptimizationCandidate {
  algorithm: string;
  frames: number;
  fault_rate: number;
  hit_ratio: number;
  simulated_access_cost: number;
}

export interface OptimizationResponse {
  candidates: OptimizationCandidate[];
  recommendation: OptimizationCandidate | null;
  target_met: boolean;
  message: string;
}

export interface ProcessMetric {
  pid: string;
  name: string;
  total_references: number;
  hits: number;
  faults: number;
  hit_ratio: number;
  fault_rate: number;
  allocated_frames: number;
  working_set_size: number;
  memory_pressure: string;
}

export interface ProcessAllocationStep {
  step: number;
  active_pid: string;
  referenced_page: number;
  is_hit: boolean;
  allocations: Record<string, number>;
  working_sets: Record<string, number>;
  transfers: string[];
}

export interface MultiProcessResponse {
  total_frames: number;
  allocation_policy: string;
  process_metrics: ProcessMetric[];
  allocation_steps: ProcessAllocationStep[];
  jains_fairness_index: number;
  total_faults: number;
  total_hits: number;
  global_fault_rate: number;
  budget_conserved: boolean;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  created_at: string;
  hypothesis: string;
  configuration: Record<string, any>;
  results: Record<string, any>;
  notes?: string;
}
