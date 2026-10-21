"""
Unit tests for Adaptive Paging, Thrashing Detector, and Multi-Process Allocator.
"""
import pytest
from app.simulation.engine import run_simulation
from app.models.schemas import (
    SimulationRequest,
    AlgorithmType,
    ThrashingAnalysisRequest,
    MultiProcessRequest,
    ProcessConfig,
    AllocationPolicy
)
from app.thrashing.detector import analyze_thrashing
from app.multiprocess.allocator import run_multiprocess_simulation

def test_adaptive_paging_runs_and_adapts():
    # Test adaptive replacement runs without crashing and maintains valid frame counts
    seq = [0, 1, 2, 3, 0, 1, 4, 0, 1, 2, 3, 4] * 3
    res = run_simulation(SimulationRequest(
        reference_sequence=seq,
        num_frames=3,
        algorithm=AlgorithmType.ADAPTIVE
    ))

    assert res.total_references == len(seq)
    assert res.total_hits + res.total_faults == len(seq)
    assert len(res.trace) == len(seq)

def test_thrashing_detector_flags_pathological_workload():
    # Thrashing workload: sequence cycling across 10 pages with only 2 frames
    seq = [i % 10 for i in range(40)]
    resp = analyze_thrashing(ThrashingAnalysisRequest(
        reference_sequence=seq,
        num_frames=2,
        window_size=8,
        critical_threshold=0.75
    ))

    assert resp.overall_status in ["Thrashing Detected", "Elevated Pressure"]
    assert resp.total_alerts > 0
    assert resp.mean_working_set_size > 2

def test_multiprocess_budget_conservation():
    # 3 processes, total frames = 9. Must NEVER exceed 9 frames sum.
    p1 = ProcessConfig(pid="P1", name="DB Worker", reference_sequence=[1, 2, 3, 1, 2, 4, 1, 2] * 3)
    p2 = ProcessConfig(pid="P2", name="Web Thread", reference_sequence=[5, 6, 7, 8, 5, 6, 7, 8] * 3)
    p3 = ProcessConfig(pid="P3", name="Batch Worker", reference_sequence=[0, 1, 2, 3, 4, 5, 6, 7] * 3)

    total_budget = 9
    resp = run_multiprocess_simulation(MultiProcessRequest(
        processes=[p1, p2, p3],
        total_frames=total_budget,
        allocation_policy=AllocationPolicy.ADAPTIVE
    ))

    assert resp.budget_conserved is True
    # Verify at every step that sum of allocated frames equals total_budget
    for step in resp.allocation_steps:
        alloc_sum = sum(step.allocations.values())
        assert alloc_sum == total_budget, f"Budget violated at step {step.step}: {alloc_sum} != {total_budget}"

    # Verify Jain's fairness index is in [0, 1]
    assert 0.0 <= resp.jains_fairness_index <= 1.0
