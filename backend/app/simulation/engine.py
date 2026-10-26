"""
Unified Virtual Memory Simulation Engine.
Executes reference sequences deterministically, collects granular step events,
tracks prediction accuracy, and enforces strict causal boundaries (no future leakage).
"""
import time
import random
from typing import List, Optional, Dict, Any, Tuple
from app.models.schemas import (
    AlgorithmType,
    SimulationRequest,
    SimulationResult,
    SimulationStepEvent
)
from app.simulation.fifo import FIFOSimulator
from app.simulation.lru import LRUSimulator
from app.simulation.optimal import OptimalSimulator
from app.prediction.markov import MarkovPredictor
from app.prediction.lstm import LSTMPredictor
from app.adaptive.controller import AdaptivePagingController
from app.simulation.workload import classify_access_pattern

def run_simulation(
    req: SimulationRequest,
    lstm_predictor: Optional[LSTMPredictor] = None
) -> SimulationResult:
    start_time = time.time()
    sequence = req.reference_sequence
    num_frames = req.num_frames
    algo = req.algorithm

    if lstm_predictor is None:
        lstm_predictor = LSTMPredictor()

    if algo == AlgorithmType.FIFO:
        sim = FIFOSimulator(num_frames)
        trace = [sim.step(i, page) for i, page in enumerate(sequence)]
        accuracy = None

    elif algo == AlgorithmType.LRU:
        sim = LRUSimulator(num_frames)
        trace = [sim.step(i, page) for i, page in enumerate(sequence)]
        accuracy = None

    elif algo == AlgorithmType.OPTIMAL:
        sim = OptimalSimulator(num_frames, sequence)
        trace = [sim.step(i, page) for i, page in enumerate(sequence)]
        accuracy = None

    elif algo == AlgorithmType.MARKOV:
        trace, accuracy = _run_markov_simulation(sequence, num_frames)

    elif algo == AlgorithmType.LSTM:
        trace, accuracy = _run_lstm_simulation(sequence, num_frames, lstm_predictor)

    elif algo == AlgorithmType.ADAPTIVE:
        trace, accuracy = _run_adaptive_simulation(sequence, num_frames, lstm_predictor)

    else:
        raise ValueError(f"Unsupported algorithm: {algo}")

    # Add the explicit OS state/cost model without changing replacement semantics.
    rng = random.Random(req.seed)
    operations = list(req.operations or [])
    if operations and len(operations) != len(sequence):
        raise ValueError("operations must contain exactly one entry per reference")
    if not operations:
        from app.models.schemas import AccessType
        operations = [AccessType.WRITE if rng.random() < req.write_ratio else AccessType.READ for _ in sequence]
    dirty_pages: set[int] = set()
    cumulative_cost = 0.0
    dirty_writebacks = 0
    for idx, event in enumerate(trace):
        operation = operations[idx]
        writeback = event.evicted_page is not None and event.evicted_page in dirty_pages
        if writeback:
            dirty_pages.discard(event.evicted_page)
            dirty_writebacks += 1
        step_cost = req.memory_latency
        if not event.is_hit:
            step_cost += req.disk_read_latency
        if writeback:
            step_cost += req.disk_write_latency
        if operation.value == "write":
            dirty_pages.add(event.page)
        cumulative_cost += step_cost
        event.timestamp = idx
        event.process_id = req.process_id
        event.operation = operation
        event.dirty_writeback = writeback
        event.simulated_access_cost = round(step_cost, 4)
        event.cumulative_access_cost = round(cumulative_cost, 4)
        resident = {p for p in event.frames_after if p is not None}
        known_pages = set(sequence[: idx + 1]) | resident
        event.page_table = {
            str(p): {
                "present": p in resident,
                "valid": True,
                "frame": event.frames_after.index(p) if p in resident else None,
                "dirty": p in dirty_pages,
            }
            for p in sorted(known_pages)
        }
        if event.prediction_info:
            raw = event.prediction_info.get("top_candidates", [])
            event.candidate_scores = [dict(item) for item in raw]

    total_refs = len(sequence)
    total_hits = sum(1 for e in trace if e.is_hit)
    total_faults = total_refs - total_hits
    hit_ratio = round(total_hits / total_refs, 4) if total_refs > 0 else 0.0
    fault_rate = round(total_faults / total_refs, 4) if total_refs > 0 else 0.0
    total_evictions = sum(1 for e in trace if e.evicted_page is not None)
    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return SimulationResult(
        algorithm=algo.value.upper(),
        num_frames=num_frames,
        total_references=total_refs,
        total_hits=total_hits,
        total_faults=total_faults,
        hit_ratio=hit_ratio,
        fault_rate=fault_rate,
        total_evictions=total_evictions,
        trace=trace,
        prediction_accuracy=accuracy,
        execution_time_ms=elapsed_ms,
        simulated_access_cost=round(cumulative_cost, 4),
        dirty_writebacks=dirty_writebacks,
        workload_pattern=classify_access_pattern(sequence)
    )


