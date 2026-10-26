# MEMORA Technical Report

## Problem and objective

MEMORA is a local educational simulator for studying replacement, prediction, thrashing, and fixed-budget allocation. It keeps offline Optimal separate from causal online policies and derives every displayed metric from event traces.

## Execution flow

```text
workload -> validated API -> simulation dispatcher -> replacement policy
         -> page-table/cost events -> analytics -> React visualization
                                  -> experiment database/export
```

## Algorithms and structures

- FIFO uses a frame list and arrival queue: `O(F)` membership/victim work per reference.
- LRU uses page-to-timestamp dictionaries: current implementation uses `O(F)` victim selection.
- Optimal scans future references and is an offline `O(NF)` teaching benchmark.
- Markov uses sparse nested transition dictionaries and incremental counts.
- LSTM uses `Embedding -> LSTM -> Linear -> Softmax` over historical windows.
- Working sets use bounded sliding windows; multi-process execution uses deterministic round robin and local replacement.

## Adaptive methodology

The controller observes only past/current information. It uses a minimum warmup, rolling fault and prediction windows, confidence thresholds, deterministic LRU fallback, and a five-reference switching cooldown. Adaptive performance is reported rather than assumed.

## Thrashing methodology

Pressure combines rolling PFF and `WSS(t, delta)` against frame capacity. Health is
`100 * (1 - 0.65*PFF - 0.25*capacity_pressure - 0.10*positive_fault_trend)`, clamped to 0–100. Recommendations do not change capacity automatically.

## Reproducibility and limitations

Workloads accept seeds; online predictors are causal; comparisons reuse the same trace. This remains a simulator: it omits real MMU/TLB behavior, OS interrupts, and physical I/O. LSTM probabilities are model softmax scores, not calibrated guarantees. In-memory live sessions are not durable across server restarts.

## Testing

Pytest covers algorithms, causality, ML fallback/training, dirty write-back costs, page tables, trace import, optimization, sessions, thrashing, and allocation constraints. Vitest covers frontend state; Playwright is configured for extension with browser-level scenarios.
