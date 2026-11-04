"""Personal fine-tuning: continues training the active GRU on a user's recordings, judged on their evaluation-only
recordings, saved as a new registry version and activated only when it helps without forgetting."""
import json

import numpy as np
import pytest

from app.config import TrainingConfig
from app.dataset.store import DatasetStore
from app.training.finetune import finetune
from app.training.registry import active_version, train_and_promote
from tests.synthetic import sign_frames

KINDS = {"circle": "namaskara", "wave": "water", "push": "yes"}
# a user whose variant of two signs differs from the dataset's (like a regional variant), signed at another position
USER_KINDS = {"circle": "namaskara", "wave": "yes", "push": "water"}


def _store(path, sessions, offset, seed, per=5, kinds=KINDS):
    store = DatasetStore(path)
    rng = np.random.default_rng(seed)
    for session in sessions:
        for kind, label in kinds.items():
            for _ in range(per):
                store.save(label, sign_frames(kind, n=int(rng.integers(24, 34)), rng=rng, noise=0.003,
                                              offset=(offset[0] + rng.normal(0, 0.01), offset[1] + rng.normal(0, 0.01))),
                           session)
    return store


@pytest.fixture(scope="module")
def base(tmp_path_factory):
    root = tmp_path_factory.mktemp("ft")
    public = _store(root / "public", ("pA", "pB", "pC"), (0.0, 0.0), 1)
    models = root / "models"
    tcfg = TrainingConfig(augment_copies=1, candidate_models=["gru"], min_test_macro_f1=0.0)
    out = train_and_promote(tcfg=tcfg, stores=[("pub", public)], known_labels=set(KINDS.values()), root=models)
    assert active_version(models) == out["version"]
    return root, public, models


def test_finetune_needs_training_recordings(base, tmp_path):
    root, public, models = base
    with pytest.raises(RuntimeError, match="no training recordings"):
        finetune(root=models, user_stores=[("app", DatasetStore(tmp_path / "empty"))],
                 eval_stores=[("eval", DatasetStore(tmp_path / "empty2"))], public_stores=[("pub", public)])


def test_finetune_adapts_to_a_users_signing_and_is_gated(base, tmp_path):
    root, public, models = base
    before = active_version(models)
    shift = (0.22, 0.12)
    user = _store(tmp_path / "user", ("u1", "u2"), shift, 11, kinds=USER_KINDS)
    evals = _store(tmp_path / "eval", ("u3",), shift, 23, per=4, kinds=USER_KINDS)
    out = finetune(root=models, user_stores=[("app", user)], eval_stores=[("eval", evals)],
                   public_stores=[("pub", public)], min_eval=6, epochs=15, lr=1e-3)
    acc = out["personal_accuracy"]
    assert out["user_training_recordings"] == 30 and out["evaluation_recordings"] == 12
    assert acc["before"] < 0.5                                # the base model does not know this user's variants
    assert acc["after"] > acc["before"] + 0.3 and out["promoted"]
    folder = models / "registry" / out["version"]
    assert (folder / "sign_model.joblib").exists()
    status = json.loads((folder / "status.json").read_text(encoding="utf-8"))
    if out["promoted"]:
        assert active_version(models) == out["version"] and status["state"] == "active"
        assert acc["after"] > acc["before"]
    else:
        assert active_version(models) == before and status["state"] == "inactive"
    # the base version is kept for rollback
    assert (models / "registry" / before / "sign_model.joblib").exists()


def test_finetune_without_enough_evaluation_data_is_never_activated(base, tmp_path):
    root, public, models = base
    before = active_version(models)
    user = _store(tmp_path / "user", ("u1",), (0.2, 0.1), 5, per=3)
    out = finetune(root=models, user_stores=[("app", user)], eval_stores=[("eval", DatasetStore(tmp_path / "none"))],
                   public_stores=[("pub", public)], min_eval=20, epochs=2)
    assert not out["promoted"] and "cannot be measured" in out["decision"]
    assert active_version(models) == before
