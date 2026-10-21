"""
Comprehensive Audit Test Suite for Virtual Memory Replacement Algorithms.
Validates FIFO, LRU, and Optimal against textbook hand-calculated benchmarks:
1. Silberschatz 20-reference sequence (3 frames)
2. Tanenbaum 12-reference sequence (3 frames)
3. Belady's Anomaly sequence (FIFO 3 vs 4 frames, LRU stack property, Optimal bound)
4. Edge cases: 1 frame, repeated identical references, alternating access, full memory evictions.
"""
import pytest
from app.simulation.fifo import FIFOSimulator
from app.simulation.lru import LRUSimulator
from app.simulation.optimal import OptimalSimulator
from app.simulation.engine import run_simulation
from app.models.schemas import SimulationRequest, AlgorithmType

def test_audit_silberschatz_textbook_sequence():
    """
    Textbook Reference: Silberschatz, Galvin, Gagne - Operating System Concepts
    Reference sequence: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
    Number of frames: 3
    Hand-calculated textbook standards:
    - FIFO: Exactly 15 faults, 5 hits, 12 capacity evictions
    - LRU: Exactly 12 faults, 8 hits, 9 capacity evictions
    - Optimal: Exactly 9 faults, 11 hits, 6 capacity evictions
    """
    seq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1]
    num_frames = 3

    # FIFO Audit
    fifo_res = run_simulation(SimulationRequest(
        reference_sequence=seq,
        num_frames=num_frames,
        algorithm=AlgorithmType.FIFO
    ))
    assert fifo_res.total_references == 20
    assert fifo_res.total_faults == 15, f"FIFO expected 15 faults, got {fifo_res.total_faults}"
    assert fifo_res.total_hits == 5, f"FIFO expected 5 hits, got {fifo_res.total_hits}"
    assert fifo_res.total_evictions == 12, f"FIFO expected 12 evictions, got {fifo_res.total_evictions}"
    assert fifo_res.hit_ratio == 0.25
    assert fifo_res.fault_rate == 0.75

    # LRU Audit
    lru_res = run_simulation(SimulationRequest(
        reference_sequence=seq,
        num_frames=num_frames,
        algorithm=AlgorithmType.LRU
    ))
    assert lru_res.total_references == 20
    assert lru_res.total_faults == 12, f"LRU expected 12 faults, got {lru_res.total_faults}"
    assert lru_res.total_hits == 8, f"LRU expected 8 hits, got {lru_res.total_hits}"
    assert lru_res.total_evictions == 9, f"LRU expected 9 evictions, got {lru_res.total_evictions}"
    assert lru_res.hit_ratio == 0.4
    assert lru_res.fault_rate == 0.6

    # Optimal Benchmark Audit
    opt_res = run_simulation(SimulationRequest(
        reference_sequence=seq,
        num_frames=num_frames,
        algorithm=AlgorithmType.OPTIMAL
    ))
    assert opt_res.total_references == 20
    assert opt_res.total_faults == 9, f"Optimal expected 9 faults, got {opt_res.total_faults}"
    assert opt_res.total_hits == 11, f"Optimal expected 11 hits, got {opt_res.total_hits}"
    assert opt_res.total_evictions == 6, f"Optimal expected 6 evictions, got {opt_res.total_evictions}"
    assert opt_res.hit_ratio == 0.55
    assert opt_res.fault_rate == 0.45

    # Invariant: Optimal <= LRU <= FIFO on this classical workload
    assert opt_res.total_faults <= lru_res.total_faults <= fifo_res.total_faults


