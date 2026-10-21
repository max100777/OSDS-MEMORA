"""
Empirical Evaluation & Performance Audit across 4 Canonical Workload Types:
1. Sequential Scan
2. Repetitive / Repeated Loop
3. Uniform Random Access
4. Phase-Changing Access
Measures real prediction accuracy, page faults, and inference latency overhead.
"""
import time
import json
from typing import Dict, Any, List
from app.simulation.engine import run_simulation
from app.simulation.workload import generate_workload
from app.prediction.lstm import LSTMPredictor
from app.models.schemas import SimulationRequest, AlgorithmType, WorkloadRequest, WorkloadType

def evaluate_all():
    # Pre-train LSTM on a standard sequence so we evaluate genuine trained inference
    lstm = LSTMPredictor(model_dir="data")
    train_data = generate_workload(WorkloadRequest(
        workload_type=WorkloadType.LOCALITY,
        length=500,
        page_range=10,
        locality_strength=0.75,
        seed=42
    )).sequence
    lstm.train(sequence=train_data, seq_len=5, epochs=25, lr=0.01, hidden_dim=32)

    workload_configs = [
        ("Sequential Scan", WorkloadRequest(workload_type=WorkloadType.SEQUENTIAL, length=40, page_range=6, seed=101)),
        ("Repetitive Loop", WorkloadRequest(workload_type=WorkloadType.REPEATED_LOOP, length=40, page_range=6, loop_size=4, seed=102)),
        ("Uniform Random", WorkloadRequest(workload_type=WorkloadType.RANDOM, length=40, page_range=8, seed=103)),
        ("Phase-Changing", WorkloadRequest(workload_type=WorkloadType.PHASE_CHANGE, length=40, page_range=8, seed=104))
    ]

    num_frames = 3
    results = {}

    for name, w_req in workload_configs:
        wl = generate_workload(w_req)
        seq = wl.sequence
        w_res = {
            "sequence_length": len(seq),
            "num_frames": num_frames,
            "algorithms": {}
        }

        # 1. FIFO
        t0 = time.perf_counter()
        fifo = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.FIFO))
        fifo_time = (time.perf_counter() - t0) * 1000
        w_res["algorithms"]["FIFO"] = {
            "faults": fifo.total_faults,
            "hits": fifo.total_hits,
            "fault_rate": fifo.fault_rate,
            "hit_ratio": fifo.hit_ratio,
            "time_ms": round(fifo_time, 2)
        }

        # 2. LRU
        t0 = time.perf_counter()
        lru = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.LRU))
        lru_time = (time.perf_counter() - t0) * 1000
        w_res["algorithms"]["LRU"] = {
            "faults": lru.total_faults,
            "hits": lru.total_hits,
            "fault_rate": lru.fault_rate,
            "hit_ratio": lru.hit_ratio,
            "time_ms": round(lru_time, 2)
        }

        # 3. Optimal
        t0 = time.perf_counter()
        opt = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.OPTIMAL))
        opt_time = (time.perf_counter() - t0) * 1000
        w_res["algorithms"]["Optimal (Offline Benchmark)"] = {
            "faults": opt.total_faults,
            "hits": opt.total_hits,
            "fault_rate": opt.fault_rate,
            "hit_ratio": opt.hit_ratio,
            "time_ms": round(opt_time, 2)
        }

        # 4. Markov
        t0 = time.perf_counter()
        markov = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.MARKOV))
        markov_time = (time.perf_counter() - t0) * 1000
        w_res["algorithms"]["Markov Paging"] = {
            "faults": markov.total_faults,
            "hits": markov.total_hits,
            "fault_rate": markov.fault_rate,
            "hit_ratio": markov.hit_ratio,
            "prediction_accuracy": markov.prediction_accuracy,
            "time_ms": round(markov_time, 2),
            "overhead_per_ref_us": round((markov_time / len(seq)) * 1000, 1)
        }

        # 5. LSTM
        t0 = time.perf_counter()
        lstm_sim = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.LSTM), lstm)
        lstm_time = (time.perf_counter() - t0) * 1000
        w_res["algorithms"]["PyTorch LSTM Paging"] = {
            "faults": lstm_sim.total_faults,
            "hits": lstm_sim.total_hits,
            "fault_rate": lstm_sim.fault_rate,
            "hit_ratio": lstm_sim.hit_ratio,
            "prediction_accuracy": lstm_sim.prediction_accuracy,
            "time_ms": round(lstm_time, 2),
            "overhead_per_ref_us": round((lstm_time / len(seq)) * 1000, 1)
        }

        # 6. Adaptive Controller
        t0 = time.perf_counter()
        adaptive = run_simulation(SimulationRequest(reference_sequence=seq, num_frames=num_frames, algorithm=AlgorithmType.ADAPTIVE), lstm)
        adaptive_time = (time.perf_counter() - t0) * 1000
        # Count switches
        switches = [ev for ev in adaptive.trace if "switch_reason" in (ev.prediction_info or {}) and ev.prediction_info["switch_reason"]]
        w_res["algorithms"]["Adaptive Controller"] = {
            "faults": adaptive.total_faults,
            "hits": adaptive.total_hits,
            "fault_rate": adaptive.fault_rate,
            "hit_ratio": adaptive.hit_ratio,
            "strategy_switches": len(switches),
            "time_ms": round(adaptive_time, 2)
        }

        results[name] = w_res

    print(json.dumps(results, indent=2))
    return results

if __name__ == "__main__":
    evaluate_all()
