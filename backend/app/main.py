"""
MEMORA: Smart Virtual Memory Manager - FastAPI Backend.
OSDS Course Project.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import simulation, prediction, thrashing, multiprocess, experiments, advanced, sessions
import os

app = FastAPI(
    title="MEMORA — Smart Virtual Memory Manager API",
    description="Backend API for AI-Powered Predictive Paging, Adaptive Memory Allocation, and Thrashing Prevention.",
    version="1.0.0"
)

# Enable CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(simulation.router)
app.include_router(prediction.router)
app.include_router(thrashing.router)
app.include_router(multiprocess.router)
app.include_router(experiments.router)
app.include_router(advanced.router)
app.include_router(sessions.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "MEMORA Virtual Memory Manager",
        "version": "1.0.0",
        "models": {
            "markov": "active",
            "lstm": simulation.lstm_singleton.status
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