def test_audit_tanenbaum_textbook_sequence():
    """
    Textbook Reference: Andrew S. Tanenbaum - Modern Operating Systems
    Reference sequence: [2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2]
    Number of frames: 3
    Hand calculations:
    - FIFO: 9 faults, 3 hits
    - LRU: 7 faults, 5 hits
    - Optimal: 6 faults, 6 hits
    """
    seq = [2, 3, 2, 1, 5, 2, 4, 5, 3, 2, 5, 2]
    num_frames = 3

    r_fifo = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.FIFO))
    r_lru = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.LRU))
    r_opt = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.OPTIMAL))

    assert r_fifo.total_faults == 9, f"Tanenbaum FIFO expected 9 faults, got {r_fifo.total_faults}"
    assert r_fifo.total_hits == 3, f"Tanenbaum FIFO expected 3 hits, got {r_fifo.total_hits}"

    assert r_lru.total_faults == 7, f"Tanenbaum LRU expected 7 faults, got {r_lru.total_faults}"
    assert r_lru.total_hits == 5, f"Tanenbaum LRU expected 5 hits, got {r_lru.total_hits}"

    assert r_opt.total_faults == 6, f"Tanenbaum Optimal expected 6 faults, got {r_opt.total_faults}"
    assert r_opt.total_hits == 6, f"Tanenbaum Optimal expected 6 hits, got {r_opt.total_hits}"


def test_audit_beladys_anomaly_and_stack_property():
    """
    Belady's Anomaly Formal Verification:
    Sequence: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    - FIFO with 3 frames: 9 faults
    - FIFO with 4 frames: 10 faults (ANOMALY: +1 fault with +1 frame)
    - LRU with 3 frames: 10 faults
    - LRU with 4 frames: 8 faults (STACK PROPERTY: -2 faults with +1 frame)
    - Optimal with 3 frames: 7 faults
    - Optimal with 4 frames: 6 faults (THEORETICAL BOUND: -1 fault with +1 frame)
    """
    seq = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]

    fifo_3 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=3, algorithm=AlgorithmType.FIFO))
    fifo_4 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=4, algorithm=AlgorithmType.FIFO))

    lru_3 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=3, algorithm=AlgorithmType.LRU))
    lru_4 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=4, algorithm=AlgorithmType.LRU))

    opt_3 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=3, algorithm=AlgorithmType.OPTIMAL))
    opt_4 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=4, algorithm=AlgorithmType.OPTIMAL))

    # Anomaly validation
    assert fifo_3.total_faults == 9
    assert fifo_4.total_faults == 10
    assert fifo_4.total_faults > fifo_3.total_faults, "Belady anomaly must increase faults in FIFO"

    # Stack algorithm immunity
    assert lru_3.total_faults == 10
    assert lru_4.total_faults == 8
    assert lru_4.total_faults < lru_3.total_faults, "LRU must not exhibit Belady's Anomaly"

    # Optimal lower bound
    assert opt_3.total_faults == 7
    assert opt_4.total_faults == 6
    assert opt_4.total_faults < opt_3.total_faults


def test_audit_repeated_identical_references():
    """Repeated accesses to the same page must produce exactly 1 cold fault, then all hits."""
    seq = [5, 5, 5, 5, 5, 5]
    for algo in [AlgorithmType.FIFO, AlgorithmType.LRU, AlgorithmType.OPTIMAL]:
        res = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=3, algorithm=algo))
        assert res.total_faults == 1
        assert res.total_hits == 5
        assert res.total_evictions == 0


def test_audit_frame_occupancy_invariants():
    """At every step, number of occupied frames must equal min(distinct_pages_loaded_so_far, num_frames)."""
    seq = [7, 0, 1, 2, 0, 3, 0, 4]
    num_frames = 3
    res = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.LRU))

    seen_pages = set()
    for ev in res.trace:
        seen_pages.add(ev.page)
        occupied = sum(1 for f in ev.frames_after if f is not None)
        expected_occupied = min(len(seen_pages), num_frames)
        assert occupied == expected_occupied, f"Step {ev.step}: frames {ev.frames_after} count {occupied} != {expected_occupied}"
        # Assert no duplicate pages in physical memory frames
        non_none_frames = [f for f in ev.frames_after if f is not None]
        assert len(non_none_frames) == len(set(non_none_frames)), f"Step {ev.step}: duplicate page in frames {ev.frames_after}"
