"""Stateful simulation sessions and WebSocket event delivery."""
from __future__ import annotations
import asyncio
import uuid
from dataclasses import dataclass
from threading import RLock
from typing import Dict
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from app.models.schemas import SimulationSessionCreate, SimulationSessionState
from app.simulation.engine import run_simulation

router = APIRouter(tags=["live simulations"])

@dataclass
class Session:
    result: object
    cursor: int = 0
    status: str = "paused"

_sessions: Dict[str, Session] = {}
_lock = RLock()

def _state(session_id: str) -> SimulationSessionState:
    session = _sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Simulation session not found")
    current = session.result.trace[session.cursor - 1] if session.cursor else None
    return SimulationSessionState(id=session_id, status=session.status, cursor=session.cursor,
        total_steps=len(session.result.trace), current_event=current, result=session.result)

@router.post("/api/simulations", response_model=SimulationSessionState)
def create_session(req: SimulationSessionCreate):
    session_id = uuid.uuid4().hex[:12]
    with _lock:
        _sessions[session_id] = Session(run_simulation(req.simulation))
    return _state(session_id)

@router.post("/api/simulations/{session_id}/step", response_model=SimulationSessionState)
def step_session(session_id: str):
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Simulation session not found")
        if session.cursor < len(session.result.trace):
            session.cursor += 1
        session.status = "completed" if session.cursor == len(session.result.trace) else "paused"
    return _state(session_id)

@router.post("/api/simulations/{session_id}/run", response_model=SimulationSessionState)
def run_session(session_id: str):
    with _lock:
        session = _sessions.get(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Simulation session not found")
        session.cursor = len(session.result.trace)
        session.status = "completed"
    return _state(session_id)

@router.post("/api/simulations/{session_id}/pause", response_model=SimulationSessionState)
def pause_session(session_id: str):
    with _lock:
        if session_id not in _sessions:
            raise HTTPException(status_code=404, detail="Simulation session not found")
        _sessions[session_id].status = "paused"
    return _state(session_id)

@router.post("/api/simulations/{session_id}/reset", response_model=SimulationSessionState)
def reset_session(session_id: str):
    with _lock:
        if session_id not in _sessions:
            raise HTTPException(status_code=404, detail="Simulation session not found")
        _sessions[session_id].cursor = 0
        _sessions[session_id].status = "paused"
    return _state(session_id)

@router.get("/api/simulations/{session_id}/state", response_model=SimulationSessionState)
def get_state(session_id: str):
    return _state(session_id)

@router.get("/api/simulations/{session_id}/events")
def get_events(session_id: str):
    state = _state(session_id)
    return state.result.trace[:state.cursor]

@router.websocket("/ws/simulations/{session_id}")
async def simulation_stream(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in _sessions:
        await websocket.send_json({"error": "Simulation session not found"})
        await websocket.close(code=4404)
        return
    try:
        while True:
            command = await websocket.receive_json()
            action = command.get("action", "step")
            if action == "reset":
                reset_session(session_id)
            elif action == "run":
                delay = max(0.0, min(float(command.get("delay_ms", 250)) / 1000, 5.0))
                session = _sessions[session_id]
                session.status = "running"
                while session.cursor < len(session.result.trace) and session.status == "running":
                    session.cursor += 1
                    await websocket.send_json(_state(session_id).model_dump(mode="json"))
                    await asyncio.sleep(delay)
                if session.cursor == len(session.result.trace):
                    session.status = "completed"
            elif action == "pause":
                pause_session(session_id)
            else:
                step_session(session_id)
            await websocket.send_json(_state(session_id).model_dump(mode="json"))
    except WebSocketDisconnect:
        return
