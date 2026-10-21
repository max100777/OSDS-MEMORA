"""
Predictive Thrashing Detection & Working-Set Analysis.
Monitors Page-Fault Frequency (PFF), Working-Set Size WSS(t, Delta), and
memory allocation pressure. Distinguishes normal cold faults from pathological thrashing.
"""
from typing import List, Optional, Dict, Any
from app.models.schemas import (
    ThrashingAnalysisRequest,
    ThrashingAnalysisResponse,
    ThrashingTimelinePoint,
    SimulationRequest,
    AlgorithmType
)
from app.simulation.engine import run_simulation

def analyze_thrashing(req: ThrashingAnalysisRequest) -> ThrashingAnalysisResponse:
    seq = req.reference_sequence
    num_frames = req.num_frames
    w_size = req.window_size
    high_th = req.high_fault_threshold
    crit_th = req.critical_threshold

    # Run base simulation to obtain actual hit/fault trace
    sim_res = run_simulation(SimulationRequest(
        reference_sequence=seq,
        num_frames=num_frames,
        algorithm=req.algorithm
    ))

    timeline: List[ThrashingTimelinePoint] = []
    fault_window: List[int] = []
    ref_window: List[int] = []

    total_alerts = 0
    thrashing_steps = 0
    all_wss: List[int] = []

    for step_idx, ev in enumerate(sim_res.trace):
        page = ev.page
        is_hit = ev.is_hit

        # Update sliding window
        fault_window.append(0 if is_hit else 1)
        ref_window.append(page)
        if len(fault_window) > w_size:
            fault_window.pop(0)
        if len(ref_window) > w_size:
            ref_window.pop(0)

        # Working-set size: distinct pages referenced in last w_size steps
        wss = len(set(ref_window))
        all_wss.append(wss)
        rolling_fault_rate = round(sum(fault_window) / len(fault_window), 3)

        # Determine Memory Pressure State
        alert_msg: Optional[str] = None
        recommendation: Optional[str] = None

        if step_idx < 3:
            pressure = "Normal"
            alert_msg = None
        elif rolling_fault_rate >= crit_th and wss > num_frames:
            pressure = "Potential Thrashing"
            thrashing_steps += 1
            total_alerts += 1
            alert_msg = (
                f"Critical Thrashing Alert: Sustained fault rate {rolling_fault_rate*100:.0f}% "
                f"exceeds critical threshold ({crit_th*100:.0f}%). "
                f"Working-set demand ({wss} pages) strictly exceeds allocated frames ({num_frames})."
            )
            recommendation = (
                f"Immediate Action: Increase frame budget from {num_frames} to at least {wss} frames, "
                f"or suspend concurrent thread."
            )
        elif rolling_fault_rate >= high_th or wss > num_frames:
            pressure = "High"
            total_alerts += 1
            alert_msg = (
                f"High Memory Pressure: Rolling fault rate {rolling_fault_rate*100:.0f}%, "
                f"WSS={wss} vs {num_frames} frames."
            )
            recommendation = "Recommended Action: Consider switching to adaptive replacement or reallocating frames."
        elif rolling_fault_rate >= 0.35 or wss == num_frames:
            pressure = "Elevated"
        else:
            pressure = "Normal"

        timeline.append(ThrashingTimelinePoint(
            step=step_idx,
            page=page,
            is_hit=is_hit,
            rolling_fault_rate=rolling_fault_rate,
            working_set_size=wss,
            allocated_frames=num_frames,
            pressure_state=pressure,
            alert=alert_msg,
            recommendation=recommendation
        ))

    mean_wss = round(sum(all_wss) / len(all_wss), 2) if all_wss else float(num_frames)
    recommended_frames = max(int(round(mean_wss + 1)), num_frames) if thrashing_steps > 0 else num_frames

    if thrashing_steps > 0:
        overall = "Thrashing Detected"
        summary = (
            f"Thrashing confirmed in {thrashing_steps} steps. Working-set demand averaged {mean_wss} pages "
            f"against a static limit of {num_frames} frames. System throughput collapsed due to continuous I/O paging."
        )
    elif total_alerts > 0:
        overall = "Elevated Pressure"
        summary = (
            f"Transient memory pressure observed ({total_alerts} warnings). System operated near frame capacity "
            f"but avoided sustained thrashing collapse."
        )
    else:
        overall = "Healthy"
        summary = (
            f"Stable memory dynamics. Working-set demand ({mean_wss:.1f} pages) comfortably accommodated "
            f"within {num_frames} physical frames."
        )

    return ThrashingAnalysisResponse(
        timeline=timeline,
        overall_status=overall,
        total_alerts=total_alerts,
        thrashing_steps_count=thrashing_steps,
        mean_working_set_size=mean_wss,
        recommended_frame_count=recommended_frames,
        summary_message=summary
    )