def _run_markov_simulation(
    sequence: List[int],
    num_frames: int
) -> Tuple[List[SimulationStepEvent], float]:
    frames: List[Optional[int]] = [None] * num_frames
    last_used: Dict[int, int] = {}
    markov = MarkovPredictor()
    trace: List[SimulationStepEvent] = []

    hits = 0
    faults = 0
    predictions_attempted = 0
    correct_predictions = 0

    last_prediction: Optional[int] = None
    last_pred_info: Optional[Dict[str, Any]] = None

    for step_idx, page in enumerate(sequence):
        frames_before = list(frames)
        evicted: Optional[int] = None
        is_hit: bool
        reason: str

        # 1. Evaluate prediction made at previous step
        pred_match: Optional[bool] = None
        if last_prediction is not None:
            predictions_attempted += 1
            if last_prediction == page:
                correct_predictions += 1
                pred_match = True
            else:
                pred_match = False

        # 2. Check Hit vs Fault
        if page in frames:
            hits += 1
            is_hit = True
            last_used[page] = step_idx
            frame_idx = frames.index(page)
            reason = f"Hit: Page {page} already in Frame {frame_idx}."
        else:
            faults += 1
            is_hit = False

            if None in frames:
                empty_idx = frames.index(None)
                frames[empty_idx] = page
                last_used[page] = step_idx
                reason = f"Page Fault (Cold): Loaded Page {page} into free Frame {empty_idx}."
            else:
                # Predictive victim selection
                resident_pages = [p for p in frames if p is not None]
                victim, reason = markov.score_victims_for_replacement(
                    current_page=page,
                    resident_pages=resident_pages,
                    last_used_timestamps=last_used
                )
                frame_idx = frames.index(victim)
                evicted = victim
                del last_used[victim]
                frames[frame_idx] = page
                last_used[page] = step_idx

        # 3. Update Markov model with new transition (strictly historical)
        if step_idx > 0:
            markov.update(sequence[step_idx - 1], page)

        # 4. Predict NEXT page for upcoming reference
        pred_res = markov.predict_next(current_page=page, top_k=3)
        last_prediction = pred_res.predicted_next_page
        last_pred_info = {
            "predicted_next": pred_res.predicted_next_page,
            "confidence": pred_res.confidence,
            "top_candidates": [{"page": c.page, "prob": c.probability} for c in pred_res.top_candidates],
            "prev_pred_correct": pred_match
        }

        total_refs = hits + faults
        trace.append(SimulationStepEvent(
            step=step_idx,
            page=page,
            is_hit=is_hit,
            frames_before=frames_before,
            frames_after=list(frames),
            evicted_page=evicted,
            reason=reason,
            algorithm_used="Markov Paging",
            cumulative_hits=hits,
            cumulative_faults=faults,
            hit_ratio=round(hits / total_refs, 4),
            fault_rate=round(faults / total_refs, 4),
            prediction_info=last_pred_info
        ))

    accuracy = round(correct_predictions / predictions_attempted, 4) if predictions_attempted > 0 else 0.0
    return trace, accuracy


