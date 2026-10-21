"""
Local JSON-based storage for experiment tracking and historical reproducibility.
"""
import json
import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.models.schemas import ExperimentRecord, ExperimentSaveRequest

STORAGE_FILE = os.path.join("data", "experiments.json")

def _load_data() -> Dict[str, Any]:
    if not os.path.exists(STORAGE_FILE):
        return {}
    try:
        with open(STORAGE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}

def _save_data(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(STORAGE_FILE), exist_ok=True)
    with open(STORAGE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def save_experiment(req: ExperimentSaveRequest) -> ExperimentRecord:
    exp_id = str(uuid.uuid4())[:8]
    record = ExperimentRecord(
        id=exp_id,
        name=req.name,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        hypothesis=req.hypothesis,
        configuration=req.configuration,
        results=req.results,
        notes=req.notes or ""
    )
    data = _load_data()
    data[exp_id] = record.model_dump()
    _save_data(data)
    return record

def list_experiments() -> List[ExperimentRecord]:
    data = _load_data()
    records = [ExperimentRecord(**item) for item in data.values()]
    # Sort descending by creation
    return sorted(records, key=lambda r: r.created_at, reverse=True)

def get_experiment(exp_id: str) -> Optional[ExperimentRecord]:
    data = _load_data()
    if exp_id in data:
        return ExperimentRecord(**data[exp_id])
    return None

def export_experiment_csv(record: ExperimentRecord) -> str:
    """Export experiment results as CSV formatted string."""
    lines = [
        f"# MEMORA Experiment Report: {record.name}",
        f"# ID: {record.id} | Date: {record.created_at}",
        f"# Hypothesis: {record.hypothesis}",
        ""
    ]

    # Check if results contain algorithm summaries
    results = record.results
    if "summaries" in results:
        lines.append("Algorithm,Frames,References,Hits,Faults,Hit_Ratio,Fault_Rate,Evictions,Prediction_Accuracy")
        for s in results["summaries"]:
            acc = s.get("prediction_accuracy", "")
            lines.append(
                f"{s.get('algorithm')},{s.get('num_frames')},{s.get('total_references')},"
                f"{s.get('total_hits')},{s.get('total_faults')},{s.get('hit_ratio')},"
                f"{s.get('fault_rate')},{s.get('total_evictions')},{acc}"
            )

    if "frame_sweep" in results and results["frame_sweep"]:
        lines.append("")
        lines.append("# Frame Count Sweep Fault Metrics")
        headers = ["Frames"] + list(results["frame_sweep"][0].get("faults", {}).keys())
        lines.append(",".join(headers))
        for pt in results["frame_sweep"]:
            row = [str(pt["num_frames"])]
            for algo in headers[1:]:
                row.append(str(pt.get("faults", {}).get(algo, "")))
            lines.append(",".join(row))

    return "\n".join(lines)
