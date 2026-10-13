"""Continuous gloss recognition: BiGRU encoder + CTC (PyTorch, CPU).

CTC is appropriate here because ISL-CSLTR gives an ordered gloss sequence per
sentence video but no frame-level boundaries; CTC learns the alignment.
Greedy CTC decoding produces the gloss sequence; the closest annotated corpus
sentence (gloss edit distance) is reported alongside, clearly marked as a
retrieval over the corpus' closed sentence set.
"""
from __future__ import annotations

import io

import numpy as np


def edit_distance(a: list[str], b: list[str]) -> int:
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(b) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(b)]


class CTCGlossRecognizer:
    def __init__(self, vocab: list[str], input_dim: int, hidden: int = 128, layers: int = 2, dropout: float = 0.3,
                 lr: float = 1e-3, epochs: int = 120, patience: int = 20, batch_size: int = 16, seed: int = 42,
                 arch: str = "gru"):
        self.vocab = list(vocab)                      # index 0 is the CTC blank
        self.input_dim, self.hidden, self.layers, self.dropout = input_dim, hidden, layers, dropout
        self.lr, self.epochs, self.patience, self.batch_size, self.seed = lr, epochs, patience, batch_size, seed
        self.arch = arch
        self.net = None
        self.history_: list[dict] = []

    def _build(self):
        import torch.nn as nn

        arch = getattr(self, "arch", "gru")
        if arch == "tcn_gru":
            # Multi-scale 1D Temporal Convolutional front-end before BiGRU
            class TCNNet(nn.Module):
                def __init__(s):
                    super().__init__()
                    s.conv1 = nn.Conv1d(self.input_dim, self.hidden // 2, kernel_size=3, padding=1)
                    s.conv2 = nn.Conv1d(self.input_dim, self.hidden // 2, kernel_size=5, padding=2)
                    s.bn = nn.BatchNorm1d(self.hidden)
                    s.relu = nn.ReLU()
                    s.drop = nn.Dropout(self.dropout)
                    s.gru = nn.GRU(self.hidden, self.hidden, num_layers=self.layers, batch_first=True,
                                   bidirectional=True, dropout=self.dropout if self.layers > 1 else 0.0)
                    s.out = nn.Linear(2 * self.hidden, len(self.vocab) + 1)

                def forward(s, x):
                    # x: (N, T, C) -> transpose to (N, C, T) for 1D convolution
                    xt = x.transpose(1, 2)
                    c1 = s.conv1(xt)
                    c2 = s.conv2(xt)
                    feat = s.drop(s.relu(s.bn(torch.cat([c1, c2], dim=1)))).transpose(1, 2)
                    h, _ = s.gru(feat)
                    return s.out(h).log_softmax(-1)

            return TCNNet()

        class Net(nn.Module):
            def __init__(s):
                super().__init__()
                s.inp = nn.Sequential(nn.Linear(self.input_dim, self.hidden), nn.ReLU(), nn.Dropout(self.dropout))
                s.gru = nn.GRU(self.hidden, self.hidden, num_layers=self.layers, batch_first=True,
                               bidirectional=True, dropout=self.dropout if self.layers > 1 else 0.0)
                s.out = nn.Linear(2 * self.hidden, len(self.vocab) + 1)

            def forward(s, x):
                h, _ = s.gru(s.inp(x))
                return s.out(h).log_softmax(-1)

        return Net()

    # ------------------------------------------------------------------ data
    def _norm(self, seq: np.ndarray) -> np.ndarray:
        return (seq - self.mu_) / self.sd_

    def _augment(self, seq: np.ndarray, rng) -> np.ndarray:
        n = len(seq)
        new_n = max(4, int(round(n * rng.uniform(0.8, 1.2))))
        idx = np.linspace(0, n - 1, new_n)
        lo = np.floor(idx).astype(int)
        hi = np.minimum(lo + 1, n - 1)
        w = (idx - lo)[:, None]
        out = (1 - w) * seq[lo] + w * seq[hi]
        return (out + rng.normal(0, 0.02, out.shape)).astype(np.float32)

    def _batch(self, seqs, targets):
        import torch
        lens = [len(s) for s in seqs]
        x = np.zeros((len(seqs), max(lens), self.input_dim), np.float32)
        for i, s in enumerate(seqs):
            x[i, : len(s)] = s
        tgt = [self.tok_[g] for t in targets for g in t]
        return (torch.tensor(x), torch.tensor(lens, dtype=torch.long), torch.tensor(tgt, dtype=torch.long),
                torch.tensor([len(t) for t in targets], dtype=torch.long))

    # ------------------------------------------------------------------ train / decode
    def fit(self, train: list[dict], val: list[dict] | None = None, progress=None):
        import torch

        torch.manual_seed(self.seed)
        rng = np.random.default_rng(self.seed)
        self.tok_ = {g: i + 1 for i, g in enumerate(self.vocab)}
        allseq = np.concatenate([s["seq"] for s in train])
        self.mu_, self.sd_ = allseq.mean(0), allseq.std(0) + 1e-6
        self.net = self._build()
        opt = torch.optim.AdamW(self.net.parameters(), lr=self.lr, weight_decay=1e-4)
        ctc = torch.nn.CTCLoss(blank=0, zero_infinity=True)
        pool = [(s["seq"], s["gloss"]) for s in train] + [(s["mirror"], s["gloss"]) for s in train if s.get("mirror") is not None]
        best, best_state, bad = float("inf"), None, 0
        for epoch in range(self.epochs):
            self.net.train()
            order = rng.permutation(len(pool))
            total = 0.0
            for b in range(0, len(order), self.batch_size):
                chunk = [pool[i] for i in order[b:b + self.batch_size]]
                seqs = [self._norm(self._augment(s, rng)) for s, _ in chunk]
                x, lens, tgt, tlens = self._batch(seqs, [g for _, g in chunk])
                logp = self.net(x).transpose(0, 1)          # (T, N, C)
                loss = ctc(logp, tgt, lens, tlens)
                opt.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self.net.parameters(), 1.0)
                opt.step()
                total += float(loss.detach()) * len(chunk)
            rec = {"epoch": epoch + 1, "train_ctc_loss": round(total / len(pool), 4)}
            if val:
                rec["val_gloss_error_rate"] = round(self.gloss_error_rate(val), 4)
                score = rec["val_gloss_error_rate"]
                if score < best - 1e-4:
                    best, bad = score, 0
                    best_state = {k: v.detach().clone() for k, v in self.net.state_dict().items()}
                else:
                    bad += 1
            self.history_.append(rec)
            if progress:
                progress(f"CTC epoch {epoch + 1}: loss {rec['train_ctc_loss']}"
                         + (f", val GER {rec['val_gloss_error_rate']}" if val else ""), (epoch + 1) / self.epochs)
            if val and bad >= self.patience:
                break
        if best_state is not None:
            self.net.load_state_dict(best_state)       # best validated epoch
        self.net.eval()
        return self

    def decode(self, seq: np.ndarray, beam_width: int = 8) -> tuple[list[str], float]:
        """CTC decoding -> (glosses, confidence).

        If beam_width > 1, uses prefix beam search decoding.
        If beam_width <= 1, uses greedy decoding.
        """
        if beam_width <= 1:
            return self.decode_greedy(seq)
        return self.beam_search_decode(seq, beam_width=beam_width)

    def decode_greedy(self, seq: np.ndarray) -> tuple[list[str], float]:
        """Greedy CTC decoding -> (glosses, mean max-probability of emitted tokens)."""
        import torch
        with torch.no_grad():
            logp = self.net(torch.tensor(self._norm(seq)[None]))[0]
        probs = logp.exp().numpy()
        best = probs.argmax(1)
        out, confs, prev = [], [], 0
        for t, k in enumerate(best):
            if k != prev and k != 0:
                out.append(self.vocab[k - 1])
                confs.append(float(probs[t, k]))
            prev = k
        return out, float(np.mean(confs)) if confs else 0.0

    def beam_search_decode(self, seq: np.ndarray, beam_width: int = 8, prune_threshold: float = 1e-4) -> tuple[list[str], float]:
        """Prefix beam search CTC decoding.

        Tracks the top candidate gloss prefixes across time, summing probabilities
        over all blank and non-blank alignment paths.
        """
        from collections import defaultdict
        import torch

        with torch.no_grad():
            logp = self.net(torch.tensor(self._norm(seq)[None]))[0]
        probs = logp.exp().numpy()
        T = probs.shape[0]

        # pb[prefix]: probability ending with blank
        # pnb[prefix]: probability ending with non-blank
        pb = {(): 1.0}
        pnb = {(): 0.0}

        for t in range(T):
            next_pb = defaultdict(float)
            next_pnb = defaultdict(float)
            p_t = probs[t]

            # Candidate tokens at timestamp t above prune_threshold
            candidates = np.where(p_t > prune_threshold)[0]
            if 0 not in candidates:
                candidates = np.append(candidates, 0)

            for prefix in pb.keys() | pnb.keys():
                prob_b = pb.get(prefix, 0.0)
                prob_nb = pnb.get(prefix, 0.0)
                prob_total = prob_b + prob_nb

                # 1. Blank token (0)
                next_pb[prefix] += prob_total * p_t[0]

                # 2. Non-blank tokens (c >= 1)
                for c in candidates:
                    if c == 0:
                        continue
                    p_c = p_t[c]
                    if len(prefix) > 0 and prefix[-1] == c:
                        # Repetition without blank -> collapsed (does not extend prefix)
                        next_pnb[prefix] += prob_nb * p_c
                        # Repetition after blank -> extends prefix
                        next_pnb[prefix + (c,)] += prob_b * p_c
                    else:
                        # New token -> extends prefix
                        next_pnb[prefix + (c,)] += prob_total * p_c

            # Prune to top beam_width prefixes by total probability
            all_prefixes = next_pb.keys() | next_pnb.keys()
            sorted_prefixes = sorted(
                all_prefixes,
                key=lambda p: next_pb.get(p, 0.0) + next_pnb.get(p, 0.0),
                reverse=True
            )[:beam_width]

            pb = {p: next_pb[p] for p in sorted_prefixes}
            pnb = {p: next_pnb[p] for p in sorted_prefixes}

        if not pb and not pnb:
            return [], 0.0

        best_prefix = max(pb.keys() | pnb.keys(), key=lambda p: pb.get(p, 0.0) + pnb.get(p, 0.0))
        best_prob = pb.get(best_prefix, 0.0) + pnb.get(best_prefix, 0.0)
        glosses = [self.vocab[k - 1] for k in best_prefix if k > 0]
        n_tokens = max(1, len(glosses))
        conf = float(np.clip(best_prob ** (1.0 / n_tokens), 0.0, 1.0)) if glosses else 0.0
        return glosses, conf

    def sentence_log_likelihoods(self, seq: np.ndarray, candidates: dict[str, list[str]]) -> dict[str, float]:
        """log P(gloss sequence | video) under the CTC model for every candidate sentence (summed over all
        alignments, not just the greedy path), divided by the number of glosses. Candidates containing a
        gloss outside the model vocabulary get -inf."""
        import torch
        with torch.no_grad():
            logp = self.net(torch.tensor(self._norm(seq)[None]))[0]          # (T, V+1) log-probabilities
        tok = {g: i + 1 for i, g in enumerate(self.vocab)}
        ids = [sid for sid, gl in candidates.items() if gl and all(g in tok for g in gl)]
        out = {sid: float("-inf") for sid in candidates}
        if not ids:
            return out
        targets = torch.tensor([tok[g] for sid in ids for g in candidates[sid]], dtype=torch.long)
        lengths = torch.tensor([len(candidates[sid]) for sid in ids], dtype=torch.long)
        T = logp.shape[0]
        lp = logp[:, None, :].expand(T, len(ids), logp.shape[1])
        nll = torch.nn.functional.ctc_loss(lp, targets, torch.full((len(ids),), T, dtype=torch.long), lengths,
                                           blank=0, reduction="none", zero_infinity=False)
        for sid, v, n in zip(ids, nll.tolist(), lengths.tolist()):
            out[sid] = -v / n
        return out

    def gloss_error_rate(self, samples: list[dict]) -> float:
        errs = sum(edit_distance(self.decode(s["seq"])[0], s["gloss"]) for s in samples)
        return errs / max(1, sum(len(s["gloss"]) for s in samples))

    # ------------------------------------------------------------------ pickling
    def __getstate__(self):
        import torch
        st = {k: v for k, v in self.__dict__.items() if k != "net"}
        if self.net is not None:
            buf = io.BytesIO()
            torch.save(self.net.state_dict(), buf)
            st["_weights"] = buf.getvalue()
        return st

    def __setstate__(self, st):
        import torch
        w = st.pop("_weights", None)
        self.__dict__.update(st)
        self.net = None
        if w is not None:
            self.net = self._build()
            self.net.load_state_dict(torch.load(io.BytesIO(w), weights_only=True))
            self.net.eval()