def _run_lstm_simulation(
    sequence: List[int],
    num_frames: int,
    lstm_predictor: LSTMPredictor
) -> Tuple[List[SimulationStepEvent], float]:
    frames: List[Optional[int]] = [None] * num_frames
    last_used: Dict[int, int] = {}
    history: List[int] = []
    trace: List[SimulationStepEvent] = []

    hits = 0
    faults = 0
    predictions_attempted = 0
    correct_predictions = 0

    last_prediction: Optional[int] = None
    last_pred_info: Optional[Dict[str, Any]] = None

    for step_idx, page in enumerate(sequence):
        frames_before = list(frames)
        evicted: Optional[int] = None
        is_hit: bool
        reason: str

        # 1. Evaluate previous step prediction
        pred_match: Optional[bool] = None
        if last_prediction is not None:
            predictions_attempted += 1
            if last_prediction == page:
                correct_predictions += 1
                pred_match = True
            else:
                pred_match = False

        # 2. Check Hit vs Fault
        if page in frames:
            hits += 1
            is_hit = True
            last_used[page] = step_idx
            frame_idx = frames.index(page)
            reason = f"Hit: Page {page} already in Frame {frame_idx}."
        else:
            faults += 1
            is_hit = False

            if None in frames:
                empty_idx = frames.index(None)
                frames[empty_idx] = page
                last_used[page] = step_idx
                reason = f"Page Fault (Cold): Loaded Page {page} into free Frame {empty_idx}."
            else:
                resident_pages = [p for p in frames if p is not None]
                victim, reason = lstm_predictor.score_victims_for_replacement(
                    history=history,
                    resident_pages=resident_pages,
                    last_used_timestamps=last_used
                )
                frame_idx = frames.index(victim)
                evicted = victim
                del last_used[victim]
                frames[frame_idx] = page
                last_used[page] = step_idx

        # 3. Add to history
        history.append(page)

        # 4. Predict NEXT page
        pred_res = lstm_predictor.predict_next(history=history, top_k=3)
        last_prediction = pred_res.get("predicted_next_page")
        last_pred_info = {
            "predicted_next": last_prediction,
            "confidence": pred_res.get("confidence", 0.0),
            "top_candidates": pred_res.get("top_candidates", []),
            "model_status": pred_res.get("model_status", "untrained"),
            "prev_pred_correct": pred_match
        }

        total_refs = hits + faults
        trace.append(SimulationStepEvent(
            step=step_idx,
            page=page,
            is_hit=is_hit,
            frames_before=frames_before,
            frames_after=list(frames),
            evicted_page=evicted,
            reason=reason,
            algorithm_used="LSTM Paging",
            cumulative_hits=hits,
            cumulative_faults=faults,
            hit_ratio=round(hits / total_refs, 4),
            fault_rate=round(faults / total_refs, 4),
            prediction_info=last_pred_info
        ))

    accuracy = round(correct_predictions / predictions_attempted, 4) if predictions_attempted > 0 else 0.0
    return trace, accuracy


