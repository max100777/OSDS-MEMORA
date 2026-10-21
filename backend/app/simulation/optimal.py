"""
Optimal (MIN / Belady's Optimal) Page Replacement Algorithm.
Theoretical offline benchmark requiring future knowledge of all upcoming page references.
On capacity fault, evicts the resident page that will NOT be used for the longest period of time
(or never used again).
"""
from typing import List, Optional, Dict
from app.models.schemas import SimulationStepEvent

class OptimalSimulator:
    def __init__(self, num_frames: int, full_sequence: List[int]):
        self.num_frames = num_frames
        self.full_sequence = full_sequence
        self.frames: List[Optional[int]] = [None] * num_frames
        self.hits = 0
        self.faults = 0
        self.evictions = 0

    def step(self, step_idx: int, page: int) -> SimulationStepEvent:
        frames_before = list(self.frames)
        evicted: Optional[int] = None
        reason: str
        is_hit: bool

        if page in self.frames:
            self.hits += 1
            is_hit = True
            frame_idx = self.frames.index(page)
            reason = f"Hit: Page {page} already resident in Frame {frame_idx}."
        else:
            self.faults += 1
            is_hit = False

            if None in self.frames:
                empty_idx = self.frames.index(None)
                self.frames[empty_idx] = page
                reason = f"Page Fault (Cold/Compulsory): Allocated free Frame {empty_idx} to Page {page}."
            else:
                # Oracle lookahead: scan upcoming references starting after step_idx
                future_refs = self.full_sequence[step_idx + 1:]
                
                # For each resident page, find index of its next occurrence in future_refs
                farthest_distance = -1
                victim = None
                victim_next_use_str = ""

                for resident in self.frames:
                    if resident is None:
                        continue
                    try:
                        next_idx = future_refs.index(resident)
                        distance = next_idx + 1
                    except ValueError:
                        # Resident page is NEVER referenced again in the future
                        distance = float('inf')

                    if distance > farthest_distance:
                        farthest_distance = distance
                        victim = resident
                        if distance == float('inf'):
                            victim_next_use_str = "never again"
                        else:
                            victim_next_use_str = f"in {distance} steps (at t={step_idx + 1 + next_idx})"

                frame_idx = self.frames.index(victim)
                evicted = victim
                self.frames[frame_idx] = page
                self.evictions += 1
                reason = (
                    f"Page Fault (Capacity): [Optimal Oracle] Evicted Page {victim} from Frame {frame_idx} "
                    f"(next referenced: {victim_next_use_str}). Loaded Page {page}."
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
            algorithm_used="Optimal (Theoretical Benchmark)",
            cumulative_hits=self.hits,
            cumulative_faults=self.faults,
            hit_ratio=hit_ratio,
            fault_rate=fault_rate
        )
