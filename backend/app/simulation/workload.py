"""
Workload Generator for Virtual Memory Simulation.
Generates realistic memory access patterns:
- Random
- Sequential
- Repeated-loop
- Locality-of-reference (80/20 rule)
- Phase-changing (multi-modal working set)
- Thrashing-prone (working set > frame capacity)
- Custom parsed strings
"""
import random
import re
import statistics
from typing import List, Tuple
from app.models.schemas import WorkloadType, WorkloadRequest, WorkloadResponse

def classify_access_pattern(sequence: List[int], window_size: int = 20) -> str:
    """Classify a recent trace using deterministic, documented window statistics."""
    window = sequence[-window_size:]
    if len(window) < 3:
        return "insufficient_history"
    transitions = [b - a for a, b in zip(window, window[1:])]
    sequential = sum(abs(d) == 1 for d in transitions) / len(transitions)
    repeats = 1.0 - (len(set(window)) / len(window))
    same_page = sum(d == 0 for d in transitions) / len(transitions)
    spatial = sum(abs(d) <= 2 for d in transitions) / len(transitions)
    frequencies = [window.count(p) for p in set(window)]
    concentration = max(frequencies) / len(window)
    if same_page >= 0.25 or repeats >= 0.70:
        return "repetitive"
    if sequential >= 0.75:
        return "sequential"
    if concentration >= 0.40:
        return "high_temporal_locality"
    if spatial >= 0.70:
        return "high_spatial_locality"
    if repeats < 0.20 and len(set(transitions)) > len(transitions) * 0.5:
        return "random_unpredictable"
    return "mixed"

def generate_workload(req: WorkloadRequest) -> WorkloadResponse:
    if req.seed is not None:
        random.seed(req.seed)

    w_type = req.workload_type
    length = req.length
    page_range = max(2, req.page_range)
    sequence: List[int] = []
    desc = ""

    if w_type == WorkloadType.CUSTOM:
        raw_str = req.custom_sequence or "7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2"
        # Extract all numbers from string
        numbers = [int(x) for x in re.findall(r'\d+', raw_str)]
        if not numbers:
            numbers = [7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2]
        sequence = numbers
        desc = f"Custom reference sequence ({len(sequence)} references, range 0-{max(sequence)})."
        return WorkloadResponse(
            sequence=sequence,
            length=len(sequence),
            page_range=max(sequence) + 1 if sequence else 0,
            workload_type=WorkloadType.CUSTOM.value,
            description=desc
        )

    elif w_type == WorkloadType.RANDOM:
        sequence = [random.randint(0, page_range - 1) for _ in range(length)]
        desc = f"Uniform random references across {page_range} pages. Zero temporal or spatial locality."

    elif w_type == WorkloadType.SEQUENTIAL:
        # Repeating linear scan across pages
        sequence = [(i % page_range) for i in range(length)]
        desc = f"Sequential forward scan across pages 0 to {page_range - 1}."

    elif w_type == WorkloadType.REPEATED_LOOP:
        loop_sz = min(page_range, max(2, req.loop_size or 4))
        loop = list(range(loop_sz))
        sequence = [loop[i % loop_sz] for i in range(length)]
        desc = f"Cyclic execution loop through {loop_sz} pages {loop}. Simulates tight nested loop."

    elif w_type == WorkloadType.LOCALITY:
        # 80/20 rule: 80% references to working set of size ~20% pages
        working_set_size = max(2, int(page_range * 0.25))
        working_set = list(range(working_set_size))
        all_pages = list(range(page_range))
        prob_local = req.locality_strength

        curr = 0
        for _ in range(length):
            if random.random() < prob_local:
                # Local access: pick from working set with high spatial proximity
                if random.random() < 0.6:
                    curr = (curr + random.choice([-1, 0, 1])) % working_set_size
                    page = working_set[curr]
                else:
                    page = random.choice(working_set)
            else:
                page = random.choice(all_pages)
            sequence.append(page)
        desc = (
            f"Locality-of-Reference workload ({int(prob_local*100)}% concentrated in hot set "
            f"of {working_set_size} pages out of {page_range})."
        )

    elif w_type == WorkloadType.PHASE_CHANGE:
        # Phase 1 uses pages [0..3], Phase 2 uses [4..7], Phase 3 uses [2..5]
        phases = [
            list(range(0, min(page_range, 4))),
            list(range(min(4, page_range - 1), min(page_range, 8))),
            list(range(min(2, page_range - 1), min(page_range, 6)))
        ]
        phase_duration = max(5, length // len(phases))
        for i in range(length):
            p_idx = min(len(phases) - 1, i // phase_duration)
            active_phase = phases[p_idx]
            if not active_phase:
                active_phase = list(range(page_range))
            page = random.choice(active_phase) if random.random() < 0.85 else random.randint(0, page_range - 1)
            sequence.append(page)
        desc = "Phase-changing execution: Working set shifts dynamically between distinct function modules."

    elif w_type == WorkloadType.THRASHING:
        # Working set significantly larger than typical frame count (e.g. 8-10 pages accessed cyclicly)
        # Guarantees that any cache smaller than working set continuously evicts and faults
        active_pages = list(range(page_range))
        # Cyclic scan with slight noise: classic cache-thrashing pattern
        for i in range(length):
            if random.random() < 0.8:
                page = active_pages[i % len(active_pages)]
            else:
                page = random.choice(active_pages)
            sequence.append(page)
        desc = (
            f"Thrashing-prone workload: Working set size ({page_range} pages) exceeds standard frame allocations. "
            f"Demonstrates high page-fault frequency collapse."
        )

    return WorkloadResponse(
        sequence=sequence,
        length=len(sequence),
        page_range=max(sequence) + 1 if sequence else page_range,
        workload_type=w_type.value,
        description=desc
    )