def _run_adaptive_simulation(
    sequence: List[int],
    num_frames: int,
    lstm_predictor: LSTMPredictor
) -> Tuple[List[SimulationStepEvent], float]:
    frames: List[Optional[int]] = [None] * num_frames
    last_used: Dict[int, int] = {}
    history: List[int] = []
    markov = MarkovPredictor()
    controller = AdaptivePagingController(markov, lstm_predictor)
    trace: List[SimulationStepEvent] = []

    hits = 0
    faults = 0
    predictions_attempted = 0
    correct_predictions = 0

    last_prediction: Optional[int] = None
    last_pred_info: Optional[Dict[str, Any]] = None

    for step_idx, page in enumerate(sequence):
        frames_before = list(frames)
        evicted: Optional[int] = None
        is_hit: bool

        # 1. Evaluate previous prediction
        pred_match: Optional[bool] = None
        if last_prediction is not None:
            predictions_attempted += 1
            if last_prediction == page:
                correct_predictions += 1
                pred_match = True
            else:
                pred_match = False

        # 2. Adaptive controller decides active strategy
        active_strat, switch_reason = controller.evaluate_and_adapt(step_idx, history, page)

        # 3. Handle reference
        if page in frames:
            hits += 1
            is_hit = True
            last_used[page] = step_idx
            frame_idx = frames.index(page)
            reason = f"Hit: Page {page} in Frame {frame_idx} (Strategy: {active_strat})."
        else:
            faults += 1
            is_hit = False

            if None in frames:
                empty_idx = frames.index(None)
                frames[empty_idx] = page
                last_used[page] = step_idx
                reason = f"Page Fault (Cold): Allocated free Frame {empty_idx} to Page {page}."
            else:
                resident_pages = [p for p in frames if p is not None]
                if active_strat == "Markov":
                    victim, sub_reason = markov.score_victims_for_replacement(page, resident_pages, last_used)
                elif active_strat == "LSTM":
                    victim, sub_reason = lstm_predictor.score_victims_for_replacement(history, resident_pages, last_used)
                else:  # LRU default
                    victim = min(resident_pages, key=lambda p: last_used.get(p, -1))
                    sub_reason = f"LRU Baseline: Evicted Page {victim} (last accessed t={last_used.get(victim, 0)})."

                frame_idx = frames.index(victim)
                evicted = victim
                del last_used[victim]
                frames[frame_idx] = page
                last_used[page] = step_idx
                reason = f"Fault (Capacity) [Adaptive -> {active_strat}]: {sub_reason}"

        # 4. Inform controller of outcome
        controller.record_step_result(is_hit, pred_match)

        # 5. Update Markov & history
        if step_idx > 0:
            markov.update(sequence[step_idx - 1], page)
        history.append(page)

        # 6. Predict NEXT reference
        if active_strat == "Markov":
            p_res = markov.predict_next(page)
            last_prediction = p_res.predicted_next_page
            last_pred_info = {
                "strategy": active_strat,
                "predicted_next": last_prediction,
                "confidence": p_res.confidence,
                "top_candidates": [{"page": c.page, "prob": c.probability} for c in p_res.top_candidates],
                "switch_reason": switch_reason
            }
        elif active_strat == "LSTM":
            p_res = lstm_predictor.predict_next(history)
            last_prediction = p_res.get("predicted_next_page")
            last_pred_info = {
                "strategy": active_strat,
                "predicted_next": last_prediction,
                "confidence": p_res.get("confidence", 0.0),
                "top_candidates": p_res.get("top_candidates", []),
                "switch_reason": switch_reason
            }
        else:
            last_prediction = None
            last_pred_info = {
                "strategy": "LRU",
                "predicted_next": None,
                "confidence": 0.0,
                "top_candidates": [],
                "switch_reason": switch_reason
            }

        total_refs = hits + faults
        trace.append(SimulationStepEvent(
            step=step_idx,
            page=page,
            is_hit=is_hit,
            frames_before=frames_before,
            frames_after=list(frames),
            evicted_page=evicted,
            reason=reason,
            algorithm_used=f"Adaptive ({active_strat})",
            cumulative_hits=hits,
            cumulative_faults=faults,
            hit_ratio=round(hits / total_refs, 4),
            fault_rate=round(faults / total_refs, 4),
            prediction_info=last_pred_info
        ))

    accuracy = round(correct_predictions / predictions_attempted, 4) if predictions_attempted > 0 else 0.0
    return trace, accuracy
