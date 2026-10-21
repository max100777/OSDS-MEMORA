# MEMORA — Smart Virtual Memory Manager
### AI-Powered Predictive Paging, Adaptive Memory Allocation, and Thrashing Prevention
**Operating Systems and System Design (OSDS) Course Project**

---

## 1. Project Overview

**MEMORA** is an advanced, full-stack virtual memory management simulation platform that models how modern and next-generation operating systems manage physical memory frames, handle compulsory/capacity page faults, resolve victim eviction policies, and eliminate catastrophic thrashing.

Unlike simple frontend mockups, **every metric, hit ratio, frame state, algorithm comparison, next-page prediction, and thrashing alert in MEMORA is computed in real time by an authentic, tested FastAPI simulation backend** using NumPy, PyTorch, and strict causal event traces.

---

## 2. System Architecture

```
                  ┌─────────────────────────────────────────────────────┐
                  │          MEMORA Frontend (React 18 + TS)            │
                  │   Vite • Tailwind CSS • Lucide Icons • Recharts     │
                  └──────────────────────────┬──────────────────────────┘
                                             │ HTTP REST / JSON
                                             ▼
                  ┌─────────────────────────────────────────────────────┐
                  │              FastAPI Backend Server                 │
                  │           Uvicorn ASGI • Pydantic v2                │
                  └──────┬───────────────────────────────┬──────────────┘
                         │                               │
       ┌─────────────────┴─────────────────┐   ┌─────────┴────────────────┐
       │     Core OS Simulation Engine     │   │   AI Prediction Engines  │
       │  • FIFO Simulator                 │   │  • 1st-Order Markov P(v|u)
       │  • LRU Simulator (Recency Table)  │   │  • PyTorch LSTM (Window) │
       │  • Belady's Optimal (Offline)     │   │  • Adaptive Controller   │
       │  • Working-Set Thrashing Monitor  │   │  • Victim Scoring Policy │
       │  • Multi-Process Frame Allocator  │   │  • Cooldown & Hysteresis │
       └───────────────────────────────────┘   └──────────────────────────┘
```

---

## 3. Core Algorithms & Features

### 3.1 Traditional Page Replacement Policies
1. **FIFO (First-In, First-Out)**:
   - Tracks page arrival order in a queue.
   - Evicts the earliest resident page upon capacity fault.
   - Cache hits preserve queue insertion order.
   - **Belady's Anomaly Regression**: Demonstrates that for sequence `[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]`, increasing frames from 3 to 4 increases page faults from 9 to 10.
2. **LRU (Least Recently Used)**:
   - Updates logical timestamp $t$ on every memory reference (both hits and faults).
   - Evicts the page with $\min(t_{\text{accessed}})$.
   - Immune to Belady's Anomaly (stack algorithm with inclusion property).
