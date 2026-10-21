"""
Unit Tests for Traditional Page Replacement Algorithms (FIFO, LRU, Optimal).
Includes Belady's Anomaly validation.
"""
import pytest
from app.simulation.fifo import FIFOSimulator
from app.simulation.lru import LRUSimulator
from app.simulation.optimal import OptimalSimulator
from app.simulation.engine import run_simulation
from app.models.schemas import SimulationRequest, AlgorithmType

def test_fifo_basic():
    # Sequence: [7, 0, 1, 2, 0, 3, 0, 4, 2, 3] with 3 frames
    seq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3]
    sim = FIFOSimulator(num_frames=3)
    trace = [sim.step(i, p) for i, p in enumerate(seq)]

    assert sim.faults > 0
    assert sim.hits > 0
    assert len(trace) == len(seq)
    assert sim.hits + sim.faults == len(seq)

def test_lru_basic():
    seq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]
    sim = LRUSimulator(num_frames=3)
    trace = [sim.step(i, p) for i, p in enumerate(seq)]

    # At step 4 (page 0), page 0 is resident -> Hit
    assert trace[4].is_hit is True
    assert sim.hits + sim.faults == len(seq)

def test_optimal_benchmark_fewer_faults_than_fifo_and_lru():
    seq = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]
    num_frames = 3

    fifo_res = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.FIFO))
    lru_res = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.LRU))
    opt_res = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.OPTIMAL))

    # Optimal must incur less than or equal faults compared to online algorithms
    assert opt_res.total_faults <= fifo_res.total_faults
    assert opt_res.total_faults <= lru_res.total_faults

def test_beladys_anomaly_fifo():
    """
    Belady's Anomaly: Increasing physical frames from 3 to 4 increases page faults in FIFO.
    Classic sequence: [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]
    - 3 frames: 9 page faults
    - 4 frames: 10 page faults
    """
    seq = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]

    res_3 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=3, algorithm=AlgorithmType.FIFO))
    res_4 = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=4, algorithm=AlgorithmType.FIFO))

    assert res_3.total_faults == 9, f"Expected 9 faults for 3 frames, got {res_3.total_faults}"
    assert res_4.total_faults == 10, f"Expected 10 faults for 4 frames, got {res_4.total_faults}"
    assert res_4.total_faults > res_3.total_faults, "Belady's Anomaly condition not met!"

def test_empty_sequence_and_single_frame():
    # Single frame should fault on every distinct page change
    seq = [1, 2, 1, 2]
    res = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=1, algorithm=AlgorithmType.LRU))
    assert res.total_faults == 4
    assert res.total_hits == 0
