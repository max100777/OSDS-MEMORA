from __future__ import annotations
from typing import List, Dict, Optional, Any, Union
from pydantic import BaseModel, Field
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

class SimulationRequest(BaseModel):
    reference_sequence: List[int] = Field(..., min_length=1)
    num_frames: int = Field(default=3, ge=1, le=32)
    algorithm: AlgorithmType = AlgorithmType.LRU
    seed: Optional[int] = None

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

class ThrashingAnalysisResponse(BaseModel):
    timeline: List[ThrashingTimelinePoint]
    overall_status: str
    total_alerts: int
    thrashing_steps_count: int
    mean_working_set_size: float
    recommended_frame_count: int
    summary_message: str

# Multi-Process Schemas
class ProcessConfig(BaseModel):
    pid: str
    name: str
    reference_sequence: List[int]
    min_frames: int = Field(default=1, ge=1)

class MultiProcessRequest(BaseModel):
    processes: List[ProcessConfig]
    total_frames: int = Field(default=9, ge=3, le=64)
    allocation_policy: AllocationPolicy = AllocationPolicy.ADAPTIVE
    window_size: int = Field(default=6, ge=3, le=20)

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
