"""
Multi-Process Virtual Memory Simulator & Dynamic Frame Allocator.
Simulates interleaved concurrent execution across multiple processes with:
- Equal allocation
- Proportional allocation
- Working-Set based allocation
- Page-Fault-Frequency (PFF) allocation
- Adaptive dynamic redistribution with hysteresis and budget conservation
"""
from typing import List, Dict, Optional, Tuple, Any
from app.models.schemas import (
    MultiProcessRequest,
    MultiProcessResponse,
    ProcessMetric,
    ProcessAllocationStep,
    AllocationPolicy
)

class SimulatedProcessState:
    def __init__(self, pid: str, name: str, sequence: List[int], min_frames: int):
        self.pid = pid
        self.name = name
        self.sequence = sequence
        self.min_frames = min_frames
        self.pc = 0  # program counter
        self.frames: List[Optional[int]] = []
        self.last_used: Dict[int, int] = {}
        self.recent_refs: List[int] = []
        self.recent_faults: List[int] = []
        self.hits = 0
        self.faults = 0

    @property
    def is_finished(self) -> bool:
        return self.pc >= len(self.sequence)

    @property
    def working_set_size(self) -> int:
        return len(set(self.recent_refs[-6:])) if self.recent_refs else 1

    @property
    def rolling_fault_rate(self) -> float:
        if not self.recent_faults:
            return 0.0
        return sum(self.recent_faults[-6:]) / len(self.recent_faults[-6:])

    def reference_step(self, step_idx: int) -> Tuple[int, bool]:
        """Execute one memory reference for this process."""
        page = self.sequence[self.pc]
        self.pc += 1

        self.recent_refs.append(page)
        if len(self.recent_refs) > 20:
            self.recent_refs.pop(0)

        # Hit check
        if page in self.frames:
            self.hits += 1
            self.last_used[page] = step_idx
            self.recent_faults.append(0)
            is_hit = True
        else:
            self.faults += 1
            self.recent_faults.append(1)
            is_hit = False

            if None in self.frames:
                idx = self.frames.index(None)
                self.frames[idx] = page
                self.last_used[page] = step_idx
            else:
                # Local LRU eviction within this process's allocated partition
                if self.frames:
                    victim = min(self.frames, key=lambda p: self.last_used.get(p, -1))
                    v_idx = self.frames.index(victim)
                    del self.last_used[victim]
                    self.frames[v_idx] = page
                    self.last_used[page] = step_idx

        if len(self.recent_faults) > 20:
            self.recent_faults.pop(0)

        return page, is_hit

    def resize_frames(self, new_capacity: int):
        """Expand or shrink allocated frames, evicting LRU if shrinking."""
        new_capacity = max(self.min_frames, new_capacity)
        curr = len(self.frames)
        if new_capacity > curr:
            self.frames.extend([None] * (new_capacity - curr))
        elif new_capacity < curr:
            # Must trim frames
            for _ in range(curr - new_capacity):
                if None in self.frames:
                    self.frames.remove(None)
                else:
                    # Evict LRU page
                    victim = min(self.frames, key=lambda p: self.last_used.get(p, -1))
                    self.frames.remove(victim)
                    if victim in self.last_used:
                        del self.last_used[victim]


