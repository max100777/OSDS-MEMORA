"""
AI Prediction API Endpoints (Markov and LSTM).
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    MarkovPredictRequest,
    MarkovPredictResponse,
    LSTMTrainRequest,
    LSTMTrainResponse,
    LSTMPredictRequest,
    LSTMPredictResponse,
    WorkloadRequest,
    WorkloadType
)
from app.prediction.markov import MarkovPredictor
from app.prediction.lstm import LSTMPredictor
from app.simulation.workload import generate_workload
from app.api.simulation import lstm_singleton

router = APIRouter(prefix="/api", tags=["prediction"])

@router.post("/predict/markov", response_model=MarkovPredictResponse)
def api_predict_markov(req: MarkovPredictRequest):
    try:
        markov = MarkovPredictor()
        history = req.history
        if len(history) > 1:
            markov.train_on_history(history)
        current = history[-1]
        return markov.predict_next(current_page=current, top_k=req.top_k)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/predict/lstm", response_model=LSTMPredictResponse)
def api_predict_lstm(req: LSTMPredictRequest):
    try:
        pred_dict = lstm_singleton.predict_next(req.history, top_k=req.top_k)
        return LSTMPredictResponse(**pred_dict)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/model/train", response_model=LSTMTrainResponse)
def api_train_model(req: LSTMTrainRequest):
    try:
        # Generate representative multi-pattern training workload
        train_wl = generate_workload(WorkloadRequest(
            workload_type=WorkloadType.LOCALITY,
            length=req.dataset_size,
            page_range=12,
            locality_strength=0.75,
            seed=42
        ))
        seq = train_wl.sequence

        res = lstm_singleton.train(
            sequence=seq,
            seq_len=req.sequence_length,
            hidden_dim=req.hidden_size,
            epochs=req.epochs,
            lr=req.lr
        )
        return LSTMTrainResponse(**res)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/model/status")
def api_model_status():
    return {
        "status": lstm_singleton.status,
        "vocab_size": lstm_singleton.vocab_size,
        "seq_len": lstm_singleton.seq_len,
        "last_training_metrics": lstm_singleton.last_training_metrics
    }
