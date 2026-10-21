"""
Self-Learning Adaptive Paging Controller.
Dynamically orchestrates page replacement policies (LRU, Markov, LSTM) based on
online observed page-fault frequency, prediction confidence, and recent model accuracy.
Includes hysteresis, cooldown counters, and transparent decision rationales.
"""
from typing import List, Dict, Optional, Tuple, Any
from app.prediction.markov import MarkovPredictor
from app.prediction.lstm import LSTMPredictor

class AdaptivePagingController:
    def __init__(
        self,
        markov_predictor: MarkovPredictor,
        lstm_predictor: LSTMPredictor,
        window_size: int = 8,
        cooldown_steps: int = 5,
        confidence_threshold: float = 0.35,
        accuracy_threshold: float = 0.40
    ):
        self.markov = markov_predictor
        self.lstm = lstm_predictor
        self.window_size = window_size
        self.cooldown_steps = cooldown_steps
        self.confidence_threshold = confidence_threshold
        self.accuracy_threshold = accuracy_threshold

        # Active strategy: "LRU", "Markov", "LSTM"
        self.active_strategy = "LRU"
        self.strategy_history: List[str] = []
        self.switch_events: List[Dict[str, Any]] = []

        # Online tracking metrics
        self.recent_faults: List[int] = []  # 1 for fault, 0 for hit
        self.recent_predictions: List[bool] = []  # True if model prediction was correct
        self.steps_since_switch = cooldown_steps  # Start ready to adapt

        # Strategy-specific cumulative counters
        self.strategy_performance: Dict[str, Dict[str, int]] = {
            "LRU": {"references": 0, "faults": 0},
            "Markov": {"references": 0, "faults": 0},
            "LSTM": {"references": 0, "faults": 0}
        }

    def evaluate_and_adapt(
        self,
        step_idx: int,
        history: List[int],
        current_page: int
    ) -> Tuple[str, Optional[str]]:
        """
        Evaluate recent metrics and determine whether to switch paging strategy.
        Returns: (selected_strategy, switch_reason_or_none)
        """
        self.steps_since_switch += 1

        # Check cooldown to prevent thrashing between strategies
        if self.steps_since_switch < self.cooldown_steps:
            return self.active_strategy, None

        # Need minimal reference history before engaging ML
        if len(history) < 5:
            if self.active_strategy != "LRU":
                prev = self.active_strategy
                self.active_strategy = "LRU"
                self.steps_since_switch = 0
                reason = f"Warmup phase (< 5 references). Reverted from {prev} to LRU baseline."
                self._record_switch(step_idx, prev, "LRU", reason)
                return "LRU", reason
            return "LRU", None

        # Calculate rolling fault rate
        recent_window = self.recent_faults[-self.window_size:] if self.recent_faults else []
        rolling_fault_rate = sum(recent_window) / len(recent_window) if recent_window else 0.0

        # Calculate rolling prediction accuracy
        pred_window = self.recent_predictions[-self.window_size:] if self.recent_predictions else []
        recent_accuracy = sum(pred_window) / len(pred_window) if pred_window else 0.0

        # Check Markov confidence
        markov_pred = self.markov.predict_next(current_page)
        markov_conf = markov_pred.confidence

        # Check LSTM availability and confidence
        lstm_pred = self.lstm.predict_next(history)
        lstm_conf = lstm_pred.get("confidence", 0.0)
        lstm_ready = (self.lstm.status == "trained" and not lstm_pred.get("is_fallback", True))

        prev_strategy = self.active_strategy
        new_strategy = prev_strategy
        reason = None

        # Decision Policy:
        # 1. If LSTM is trained with high confidence and recent accuracy is good, prefer LSTM
        if lstm_ready and lstm_conf >= 0.50 and (recent_accuracy >= self.accuracy_threshold or rolling_fault_rate > 0.5):
            new_strategy = "LSTM"
            reason = f"LSTM model exhibits high confidence ({lstm_conf:.2f}). Selected for sequence-based victim guidance."

        # 2. Else if Markov shows strong transition structure
        elif markov_conf >= self.confidence_threshold:
            new_strategy = "Markov"
            reason = f"Markov transition confidence ({markov_conf:.2f} >= {self.confidence_threshold}) indicates repeatable access patterns."

        # 3. If rolling fault rate is high under an ML policy, or ML accuracy is poor, fallback to robust LRU
        elif rolling_fault_rate >= 0.65 or recent_accuracy < 0.20:
            new_strategy = "LRU"
            reason = (
                f"Elevated fault rate ({rolling_fault_rate:.2f}) / low prediction confidence "
                f"({max(markov_conf, lstm_conf):.2f}). Fallback to deterministic LRU."
            )
        else:
            # Maintain current or default to LRU
            new_strategy = self.active_strategy

        if new_strategy != prev_strategy:
            self.active_strategy = new_strategy
            self.steps_since_switch = 0
            self._record_switch(step_idx, prev_strategy, new_strategy, reason or "Policy re-evaluation")
            return new_strategy, reason

        return self.active_strategy, None

    def record_step_result(self, is_hit: bool, is_pred_correct: Optional[bool]):
        """Update sliding window feedback after a reference step completes."""
        self.recent_faults.append(0 if is_hit else 1)
        if len(self.recent_faults) > 50:
            self.recent_faults.pop(0)

        if is_pred_correct is not None:
            self.recent_predictions.append(is_pred_correct)
            if len(self.recent_predictions) > 50:
                self.recent_predictions.pop(0)

        self.strategy_performance[self.active_strategy]["references"] += 1
        if not is_hit:
            self.strategy_performance[self.active_strategy]["faults"] += 1

    def _record_switch(self, step: int, from_strat: str, to_strat: str, reason: str):
        self.switch_events.append({
            "step": step,
            "from_strategy": from_strat,
            "to_strategy": to_strat,
            "reason": reason
        })