def run_multiprocess_simulation(req: MultiProcessRequest) -> MultiProcessResponse:
    total_frames = req.total_frames
    policy = req.allocation_policy
    n_procs = len(req.processes)

    if n_procs == 0:
        raise ValueError("Must provide at least one process.")

    # Initialize processes
    procs: Dict[str, SimulatedProcessState] = {
        p.pid: SimulatedProcessState(p.pid, p.name, p.reference_sequence, p.min_frames)
        for p in req.processes
    }

    # Initial frame allocation based on policy
    allocations = _initial_allocation(req, procs, total_frames)
    for pid, count in allocations.items():
        procs[pid].resize_frames(count)

    # Simulation execution (round-robin interleaving)
    max_steps = max(len(p.reference_sequence) for p in req.processes) * n_procs
    active_pids = list(procs.keys())

    allocation_steps: List[ProcessAllocationStep] = []
    global_step = 0
    round_idx = 0

    while any(not p.is_finished for p in procs.values()) and global_step < max_steps:
        for pid in active_pids:
            proc = procs[pid]
            if proc.is_finished:
                continue

            ref_page, is_hit = proc.reference_step(global_step)
            transfers: List[str] = []

            # Dynamic reallocation check every window_size rounds
            if policy in [AllocationPolicy.ADAPTIVE, AllocationPolicy.PFF, AllocationPolicy.WORKING_SET]:
                if global_step > 0 and global_step % (req.window_size * n_procs) == 0:
                    transfers = _rebalance_frames(procs, total_frames, policy)

            allocation_steps.append(ProcessAllocationStep(
                step=global_step,
                active_pid=pid,
                referenced_page=ref_page,
                is_hit=is_hit,
                allocations={p_id: len(p.frames) for p_id, p in procs.items()},
                working_sets={p_id: p.working_set_size for p_id, p in procs.items()},
                transfers=transfers
            ))
            global_step += 1

    # Aggregate metrics
    metrics: List[ProcessMetric] = []
    hit_ratios: List[float] = []
    total_hits = 0
    total_faults = 0

    for pid, proc in procs.items():
        tot_refs = proc.hits + proc.faults
        hr = round(proc.hits / tot_refs, 4) if tot_refs > 0 else 0.0
        fr = round(proc.faults / tot_refs, 4) if tot_refs > 0 else 0.0
        total_hits += proc.hits
        total_faults += proc.faults
        hit_ratios.append(hr)

        # Classify pressure
        if fr > 0.6 and proc.working_set_size > len(proc.frames):
            pressure = "Thrashing"
        elif fr > 0.4:
            pressure = "Elevated"
        else:
            pressure = "Normal"

        metrics.append(ProcessMetric(
            pid=pid,
            name=proc.name,
            total_references=tot_refs,
            hits=proc.hits,
            faults=proc.faults,
            hit_ratio=hr,
            fault_rate=fr,
            allocated_frames=len(proc.frames),
            working_set_size=proc.working_set_size,
            memory_pressure=pressure
        ))

    # Jain's Fairness Index: (sum(x_i))^2 / (n * sum(x_i^2))
    sum_hr = sum(hit_ratios)
    sum_sq_hr = sum(x * x for x in hit_ratios)
    if n_procs > 0 and sum_sq_hr > 0:
        jain_index = round((sum_hr * sum_hr) / (n_procs * sum_sq_hr), 4)
    else:
        jain_index = 1.0

    global_tot = total_hits + total_faults
    global_fr = round(total_faults / global_tot, 4) if global_tot > 0 else 0.0

    # Verify frame budget conservation
    sum_allocated = sum(len(p.frames) for p in procs.values())
    budget_conserved = (sum_allocated == total_frames)

    return MultiProcessResponse(
        total_frames=total_frames,
        allocation_policy=policy.value,
        process_metrics=metrics,
        allocation_steps=allocation_steps,
        jains_fairness_index=jain_index,
        total_faults=total_faults,
        total_hits=total_hits,
        global_fault_rate=global_fr,
        budget_conserved=budget_conserved
    )


def _initial_allocation(
    req: MultiProcessRequest,
    procs: Dict[str, SimulatedProcessState],
    total_frames: int
) -> Dict[str, int]:
    n = len(procs)
    pids = list(procs.keys())

    if req.allocation_policy == AllocationPolicy.PROPORTIONAL:
        total_len = sum(len(p.reference_sequence) for p in req.processes)
        allocs = {}
        remaining = total_frames
        for pid in pids:
            p_len = len(procs[pid].sequence)
            share = max(procs[pid].min_frames, int(round((p_len / total_len) * total_frames)))
            allocs[pid] = share
            remaining -= share
        # Adjust remainder
        while remaining != 0:
            for pid in pids:
                if remaining > 0:
                    allocs[pid] += 1
                    remaining -= 1
                elif remaining < 0 and allocs[pid] > procs[pid].min_frames:
                    allocs[pid] -= 1
                    remaining += 1
                if remaining == 0:
                    break
        return allocs
    else:
        # Default / Equal: equal division
        base = total_frames // n
        rem = total_frames % n
        allocs = {pid: base for pid in pids}
        for i in range(rem):
            allocs[pids[i]] += 1
        return allocs


def _rebalance_frames(
    procs: Dict[str, SimulatedProcessState],
    total_frames: int,
    policy: AllocationPolicy
) -> List[str]:
    """Dynamically transfer a frame from a low-pressure process to a high-pressure process."""
    transfers: List[str] = []

    # Find donor (lowest fault rate, frames > min_frames)
    donors = [p for p in procs.values() if len(p.frames) > p.min_frames and p.rolling_fault_rate < 0.3]
    # Find recipient (highest fault rate or working set > frames)
    recipients = [p for p in procs.values() if p.rolling_fault_rate > 0.5 or p.working_set_size > len(p.frames)]

    if donors and recipients:
        donor = min(donors, key=lambda p: p.rolling_fault_rate)
        recipient = max(recipients, key=lambda p: p.rolling_fault_rate)

        if donor.pid != recipient.pid:
            # Transfer 1 frame
            donor.resize_frames(len(donor.frames) - 1)
            recipient.resize_frames(len(recipient.frames) + 1)
            msg = (
                f"Reallocated 1 frame from {donor.name} (PFF {donor.rolling_fault_rate:.2f}) "
                f"to {recipient.name} (PFF {recipient.rolling_fault_rate:.2f}, WSS {recipient.working_set_size})."
            )
            transfers.append(msg)

    return transfers
