from __future__ import annotations
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field, model_validator
from enum import Enum

class WorkloadType(str, Enum):
    RANDOM = "random"
    SEQUENTIAL = "sequential"
    REPEATED_LOOP = "repeated_loop"
    LOCALITY = "locality"
    PHASE_CHANGE = "phase_change"
    THRASHING = "thrashing"
    CUSTOM = "custom"

class AlgorithmType(str, Enum):
    FIFO = "fifo"
    LRU = "lru"
    OPTIMAL = "optimal"
    MARKOV = "markov"
    LSTM = "lstm"
    ADAPTIVE = "adaptive"

class AccessType(str, Enum):
    READ = "read"
    WRITE = "write"

class AllocationPolicy(str, Enum):
    EQUAL = "equal"
    PROPORTIONAL = "proportional"
    WORKING_SET = "working_set"
    PFF = "pff"
    ADAPTIVE = "adaptive"

# Workload Schemas
class WorkloadRequest(BaseModel):
    workload_type: WorkloadType = WorkloadType.LOCALITY
    length: int = Field(default=30, ge=5, le=3000)
    page_range: int = Field(default=8, ge=2, le=50)
    locality_strength: float = Field(default=0.8, ge=0.0, le=1.0)
    loop_size: Optional[int] = Field(default=4, ge=2, le=20)
    seed: Optional[int] = None
    custom_sequence: Optional[str] = None

class WorkloadResponse(BaseModel):
    sequence: List[int]
    length: int
    page_range: int
    workload_type: str
    description: str

# Simulation Schemas
class SimulationStepEvent(BaseModel):
    step: int
    page: int
    is_hit: bool
    frames_before: List[Optional[int]]
    frames_after: List[Optional[int]]
    evicted_page: Optional[int] = None
    reason: str
    algorithm_used: str
    cumulative_hits: int
    cumulative_faults: int
    hit_ratio: float
    fault_rate: float
    prediction_info: Optional[Dict[str, Any]] = None
    timestamp: int = 0
    process_id: str = "P1"
    operation: AccessType = AccessType.READ
    page_table: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    candidate_scores: List[Dict[str, Any]] = Field(default_factory=list)
    simulated_access_cost: float = 0.0
    cumulative_access_cost: float = 0.0
    dirty_writeback: bool = False

class SimulationRequest(BaseModel):
    reference_sequence: List[int] = Field(..., min_length=1)
    num_frames: int = Field(default=3, ge=1, le=32)
    algorithm: AlgorithmType = AlgorithmType.LRU
    seed: Optional[int] = None
    process_id: str = "P1"
    operations: Optional[List[AccessType]] = None
    write_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    memory_latency: float = Field(default=1.0, ge=0.0)
    disk_read_latency: float = Field(default=100.0, ge=0.0)
    disk_write_latency: float = Field(default=100.0, ge=0.0)

class SimulationResult(BaseModel):
    algorithm: str
    num_frames: int
    total_references: int
    total_hits: int
    total_faults: int
    hit_ratio: float
    fault_rate: float
    total_evictions: int
    trace: List[SimulationStepEvent]
    prediction_accuracy: Optional[float] = None
    execution_time_ms: float = 0.0
    simulated_access_cost: float = 0.0
    dirty_writebacks: int = 0
    workload_pattern: Optional[str] = None

# Comparison Schemas
class ComparisonRequest(BaseModel):
    reference_sequence: List[int]
    num_frames: int = Field(default=3, ge=1, le=32)
    algorithms: List[AlgorithmType] = [
        AlgorithmType.FIFO,
        AlgorithmType.LRU,
        AlgorithmType.OPTIMAL,
        AlgorithmType.MARKOV,
        AlgorithmType.ADAPTIVE
    ]
    frame_sweep_max: Optional[int] = Field(default=None, ge=2, le=16)
    target_fault_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    candidate_frames: Optional[List[int]] = None

class AlgorithmSummary(BaseModel):
    algorithm: str
    num_frames: int
    total_references: int
    total_hits: int
    total_faults: int
    hit_ratio: float
    fault_rate: float
    total_evictions: int
    prediction_accuracy: Optional[float] = None
    simulated_access_cost: float = 0.0
    execution_time_ms: float = 0.0

class FrameSweepPoint(BaseModel):
    num_frames: int
    faults: Dict[str, int]
    hit_ratios: Dict[str, float]

class ComparisonResult(BaseModel):
    reference_sequence: List[int]
    num_frames: int
    summaries: List[AlgorithmSummary]
    frame_sweep: Optional[List[FrameSweepPoint]] = None
    belady_detected: Optional[bool] = None
    belady_detail: Optional[str] = None
    recommended_frames: Optional[int] = None
    target_met: Optional[bool] = None
    optimization_message: Optional[str] = None

# Markov Schemas
class MarkovPredictRequest(BaseModel):
    history: List[int] = Field(..., min_length=1)
    top_k: int = Field(default=3, ge=1, le=10)

class TopCandidate(BaseModel):
    page: int
    probability: float

class MarkovPredictResponse(BaseModel):
    predicted_next_page: Optional[int] = None
    top_candidates: List[TopCandidate]
    confidence: float
    is_fallback: bool
    transition_matrix: Dict[str, Dict[str, float]]

# LSTM Schemas
class LSTMTrainRequest(BaseModel):
    epochs: int = Field(default=30, ge=5, le=100)
    sequence_length: int = Field(default=5, ge=3, le=15)
    hidden_size: int = Field(default=32, ge=8, le=128)
    lr: float = Field(default=0.01, ge=0.0001, le=0.1)
    dataset_size: int = Field(default=600, ge=100, le=3000)

