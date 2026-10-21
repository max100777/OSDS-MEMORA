"""
LSTM Sequence Prediction Model for Virtual Memory Page Prediction.
Uses PyTorch to train an embedding + LSTM network on past reference windows.
Produces probability distribution over upcoming virtual pages.
"""
import os
from typing import List, Dict, Tuple, Optional, Any
import numpy as np

# Safe PyTorch import
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import TensorDataset, DataLoader
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


if TORCH_AVAILABLE:
    class PageLSTMNet(nn.Module):
        def __init__(self, vocab_size: int, embed_dim: int = 16, hidden_dim: int = 32):
            super().__init__()
            self.vocab_size = vocab_size
            self.embedding = nn.Embedding(vocab_size, embed_dim)
            self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True)
            self.fc = nn.Linear(hidden_dim, vocab_size)

        def forward(self, x):
            # x: [batch_size, seq_len]
            emb = self.embedding(x)
            out, (hn, cn) = self.lstm(emb)
            # Use last step output
            last_out = out[:, -1, :]
            logits = self.fc(last_out)
            return logits

class LSTMPredictor:
    def __init__(self, model_dir: str = "data"):
        self.model_dir = model_dir
        self.model_path = os.path.join(model_dir, "lstm_model.pth")
        self.vocab_size = 20
        self.seq_len = 5
        self.model: Optional[Any] = None
        self.status = "trained" if os.path.exists(self.model_path) and TORCH_AVAILABLE else "untrained"
        self.last_training_metrics: Dict[str, Any] = {}

        if not TORCH_AVAILABLE:
            self.status = "unavailable"
        elif os.path.exists(self.model_path):
            self.load_model()

    def train(
        self,
        sequence: List[int],
        seq_len: int = 5,
        hidden_dim: int = 32,
        epochs: int = 25,
        lr: float = 0.01
    ) -> Dict[str, Any]:
        if not TORCH_AVAILABLE:
            return {
                "status": "unavailable",
                "message": "PyTorch is not available in current Python runtime.",
                "epochs_trained": 0,
                "final_loss": 0.0,
                "final_val_accuracy": 0.0,
                "training_history": []
            }

        if len(sequence) < seq_len + 5:
            return {
                "status": "untrained",
                "message": f"Sequence length {len(sequence)} too short (need >= {seq_len + 5}).",
                "epochs_trained": 0,
                "final_loss": 0.0,
                "final_val_accuracy": 0.0,
                "training_history": []
            }

        self.seq_len = seq_len
        max_page = max(sequence)
        self.vocab_size = max(max_page + 2, 10)

        # Create dataset with sliding window
        X, Y = [], []
        for i in range(len(sequence) - seq_len):
            X.append(sequence[i:i + seq_len])
            Y.append(sequence[i + seq_len])

        X_np = np.array(X, dtype=np.int64)
        Y_np = np.array(Y, dtype=np.int64)

        # Train/Validation split (80/20)
        n_samples = len(X_np)
        split_idx = max(int(n_samples * 0.8), 1)

        X_train, X_val = torch.tensor(X_np[:split_idx]), torch.tensor(X_np[split_idx:])
        Y_train, Y_val = torch.tensor(Y_np[:split_idx]), torch.tensor(Y_np[split_idx:])

        if len(X_val) == 0:
            X_val, Y_val = X_train, Y_train

        train_ds = TensorDataset(X_train, Y_train)
        train_loader = DataLoader(train_ds, batch_size=min(32, len(train_ds)), shuffle=True)

        # Initialize network
        self.model = PageLSTMNet(self.vocab_size, embed_dim=16, hidden_dim=hidden_dim)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(self.model.parameters(), lr=lr)

        history = []
        self.model.train()

        for epoch in range(epochs):
            total_loss = 0.0
            for batch_x, batch_y in train_loader:
                optimizer.zero_grad()
                logits = self.model(batch_x)
                loss = criterion(logits, batch_y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item() * len(batch_x)

            epoch_loss = round(total_loss / len(train_ds), 4)

            # Validation accuracy
            self.model.eval()
            with torch.no_grad():
                val_logits = self.model(X_val)
                val_preds = torch.argmax(val_logits, dim=-1)
                val_acc = round((val_preds == Y_val).float().mean().item(), 4)
            self.model.train()

            history.append({
                "epoch": epoch + 1,
                "loss": epoch_loss,
                "val_accuracy": val_acc
            })

        self.status = "trained"
        self.save_model()
        final_metric = history[-1]
        self.last_training_metrics = {
            "status": "trained",
            "epochs_trained": epochs,
            "final_loss": final_metric["loss"],
            "final_val_accuracy": final_metric["val_accuracy"],
            "training_history": history,
            "message": f"Successfully trained LSTM model over {epochs} epochs on {len(X_train)} samples."
        }
        return self.last_training_metrics

    def save_model(self):
        if not TORCH_AVAILABLE or self.model is None:
            return
        os.makedirs(self.model_dir, exist_ok=True)
        torch.save({
            "model_state": self.model.state_dict(),
            "vocab_size": self.vocab_size,
            "seq_len": self.seq_len
        }, self.model_path)

    def load_model(self):
        if not TORCH_AVAILABLE or not os.path.exists(self.model_path):
            return
        try:
            ckpt = torch.load(self.model_path, map_location="cpu")
            self.vocab_size = ckpt["vocab_size"]
            self.seq_len = ckpt["seq_len"]
            self.model = PageLSTMNet(self.vocab_size)
            self.model.load_state_dict(ckpt["model_state"])
            self.model.eval()
            self.status = "trained"
        except Exception:
            self.status = "untrained"

    def predict_distribution(self, history: List[int]) -> Tuple[Dict[int, float], bool]:
        """Returns {page: probability} and whether fallback was used."""
        if not TORCH_AVAILABLE or self.model is None or self.status != "trained":
            # Fallback: simple empirical frequency
            if not history:
                return {}, True
            counts: Dict[int, int] = {}
            for p in history[-10:]:
                counts[p] = counts.get(p, 0) + 1
            tot = sum(counts.values())
            return {p: round(c / tot, 4) for p, c in counts.items()}, True

        # Pad or slice history to seq_len
        if len(history) < self.seq_len:
            pad = [0] * (self.seq_len - len(history))
            input_seq = pad + history
        else:
            input_seq = history[-self.seq_len:]

        # Filter out of vocab tokens
        input_seq = [min(p, self.vocab_size - 1) for p in input_seq]

        self.model.eval()
        with torch.no_grad():
            x_t = torch.tensor([input_seq], dtype=torch.long)
            logits = self.model(x_t)
            probs = torch.softmax(logits, dim=-1).numpy()[0]

        prob_dict = {i: round(float(probs[i]), 4) for i in range(len(probs)) if probs[i] > 0.01}
        return prob_dict, False

    def predict_next(self, history: List[int], top_k: int = 3) -> Dict[str, Any]:
        probs, is_fallback = self.predict_distribution(history)
        if not probs:
            return {
                "predicted_next_page": None,
                "top_candidates": [],
                "confidence": 0.0,
                "model_status": self.status,
                "is_fallback": True
            }

        sorted_cand = sorted(probs.items(), key=lambda x: x[1], reverse=True)
        top_candidates = [
            {"page": p, "probability": prob}
            for p, prob in sorted_cand[:top_k]
        ]
        return {
            "predicted_next_page": top_candidates[0]["page"],
            "top_candidates": top_candidates,
            "confidence": top_candidates[0]["probability"],
            "model_status": self.status,
            "is_fallback": is_fallback
        }

    def score_victims_for_replacement(
        self,
        history: List[int],
        resident_pages: List[int],
        last_used_timestamps: Dict[int, int]
    ) -> Tuple[int, str]:
        """
        Victim selection using LSTM distribution:
        - Resident page with lowest predicted reuse probability is chosen.
        - Ties broken by LRU recency.
        """
        probs, is_fallback = self.predict_distribution(history)

        def victim_key(page: int):
            p_reuse = probs.get(page, 0.0)
            t_last = last_used_timestamps.get(page, 0)
            return (p_reuse, t_last)

        chosen_victim = min(resident_pages, key=victim_key)
        victim_p = probs.get(chosen_victim, 0.0)
        victim_t = last_used_timestamps.get(chosen_victim, 0)

        label = "LSTM Fallback" if is_fallback else "LSTM Policy"
        reason = (
            f"{label}: Evicted Page {chosen_victim} (predicted reuse P={victim_p:.2f}, "
            f"last accessed t={victim_t})."
        )
        return chosen_victim, reason
