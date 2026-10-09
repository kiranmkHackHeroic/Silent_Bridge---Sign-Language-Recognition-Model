"""Temporal (sequence) classifier: a small bidirectional GRU in PyTorch.

Wrapped with a scikit-learn style interface (fit / predict / predict_proba /
classes_ / n_features_in_) so it can be compared with the classical candidates
on exactly the same folds and saved in the same joblib model bundle.

Input: the standard flattened sequence vector from
app.recognition.sequence_features (resample_frames x FRAME_DIM per-frame values
followed by velocity/path features). The GRU consumes the per-frame part as a
(T, F) sequence; the global features are concatenated to the GRU summary.
"""
from __future__ import annotations

import io

import numpy as np


class TorchGRUClassifier:
    def __init__(self, seq_len: int, frame_dim: int, hidden: int = 96, epochs: int = 80, lr: float = 2e-3,
                 weight_decay: float = 1e-4, dropout: float = 0.3, batch_size: int = 64, patience: int = 12,
                 val_fraction: float = 0.15, seed: int = 42):
        self.seq_len, self.frame_dim = seq_len, frame_dim
        self.hidden, self.epochs, self.lr, self.weight_decay = hidden, epochs, lr, weight_decay
        self.dropout, self.batch_size, self.patience, self.val_fraction, self.seed = (
            dropout, batch_size, patience, val_fraction, seed)
        self.net = None
        self.classes_: np.ndarray = np.array([])
        self.n_features_in_: int = 0
        self.history_: list[dict] = []

    # ------------------------------------------------------------------ model
    def _build(self, n_extra: int, n_classes: int):
        import torch.nn as nn

        class Net(nn.Module):
            def __init__(s):
                super().__init__()
                s.inp = nn.Sequential(nn.Linear(self.frame_dim, self.hidden), nn.ReLU(), nn.Dropout(self.dropout))
                s.gru = nn.GRU(self.hidden, self.hidden, batch_first=True, bidirectional=True)
                s.head = nn.Sequential(nn.Dropout(self.dropout), nn.Linear(4 * self.hidden + n_extra, n_classes))

            def forward(s, seq, extra):
                import torch
                h, _ = s.gru(s.inp(seq))
                pooled = torch.cat([h.mean(1), h.max(1).values, extra], dim=1)
                return s.head(pooled)

        return Net()

    def _split(self, X: np.ndarray):
        T, F = self.seq_len, self.frame_dim
        return X[:, : T * F].reshape(len(X), T, F), X[:, T * F:]

    def fit(self, X: np.ndarray, y: np.ndarray, groups: np.ndarray | None = None):
        import torch

        torch.manual_seed(self.seed)
        rng = np.random.default_rng(self.seed)
        X = np.asarray(X, dtype=np.float32)
        self.n_features_in_ = X.shape[1]
        self.classes_ = np.array(sorted(set(np.asarray(y).tolist())))
        idx_of = {c: i for i, c in enumerate(self.classes_)}
        yi = np.array([idx_of[c] for c in y])
        self.mu_, self.sd_ = X.mean(0), X.std(0) + 1e-6
        Xn = (X - self.mu_) / self.sd_

        # validation split by ORIGINAL sample (augmented copies stay together) for early stopping
        g = np.asarray(groups) if groups is not None else np.arange(len(X))
        ug = rng.permutation(np.unique(g))
        n_val = max(1, int(len(ug) * self.val_fraction)) if len(ug) > 10 else 0
        val_mask = np.isin(g, ug[:n_val]) if n_val else np.zeros(len(X), bool)
        tr = np.flatnonzero(~val_mask)
        va = np.flatnonzero(val_mask)

        seq, extra = self._split(Xn)
        seq_t, extra_t, y_t = torch.tensor(seq), torch.tensor(extra), torch.tensor(yi, dtype=torch.long)
        self.net = self._build(extra.shape[1], len(self.classes_))
        opt = torch.optim.AdamW(self.net.parameters(), lr=self.lr, weight_decay=self.weight_decay)
        counts = np.bincount(yi[tr], minlength=len(self.classes_)).astype(np.float32)
        weights = torch.tensor(counts.sum() / np.maximum(counts, 1) / len(counts))
        loss_fn = torch.nn.CrossEntropyLoss(weight=weights)
        best, best_state, bad = -1.0, None, 0
        self.history_ = []
        for epoch in range(self.epochs):
            self.net.train()
            perm = rng.permutation(tr)
            total = 0.0
            for b in range(0, len(perm), self.batch_size):
                bi = perm[b:b + self.batch_size]
                opt.zero_grad()
                loss = loss_fn(self.net(seq_t[bi], extra_t[bi]), y_t[bi])
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.net.parameters(), 1.0)
                opt.step()
                total += float(loss.detach()) * len(bi)
            if len(va):
                self.net.eval()
                with torch.no_grad():
                    acc = float((self.net(seq_t[va], extra_t[va]).argmax(1) == y_t[va]).float().mean())
                self.history_.append({"epoch": epoch + 1, "train_loss": round(total / len(tr), 4), "val_acc": round(acc, 4)})
                if acc > best + 1e-4:
                    best, bad = acc, 0
                    best_state = {k: v.detach().clone() for k, v in self.net.state_dict().items()}
                else:
                    bad += 1
                    if bad >= self.patience:
                        break
        if best_state is not None:
            self.net.load_state_dict(best_state)   # best validated epoch, not the last one
        self.net.eval()
        return self

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        import torch

        Xn = (np.asarray(X, dtype=np.float32) - self.mu_) / self.sd_
        seq, extra = self._split(Xn)
        with torch.no_grad():
            logits = self.net(torch.tensor(seq), torch.tensor(extra))
            return torch.softmax(logits, 1).numpy()

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.classes_[self.predict_proba(X).argmax(1)]

    # ------------------------------------------------------------------ pickling (joblib)
    def __getstate__(self):
        import torch

        state = {k: v for k, v in self.__dict__.items() if k != "net"}
        if self.net is not None:
            buf = io.BytesIO()
            torch.save(self.net.state_dict(), buf)
            state["_weights"] = buf.getvalue()
            state["_n_extra"] = self.n_features_in_ - self.seq_len * self.frame_dim
        return state

    def __setstate__(self, state):
        import torch

        weights = state.pop("_weights", None)
        n_extra = state.pop("_n_extra", 0)
        self.__dict__.update(state)
        self.net = None
        if weights is not None:
            self.net = self._build(n_extra, len(self.classes_))
            self.net.load_state_dict(torch.load(io.BytesIO(weights), weights_only=True))
            self.net.eval()
