"""
First-In, First-Out (FIFO) Page Replacement Algorithm.
Maintains arrival order of resident pages. Evicts the page that entered memory earliest.
Hits do not alter insertion order.
"""
from typing import List, Optional, Tuple, Dict, Any
from app.models.schemas import SimulationStepEvent

class FIFOSimulator:
    def __init__(self, num_frames: int):
        self.num_frames = num_frames
        self.frames: List[Optional[int]] = [None] * num_frames
        self.arrival_queue: List[int] = []  # Tracks page arrival order
        self.hits = 0
        self.faults = 0
        self.evictions = 0

    def step(self, step_idx: int, page: int) -> SimulationStepEvent:
        frames_before = list(self.frames)
        evicted: Optional[int] = None
        reason: str
        is_hit: bool

        if page in self.frames:
            # Hit - in FIFO, hits do NOT alter arrival order
            self.hits += 1
            is_hit = True
            reason = f"Hit: Page {page} already present in Frame {self.frames.index(page)}. Arrival order preserved."
        else:
            # Fault
            self.faults += 1
            is_hit = False

            # Check if there is an empty frame
            if None in self.frames:
                empty_idx = self.frames.index(None)
                self.frames[empty_idx] = page
                self.arrival_queue.append(page)
                reason = f"Page Fault (Cold/Compulsory): Allocated free Frame {empty_idx} to Page {page}."
            else:
                # Evict earliest arrived page (head of arrival_queue)
                evicted = self.arrival_queue.pop(0)
                frame_idx = self.frames.index(evicted)
                self.frames[frame_idx] = page
                self.arrival_queue.append(page)
                self.evictions += 1
                reason = (
                    f"Page Fault (Capacity): Memory full. Evicted Page {evicted} "
                    f"from Frame {frame_idx} (entered earliest). Loaded Page {page}."
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
            algorithm_used="FIFO",
            cumulative_hits=self.hits,
            cumulative_faults=self.faults,
            hit_ratio=hit_ratio,
            fault_rate=fault_rate
        )
