import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.models.schemas import (
    AccessType, AlgorithmType, MultiProcessRequest, ProcessConfig, SimulationRequest,
)
from app.simulation.engine import run_simulation
from app.simulation.workload import classify_access_pattern

client = TestClient(app)

def test_dirty_page_table_and_cost_accounting():
    result = run_simulation(SimulationRequest(
        reference_sequence=[1, 2, 3], operations=[AccessType.WRITE, AccessType.READ, AccessType.READ],
        num_frames=2, algorithm=AlgorithmType.FIFO, memory_latency=1,
        disk_read_latency=10, disk_write_latency=20,
    ))
    assert result.dirty_writebacks == 1
    assert result.simulated_access_cost == 53
    assert result.trace[-1].dirty_writeback is True
    assert result.trace[0].page_table["1"]["dirty"] is True

def test_workload_classifier():
    assert classify_access_pattern([0, 1, 2, 3, 4, 5]) == "sequential"
    assert classify_access_pattern([1, 2, 1, 2, 1, 2, 1, 2]) == "repetitive"

def test_trace_upload_and_optimizer():
    upload = client.post("/api/traces/upload", json={
        "format": "csv", "content": "timestamp,process_id,page,operation\n0,P1,1,write\n1,P1,2,read\n"
    })
    assert upload.status_code == 200
    assert upload.json()["sequences"] == {"P1": [1, 2]}
    optimized = client.post("/api/experiments/optimize", json={
        "reference_sequence": [1, 2, 1, 2], "algorithms": ["lru"],
        "candidate_frames": [1, 2], "target_fault_rate": 0.5, "max_ram_budget": 2,
    })
    assert optimized.status_code == 200
    assert optimized.json()["recommendation"]["frames"] == 2

def test_stateful_session_step_and_reset():
    created = client.post("/api/simulations", json={"simulation": {
        "reference_sequence": [1, 2, 1], "num_frames": 2, "algorithm": "lru"
    }}).json()
    session_id = created["id"]
    stepped = client.post(f"/api/simulations/{session_id}/step").json()
    assert stepped["cursor"] == 1
    assert len(client.get(f"/api/simulations/{session_id}/events").json()) == 1
    reset = client.post(f"/api/simulations/{session_id}/reset").json()
    assert reset["cursor"] == 0

def test_invalid_process_constraints_are_rejected():
    with pytest.raises(ValidationError):
        MultiProcessRequest(total_frames=3, processes=[
            ProcessConfig(pid="P1", name="one", reference_sequence=[1], min_frames=2),
            ProcessConfig(pid="P1", name="two", reference_sequence=[2], min_frames=2),
        ])