3. **Optimal (MIN / Belady's Benchmark)**:
   - Theoretical offline benchmark requiring oracle knowledge of all upcoming page references.
   - Evicts the resident page whose next reference occurs farthest in the future (or never again).
   - **Strictly labeled as an offline lower-bound benchmark**; never cheated into online policies.

### 3.2 AI Page Prediction Models
1. **First-Order Markov Model**:
   - Computes empirical transition counts $C[u][v]$ and conditional probabilities $P(v \mid u)$.
   - Updates dynamically step-by-step; strictly past-referencing without future data leakage.
   - Provides top-$K$ candidates and probability distribution.
   - Scores resident frames to evict the page with the lowest predicted transition probability.
2. **PyTorch LSTM Sequence Model**:
   - Lightweight neural network (`Embedding -> LSTM -> Linear -> Softmax`) trained on sliding historical windows ($L=5$).
   - Trains directly on laptop CPU in under 2 seconds.
   - Evaluates next-page reuse probability over resident frames.

### 3.3 Self-Learning Adaptive Controller
- Orchestrates practical online strategies (LRU baseline, Markov-guided, LSTM-guided).
- Maintains a rolling window ($W=8$) of page-fault frequency and model prediction accuracy.
- Enforces a **switching cooldown** (minimum 5 references between changes) to prevent high-frequency oscillation.
- Automatically falls back to deterministic LRU if model confidence or accuracy drops.

### 3.4 Predictive Thrashing Detection
- Based on Peter Denning's **Working-Set Model**:
  $$\text{WSS}(t, \Delta) = |\{ \text{pages referenced in } [t - \Delta + 1, t] \}|$$
- Monitors Page-Fault Frequency (PFF).
- Classifies memory pressure: `Normal`, `Elevated`, `High`, `Potential Thrashing`.
- Recommends corrective actions: frame budget expansion, thread suspension, or policy switching.

### 3.5 Intelligent Multi-Process Frame Allocator
- Simulates concurrent processes (e.g., PostgreSQL Engine, NGINX Web Server, LLVM Compiler).
- Supports **Equal**, **Proportional**, **Working-Set**, **PFF**, and **Adaptive Dynamic** allocation.
- Enforces strict **frame budget conservation**: $\sum f_i = \text{TotalBudget}$ at every step.
- Calculates **Jain's Fairness Index**:
  $$J = \frac{(\sum x_i)^2}{n \sum x_i^2}$$

---

## 4. Setup and Installation

### Prerequisites
- Python 3.10+ (tested on Python 3.13)
- Node.js 18+ and npm (tested on Node v24)

### Backend Setup
```bash
# Navigate to project directory
cd "c:\Users\Yash\OSDS CP"

# Install backend dependencies
python -m pip install -r backend/requirements.txt

# Run automated test suite (12 tests)
python -m pytest -v

# Start FastAPI backend server (port 8000)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend
```

### Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd "c:\Users\Yash\OSDS CP\frontend"

# Install frontend dependencies
npm install

# Start Vite dev server (port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```

Open your browser at **`http://127.0.0.1:5173/`**.

---

## 5. Automated Test Suite

MEMORA includes 12 automated unit and regression tests in `backend/tests`:
```
backend/tests/test_algorithms.py::test_fifo_basic PASSED
backend/tests/test_algorithms.py::test_lru_basic PASSED
backend/tests/test_algorithms.py::test_optimal_benchmark_fewer_faults_than_fifo_and_lru PASSED
backend/tests/test_algorithms.py::test_beladys_anomaly_fifo PASSED
backend/tests/test_algorithms.py::test_empty_sequence_and_single_frame PASSED
backend/tests/test_prediction.py::test_markov_transition_counts_and_normalization PASSED
backend/tests/test_prediction.py::test_markov_unseen_state_fallback PASSED
backend/tests/test_prediction.py::test_markov_no_future_leakage PASSED
backend/tests/test_prediction.py::test_lstm_training_and_inference PASSED
backend/tests/test_adaptive_thrashing_multi.py::test_adaptive_paging_runs_and_adapts PASSED
backend/tests/test_adaptive_thrashing_multi.py::test_thrashing_detector_flags_pathological_workload PASSED
backend/tests/test_adaptive_thrashing_multi.py::test_multiprocess_budget_conservation PASSED
```

---

## 6. Viva Defense Quick Reference

1. **Why can't the Optimal page replacement algorithm be used in an operating system?**
   - Optimal requires oracle clairvoyance of future instruction executions. Because programs have dynamic branch conditions, interrupts, and user inputs, future memory accesses cannot be known with 100% certainty. It serves strictly as an offline lower-bound benchmark.
2. **What is Belady's Anomaly and how does MEMORA prove it?**
   - Belady's Anomaly occurs when increasing physical frames increases page faults in FIFO. MEMORA executes `[1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5]` showing 9 faults with 3 frames and 10 faults with 4 frames. LRU and Optimal are immune because they are stack algorithms with the inclusion property.
3. **Why doesn't higher next-page prediction accuracy always mean fewer page faults?**
   - Paging is a cache-state retention problem across multiple steps, not just a 1-step token classification task. Even if $t+1$ is predicted correctly, evicting a page needed at $t+3$ or $t+4$ causes cascading capacity faults.
4. **How does Peter Denning's Working-Set model prevent thrashing?**
   - If $\sum \text{WSS}_i > \text{TotalPhysicalFrames}$, thrashing is mathematically inevitable. The OS must either allocate more frames or suspend active processes to restore throughput.

---

## 7. License & Academic Integrity
This project is built strictly for educational virtual memory simulation and course defense in Operating Systems & System Design (OSDS). It does not alter host OS hardware page tables or physical DRAM.
