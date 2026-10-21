"""
First-Order Markov Page Prediction Engine.
Maintains empirical transition counts C[u][v] and transition probabilities P(v|u).
Predicts upcoming page references using strictly historical observations (no future leakage).
Provides scoring for predictive page replacement victim selection.
"""
from collections import defaultdict
from typing import List, Dict, Tuple, Optional
from app.models.schemas import TopCandidate, MarkovPredictResponse

class MarkovPredictor:
    def __init__(self, laplace_smoothing: float = 0.0):
        # transition_counts[prev_page][next_page] = count
        self.transition_counts: Dict[int, Dict[int, int]] = defaultdict(lambda: defaultdict(int))
        self.state_totals: Dict[int, int] = defaultdict(int)
        self.marginal_counts: Dict[int, int] = defaultdict(int)
        self.total_observations = 0
        self.laplace_smoothing = laplace_smoothing

    def update(self, prev_page: int, next_page: int):
        """Update transition model with newly observed transition (strictly past)."""
        self.transition_counts[prev_page][next_page] += 1
        self.state_totals[prev_page] += 1
        self.marginal_counts[next_page] += 1
        self.total_observations += 1

    def train_on_history(self, sequence: List[int]):
        """Train model incrementally on past reference sequence."""
        self.reset()
        for i in range(len(sequence) - 1):
            self.update(sequence[i], sequence[i + 1])

    def reset(self):
        self.transition_counts.clear()
        self.state_totals.clear()
        self.marginal_counts.clear()
        self.total_observations = 0

    def get_probabilities(self, current_page: int) -> Dict[int, float]:
        """Compute conditional transition probabilities P(next | current)."""
        if current_page not in self.state_totals or self.state_totals[current_page] == 0:
            # Fallback: Empirical marginal frequency of observed pages
            if self.total_observations > 0:
                return {
                    p: round(cnt / self.total_observations, 4)
                    for p, cnt in self.marginal_counts.items()
                }
            return {}

        total = self.state_totals[current_page]
        return {
            nxt: round(cnt / total, 4)
            for nxt, cnt in self.transition_counts[current_page].items()
        }

    def predict_next(self, current_page: int, top_k: int = 3) -> MarkovPredictResponse:
        """Predict the next page based only on transitions observed from current_page."""
        probs = self.get_probabilities(current_page)
        is_fallback = (current_page not in self.state_totals or self.state_totals[current_page] == 0)

        if not probs:
            return MarkovPredictResponse(
                predicted_next_page=None,
                top_candidates=[],
                confidence=0.0,
                is_fallback=True,
                transition_matrix=self.get_matrix_dict()
            )

        sorted_candidates = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        top_candidates = [
            TopCandidate(page=p, probability=round(prob, 4))
            for p, prob in sorted_candidates[:top_k]
        ]

        best_page = top_candidates[0].page
        confidence = top_candidates[0].probability

        return MarkovPredictResponse(
            predicted_next_page=best_page,
            top_candidates=top_candidates,
            confidence=confidence,
            is_fallback=is_fallback,
            transition_matrix=self.get_matrix_dict()
        )

    def score_victims_for_replacement(
        self,
        current_page: int,
        resident_pages: List[int],
        last_used_timestamps: Dict[int, int]
    ) -> Tuple[int, str]:
        """
        Interpretable victim scoring function for predictive page replacement:
        - Calculates near-term probability P(resident | current_page).
        - Lowest reuse probability is the primary candidate for eviction.
        - If multiple resident pages have 0 or equal predicted probability,
          ties are broken by LRU recency (smaller timestamp = evicted first).
        """
        probs = self.get_probabilities(current_page)

        # Score formula: (predicted_reuse_probability, last_used_timestamp)
        # Lowest tuple value is evicted first
        def victim_key(page: int):
            p_reuse = probs.get(page, 0.0)
            t_last = last_used_timestamps.get(page, 0)
            return (p_reuse, t_last)

        chosen_victim = min(resident_pages, key=victim_key)
        victim_p = probs.get(chosen_victim, 0.0)
        victim_t = last_used_timestamps.get(chosen_victim, 0)

        reason = (
            f"Markov Policy: Evicted Page {chosen_victim} (lowest predicted reuse "
            f"P={victim_p:.2f}, last used t={victim_t})."
        )
        return chosen_victim, reason

    def get_matrix_dict(self) -> Dict[str, Dict[str, float]]:
        """Return human-readable transition matrix formatted as strings."""
        result: Dict[str, Dict[str, float]] = {}
        for src, dests in self.transition_counts.items():
            tot = self.state_totals[src]
            if tot > 0:
                result[str(src)] = {
                    str(dst): round(cnt / tot, 3)
                    for dst, cnt in sorted(dests.items())
                }
        return result
