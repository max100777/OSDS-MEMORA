"""Trace import and measured what-if optimization endpoints."""
import csv
import io
import json
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    TraceUploadRequest, TraceUploadResponse, AccessType,
    OptimizationRequest, OptimizationResponse, OptimizationCandidate, SimulationRequest,
)
from app.simulation.engine import run_simulation

router = APIRouter(prefix="/api", tags=["optimization", "traces"])

@router.post("/traces/upload", response_model=TraceUploadResponse)
def upload_trace(req: TraceUploadRequest):
    try:
        sequences, operations, timestamps = {}, {}, {}
        if req.format == "json":
            payload = json.loads(req.content)
            rows = payload if isinstance(payload, list) else payload.get("references", [])
        else:
            rows = list(csv.DictReader(io.StringIO(req.content)))
        if len(rows) > 100_000:
            raise ValueError("Trace exceeds the 100,000-reference limit")
        for index, row in enumerate(rows):
            if isinstance(row, int):
                row = {"page": row}
            if not isinstance(row, dict) or "page" not in row:
                raise ValueError("Each reference must contain a page field")
            pid = str(row.get("process_id", "P1"))
            page = int(row["page"])
            if page < 0:
                raise ValueError("Page numbers must be non-negative")
            op = AccessType(str(row.get("operation", "read")).lower())
            sequences.setdefault(pid, []).append(page)
            operations.setdefault(pid, []).append(op)
            timestamps.setdefault(pid, []).append(float(row.get("timestamp", index)))
        total = sum(map(len, sequences.values()))
        if not total:
            raise ValueError("Trace contains no references")
        return TraceUploadResponse(sequences=sequences, operations=operations, timestamps=timestamps, total_references=total)
    except (ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=422, detail=str(exc))

@router.post("/experiments/optimize", response_model=OptimizationResponse)
def optimize(req: OptimizationRequest):
    frame_counts = sorted({f for f in req.candidate_frames if 1 <= f <= req.max_ram_budget})
    if not frame_counts:
        raise HTTPException(status_code=422, detail="No candidate frame count is within the RAM budget")
    candidates = []
    for frames in frame_counts:
        for algorithm in req.algorithms:
            result = run_simulation(SimulationRequest(reference_sequence=req.reference_sequence, num_frames=frames, algorithm=algorithm))
            candidates.append(OptimizationCandidate(algorithm=result.algorithm, frames=frames,
                fault_rate=result.fault_rate, hit_ratio=result.hit_ratio,
                simulated_access_cost=result.simulated_access_cost))
    viable = [c for c in candidates if c.fault_rate <= req.target_fault_rate]
    recommendation = min(viable, key=lambda c: (c.frames, c.fault_rate, c.simulated_access_cost)) if viable else None
    return OptimizationResponse(candidates=candidates, recommendation=recommendation,
        target_met=recommendation is not None,
        message=(f"{recommendation.algorithm} with {recommendation.frames} frames is the smallest measured configuration meeting the target."
                 if recommendation else "No candidate configuration met the target fault rate within the RAM budget."))
