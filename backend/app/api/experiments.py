"""
Experiment Management & Export API Endpoints.
"""
from fastapi import APIRouter, HTTPException, Response
from typing import List
from app.models.schemas import ExperimentRecord, ExperimentSaveRequest
from app.experiments.storage import (
    save_experiment,
    list_experiments,
    get_experiment,
    export_experiment_csv
)

router = APIRouter(prefix="/api", tags=["experiments"])

@router.post("/experiments", response_model=ExperimentRecord)
def api_save_experiment(req: ExperimentSaveRequest):
    try:
        return save_experiment(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/experiments", response_model=List[ExperimentRecord])
def api_list_experiments():
    return list_experiments()

@router.get("/experiments/{experiment_id}", response_model=ExperimentRecord)
def api_get_experiment(experiment_id: str):
    record = get_experiment(experiment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    return record

@router.get("/experiments/{experiment_id}/export")
def api_export_experiment(experiment_id: str):
    record = get_experiment(experiment_id)
    if not record:
        raise HTTPException(status_code=404, detail="Experiment not found.")
    csv_content = export_experiment_csv(record)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=experiment_{experiment_id}.csv"}
    )
