"""
Least Recently Used (LRU) Page Replacement Algorithm.
Tracks recency of use for all resident pages. On capacity fault, evicts the page
with the smallest last-accessed timestamp (least recently used).
"""
from typing import List, Optional, Dict
from app.models.schemas import SimulationStepEvent

class LRUSimulator:
    def __init__(self, num_frames: int):
        self.num_frames = num_frames
        self.frames: List[Optional[int]] = [None] * num_frames
        self.last_used: Dict[int, int] = {}  # page -> step_idx
        self.hits = 0
        self.faults = 0
        self.evictions = 0

    def step(self, step_idx: int, page: int) -> SimulationStepEvent:
        frames_before = list(self.frames)
        evicted: Optional[int] = None
        reason: str
        is_hit: bool

        if page in self.frames:
            # Hit - update recency timestamp
            self.hits += 1
            is_hit = True
            prev_used = self.last_used.get(page, step_idx)
            self.last_used[page] = step_idx
            frame_idx = self.frames.index(page)
            reason = (
                f"Hit: Page {page} resident in Frame {frame_idx}. "
                f"Recency timestamp updated from t={prev_used} to t={step_idx}."
            )
        else:
            # Fault
            self.faults += 1
            is_hit = False

            if None in self.frames:
                empty_idx = self.frames.index(None)
                self.frames[empty_idx] = page
                self.last_used[page] = step_idx
                reason = f"Page Fault (Cold/Compulsory): Allocated free Frame {empty_idx} to Page {page} at t={step_idx}."
            else:
                # Find page among current frames with minimum last_used timestamp
                victim = min(self.frames, key=lambda p: self.last_used[p] if p is not None else -1)
                victim_last_time = self.last_used[victim]
                frame_idx = self.frames.index(victim)

                evicted = victim
                del self.last_used[victim]

                self.frames[frame_idx] = page
                self.last_used[page] = step_idx
                self.evictions += 1
                reason = (
                    f"Page Fault (Capacity): Evicted LRU Page {victim} from Frame {frame_idx} "
                    f"(last used at t={victim_last_time}). Loaded Page {page} at t={step_idx}."
                )

        total_refs = self.hits + self.faults
        hit_ratio = round(self.hits / total_refs, 4) if total_refs > 0 else 0.0
        fault_rate = round(self.faults / total_refs, 4) if total_refs > 0 else 0.0

        return SimulationStepEvent(
            step=step_idx,
            page=page,
            is_hit=is_hit,
            frames_before=frames_before,
            frames_after=list(self.frames),
            evicted_page=evicted,
            reason=reason,
            algorithm_used="LRU",
            cumulative_hits=self.hits,
            cumulative_faults=self.faults,
            hit_ratio=hit_ratio,
            fault_rate=fault_rate
        )
