"""
Thrashing Analysis API Endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import ThrashingAnalysisRequest, ThrashingAnalysisResponse
from app.thrashing.detector import analyze_thrashing

router = APIRouter(prefix="/api", tags=["thrashing"])

@router.post("/thrashing/analyze", response_model=ThrashingAnalysisResponse)
def api_analyze_thrashing(req: ThrashingAnalysisRequest):
    try:
        return analyze_thrashing(req)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
