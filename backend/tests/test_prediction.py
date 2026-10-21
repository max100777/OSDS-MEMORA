"""
Unit tests for Markov and LSTM Prediction Models.
Validates probability normalization, strict historical causality, and fallback handling.
"""
import pytest
from app.prediction.markov import MarkovPredictor
from app.prediction.lstm import LSTMPredictor

def test_markov_transition_counts_and_normalization():
    # Sequence: 1 -> 2 -> 1 -> 2 -> 3
    markov = MarkovPredictor()
    markov.update(1, 2)
    markov.update(2, 1)
    markov.update(1, 2)
    markov.update(2, 3)

    probs_1 = markov.get_probabilities(1)
    assert 2 in probs_1
    assert probs_1[2] == 1.0  # 1 was always followed by 2

    probs_2 = markov.get_probabilities(2)
    assert probs_2[1] == 0.5
    assert probs_2[3] == 0.5
    assert sum(probs_2.values()) == 1.0

def test_markov_unseen_state_fallback():
    markov = MarkovPredictor()
    markov.update(1, 2)
    # Query an unobserved state 99
    res = markov.predict_next(current_page=99)
    assert res.is_fallback is True

def test_markov_no_future_leakage():
    seq = [1, 2, 3, 4]
    markov = MarkovPredictor()
    # At step 0, no transitions exist yet
    probs_0 = markov.get_probabilities(seq[0])
    assert probs_0 == {}

    # Update only step 0 -> 1
    markov.update(seq[0], seq[1])
    assert markov.state_totals[seq[0]] == 1
    # Future transition 2 -> 3 must NOT be known
    assert markov.state_totals[seq[1]] == 0

def test_lstm_training_and_inference():
    predictor = LSTMPredictor(model_dir="backend/data")
    # Synthetic cyclic sequence
    seq = [0, 1, 2, 3, 0, 1, 2, 3] * 15
    train_metrics = predictor.train(sequence=seq, seq_len=4, epochs=5, hidden_dim=16)

    assert train_metrics["status"] == "trained"
    assert train_metrics["epochs_trained"] == 5

    # Predict next
    pred = predictor.predict_next([0, 1, 2], top_k=3)
    assert "top_candidates" in pred
    assert len(pred["top_candidates"]) > 0
