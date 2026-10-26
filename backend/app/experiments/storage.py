"""SQLite experiment persistence with standards-compliant CSV export."""
import csv
import io
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from app.models.schemas import ExperimentRecord, ExperimentSaveRequest

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATABASE_FILE = PROJECT_ROOT / "data" / "memora.db"

def _connect():
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_FILE, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL,
        hypothesis TEXT NOT NULL, configuration TEXT NOT NULL,
        results TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
    )""")
    return conn

def _row_to_record(row) -> ExperimentRecord:
    return ExperimentRecord(id=row["id"], name=row["name"], created_at=row["created_at"],
        hypothesis=row["hypothesis"], configuration=json.loads(row["configuration"]),
        results=json.loads(row["results"]), notes=row["notes"])

def save_experiment(req: ExperimentSaveRequest) -> ExperimentRecord:
    record = ExperimentRecord(id=uuid.uuid4().hex[:8], name=req.name,
        created_at=datetime.now(timezone.utc).isoformat(), hypothesis=req.hypothesis,
        configuration=req.configuration, results=req.results, notes=req.notes or "")
    with _connect() as conn:
        conn.execute("INSERT INTO experiments VALUES (?, ?, ?, ?, ?, ?, ?)",
            (record.id, record.name, record.created_at, record.hypothesis,
             json.dumps(record.configuration), json.dumps(record.results), record.notes))
    return record

def list_experiments() -> List[ExperimentRecord]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM experiments ORDER BY created_at DESC").fetchall()
    return [_row_to_record(row) for row in rows]

def get_experiment(exp_id: str) -> Optional[ExperimentRecord]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM experiments WHERE id = ?", (exp_id,)).fetchone()
    return _row_to_record(row) if row else None

def export_experiment_csv(record: ExperimentRecord) -> str:
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(["MEMORA Experiment Report", record.name])
    writer.writerow(["ID", record.id])
    writer.writerow(["Date", record.created_at])
    writer.writerow(["Hypothesis", record.hypothesis])
    writer.writerow([])
    summaries = record.results.get("summaries", [])
    if summaries:
        fields = ["algorithm", "num_frames", "total_references", "total_hits", "total_faults",
                  "hit_ratio", "fault_rate", "total_evictions", "prediction_accuracy",
                  "simulated_access_cost", "execution_time_ms"]
        writer.writerow(fields)
        for summary in summaries:
            writer.writerow([summary.get(field, "") for field in fields])
    sweep = record.results.get("frame_sweep", [])
    if sweep:
        writer.writerow([])
        writer.writerow(["Frame Count Sweep"])
        algorithms = list(sweep[0].get("faults", {}).keys())
        writer.writerow(["frames", *algorithms])
        for point in sweep:
            writer.writerow([point.get("num_frames"), *[point.get("faults", {}).get(a, "") for a in algorithms]])
    return output.getvalue()
