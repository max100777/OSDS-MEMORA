"""
Simulation & Workload API Endpoints.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Optional
from app.models.schemas import (
    SimulationRequest,
    SimulationResult,
    ComparisonRequest,
    ComparisonResult,
    AlgorithmSummary,
    FrameSweepPoint,
    WorkloadRequest,
    WorkloadResponse,
    AlgorithmType
)
from app.simulation.engine import run_simulation
from app.simulation.workload import generate_workload
from app.prediction.lstm import LSTMPredictor

router = APIRouter(prefix="/api", tags=["simulation"])

# Shared global predictor instance
lstm_singleton = LSTMPredictor()

@router.post("/generate-workload", response_model=WorkloadResponse)
def api_generate_workload(req: WorkloadRequest):
    try:
        return generate_workload(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/simulate", response_model=SimulationResult)
def api_simulate(req: SimulationRequest):
    try:
        return run_simulation(req, lstm_singleton)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/compare", response_model=ComparisonResult)
def api_compare(req: ComparisonRequest):
    try:
        seq = req.reference_sequence
        num_frames = req.num_frames
        summaries: List[AlgorithmSummary] = []

        # Run primary comparison on requested num_frames
        for algo in req.algorithms:
            res = run_simulation(
                SimulationRequest(
                    reference_sequence=seq,
                    num_frames=num_frames,
                    algorithm=algo
                ),
                lstm_singleton
            )
            summaries.append(AlgorithmSummary(
                algorithm=res.algorithm,
                num_frames=res.num_frames,
                total_references=res.total_references,
                total_hits=res.total_hits,
                total_faults=res.total_faults,
                hit_ratio=res.hit_ratio,
                fault_rate=res.fault_rate,
                total_evictions=res.total_evictions,
                prediction_accuracy=res.prediction_accuracy,
                simulated_access_cost=res.simulated_access_cost,
                execution_time_ms=res.execution_time_ms
            ))

        # Frame sweep from 2 up to max_sweep if requested
        frame_sweep: Optional[List[FrameSweepPoint]] = None
        belady_detected = False
        belady_detail: Optional[str] = None
        fifo_faults_by_frame: Dict[int, int] = {}

        sweep_max = req.frame_sweep_max or 8
        frame_sweep = []
        for f in range(2, sweep_max + 1):
            f_faults = {}
            f_hit_ratios = {}
            for algo in req.algorithms:
                r = run_simulation(
                    SimulationRequest(
                        reference_sequence=seq,
                        num_frames=f,
                        algorithm=algo
                    ),
                    lstm_singleton
                )
                f_faults[r.algorithm] = r.total_faults
                f_hit_ratios[r.algorithm] = r.hit_ratio
                if algo == AlgorithmType.FIFO:
                    fifo_faults_by_frame[f] = r.total_faults

            frame_sweep.append(FrameSweepPoint(
                num_frames=f,
                faults=f_faults,
                hit_ratios=f_hit_ratios
            ))

        # Check for Belady's Anomaly in FIFO
        for f in sorted(fifo_faults_by_frame.keys()):
            if (f + 1) in fifo_faults_by_frame:
                if fifo_faults_by_frame[f + 1] > fifo_faults_by_frame[f]:
                    belady_detected = True
                    belady_detail = (
                        f"Belady's Anomaly observed! FIFO incurred {fifo_faults_by_frame[f]} faults at {f} frames, "
                        f"increasing to {fifo_faults_by_frame[f+1]} faults at {f+1} frames."
                    )
                    break

        # Recommended frames: frame count achieving >= 75% hit ratio under LRU or Optimal
        rec_frames = None
        target_met = None
        optimization_message = None
        target_hit_ratio = 1.0 - req.target_fault_rate if req.target_fault_rate is not None else None
        for pt in frame_sweep:
            if target_hit_ratio is not None:
                if any(rate >= target_hit_ratio for rate in pt.hit_ratios.values()):
                    rec_frames = pt.num_frames
                    target_met = True
                    break
            elif pt.hit_ratios.get("LRU", 0) >= 0.75 or pt.hit_ratios.get("OPTIMAL", 0) >= 0.80:
                rec_frames = pt.num_frames
                break
        if target_hit_ratio is not None:
            target_met = rec_frames is not None
            optimization_message = (f"Smallest tested configuration meeting the target: {rec_frames} frames."
                                    if target_met else "No tested frame count met the target fault rate.")

        return ComparisonResult(
            reference_sequence=seq,
            num_frames=num_frames,
            summaries=summaries,
            frame_sweep=frame_sweep,
            belady_detected=belady_detected,
            belady_detail=belady_detail,
            recommended_frames=rec_frames,
            target_met=target_met,
            optimization_message=optimization_message
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