class LSTMTrainResponse(BaseModel):
    status: str
    epochs_trained: int
    final_loss: float
    final_val_accuracy: float
    training_history: List[Dict[str, float]]
    message: str

class LSTMPredictRequest(BaseModel):
    history: List[int] = Field(..., min_length=1)
    top_k: int = Field(default=3, ge=1, le=10)

class LSTMPredictResponse(BaseModel):
    predicted_next_page: Optional[int] = None
    top_candidates: List[TopCandidate]
    confidence: float
    model_status: str
    is_fallback: bool

# Thrashing Schemas
class ThrashingAnalysisRequest(BaseModel):
    reference_sequence: List[int]
    num_frames: int = Field(default=3, ge=1, le=32)
    algorithm: AlgorithmType = AlgorithmType.LRU
    window_size: int = Field(default=8, ge=3, le=30)
    high_fault_threshold: float = Field(default=0.6, ge=0.1, le=1.0)
    critical_threshold: float = Field(default=0.8, ge=0.2, le=1.0)

class ThrashingTimelinePoint(BaseModel):
    step: int
    page: int
    is_hit: bool
    rolling_fault_rate: float
    working_set_size: int
    allocated_frames: int
    pressure_state: str  # Normal, Elevated, High, Thrashing
    alert: Optional[str] = None
    recommendation: Optional[str] = None
    memory_health_score: float = 100.0
    fault_rate_trend: float = 0.0

class ThrashingAnalysisResponse(BaseModel):
    timeline: List[ThrashingTimelinePoint]
    overall_status: str
    total_alerts: int
    thrashing_steps_count: int
    mean_working_set_size: float
    recommended_frame_count: int
    summary_message: str
    memory_health_score: float = 100.0
    actions_taken: List[str] = Field(default_factory=list)

# Multi-Process Schemas
class ProcessConfig(BaseModel):
    pid: str
    name: str
    reference_sequence: List[int] = Field(..., min_length=1)
    min_frames: int = Field(default=1, ge=1)

class MultiProcessRequest(BaseModel):
    processes: List[ProcessConfig]
    total_frames: int = Field(default=9, ge=3, le=64)
    allocation_policy: AllocationPolicy = AllocationPolicy.ADAPTIVE
    window_size: int = Field(default=6, ge=3, le=20)

    @model_validator(mode="after")
    def validate_process_budget(self):
        if not self.processes:
            raise ValueError("At least one process is required")
        pids = [p.pid for p in self.processes]
        if len(pids) != len(set(pids)):
            raise ValueError("Process IDs must be unique")
        if sum(p.min_frames for p in self.processes) > self.total_frames:
            raise ValueError("Minimum frame guarantees exceed the total frame budget")
        return self

class ProcessMetric(BaseModel):
    pid: str
    name: str
    total_references: int
    hits: int
    faults: int
    hit_ratio: float
    fault_rate: float
    allocated_frames: int
    working_set_size: int
    memory_pressure: str

class ProcessAllocationStep(BaseModel):
    step: int
    active_pid: str
    referenced_page: int
    is_hit: bool
    allocations: Dict[str, int]
    working_sets: Dict[str, int]
    transfers: List[str]

class MultiProcessResponse(BaseModel):
    total_frames: int
    allocation_policy: str
    process_metrics: List[ProcessMetric]
    allocation_steps: List[ProcessAllocationStep]
    jains_fairness_index: float
    total_faults: int
    total_hits: int
    global_fault_rate: float
    budget_conserved: bool

# Experiment Persistence Schemas
class ExperimentRecord(BaseModel):
    id: str
    name: str
    created_at: str
    hypothesis: str
    configuration: Dict[str, Any]
    results: Dict[str, Any]
    notes: Optional[str] = ""

class ExperimentSaveRequest(BaseModel):
    name: str
    hypothesis: str
    configuration: Dict[str, Any]
    results: Dict[str, Any]
    notes: Optional[str] = ""

class TraceUploadRequest(BaseModel):
    content: str
    format: str = Field(pattern="^(csv|json)$")

class TraceUploadResponse(BaseModel):
    sequences: Dict[str, List[int]]
    operations: Dict[str, List[AccessType]] = Field(default_factory=dict)
    timestamps: Dict[str, List[float]] = Field(default_factory=dict)
    total_references: int

class OptimizationRequest(BaseModel):
    reference_sequence: List[int] = Field(..., min_length=1)
    algorithms: List[AlgorithmType] = Field(default_factory=lambda: [AlgorithmType.LRU])
    candidate_frames: List[int] = Field(default_factory=lambda: list(range(2, 9)))
    target_fault_rate: float = Field(default=0.25, ge=0.0, le=1.0)
    max_ram_budget: int = Field(default=16, ge=1, le=64)

class OptimizationCandidate(BaseModel):
    algorithm: str
    frames: int
    fault_rate: float
    hit_ratio: float
    simulated_access_cost: float

class OptimizationResponse(BaseModel):
    candidates: List[OptimizationCandidate]
    recommendation: Optional[OptimizationCandidate] = None
    target_met: bool
    message: str

class SimulationSessionCreate(BaseModel):
    simulation: SimulationRequest

class SimulationSessionState(BaseModel):
    id: str
    status: str
    cursor: int
    total_steps: int
    current_event: Optional[SimulationStepEvent] = None
    result: SimulationResult
