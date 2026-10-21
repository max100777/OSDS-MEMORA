"""
Multi-Process Memory Allocation API Endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import MultiProcessRequest, MultiProcessResponse
from app.multiprocess.allocator import run_multiprocess_simulation

router = APIRouter(prefix="/api", tags=["multiprocess"])

@router.post("/multiprocess/run", response_model=MultiProcessResponse)
def api_run_multiprocess(req: MultiProcessRequest):
    try:
        return run_multiprocess_simulation(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
