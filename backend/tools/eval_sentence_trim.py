"""Should still-tail trimming also apply in SENTENCE mode? (It was validated for isolated signs only.)

ISL-CSLTR sentence videos are fed frame by frame through the live RecognitionSession in sentence mode with
the active continuous model, in two ending styles:
  lowered  hands drop after the sentence (as in the corpus videos)
  hold     the final pose is held still for 2 s -> the segment ends at the 1.5 s "still" boundary
with trimming on and off. Decision on the VALIDATION recording round; the test rounds are reported once.
Counted per video: correct accepted sentence, wrong accepted sentence, uncertain (not shown as a sentence).

Usage (from backend/):  python tools/eval_sentence_trim.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import LABELS_FILE, RecognitionSettings  # noqa: E402
from app.continuous.dataset import CONTINUOUS_DIR, load_samples  # noqa: E402
from app.continuous.recognizer import ContinuousRecognizer  # noqa: E402
from app.continuous.train import split_samples  # noqa: E402
from app.recognition.pipeline import RecognitionSession  # noqa: E402
from app.recognition.predictor import SignPredictor  # noqa: E402
from app.translation.kannada_mapping import Vocabulary  # noqa: E402

DT = 33.3


def stream(frames, style, rng):
    w, h = frames[0].get("w", 640), frames[0].get("h", 480)
    out, t = [{"t": i * DT, "w": w, "h": h, "hands": []} for i in range(10)], 10 * DT
    if style == "hold":
        idx = [i for i, f in enumerate(frames) if f.get("hands")]
        frames = frames[: idx[-1] + 1]
    t0 = frames[0]["t"]
    out += [{**f, "t": t + f["t"] - t0} for f in frames]
    t = out[-1]["t"] + DT
    if style == "hold":
        last = frames[-1]
        for _ in range(60):
            hands = [{**hd, "landmarks": [[p[0] + rng.normal(0, 3e-4), p[1] + rng.normal(0, 3e-4), p[2] if len(p) > 2 else 0.0]
                                          for p in hd["landmarks"]]} for hd in last["hands"]]
            out.append({**last, "t": t, "hands": hands}); t += DT
    out += [{"t": t + i * DT, "w": w, "h": h, "hands": []} for i in range(30)]
    return out


def run(samples, raw, cont, vocab, predictor, style, trim):
    res = {"correct": 0, "wrong": 0, "uncertain": 0, "no_sentence": 0}
    rng = np.random.default_rng(0)
    for s in samples:
        sess = RecognitionSession(predictor, vocab, RecognitionSettings(mode="sentence", trim_still_tail=trim), continuous=cont)
        sent = [e for f in stream(raw[s["sample_id"]], style, rng) for e in sess.process(f) if e["type"] == "sentence"]
        if not sent:
            res["no_sentence"] += 1
            continue
        r = max(sent, key=lambda e: e.get("frames", 0))
        if r.get("accepted") is False:
            res["uncertain"] += 1
        elif r["sentence_id"] == s["sentence_id"]:
            res["correct"] += 1
        else:
            res["wrong"] += 1
    return res


def main():
    cont = ContinuousRecognizer()
    assert cont.load(), cont.error
    predictor = SignPredictor()
    predictor.load()
    vocab = Vocabulary(LABELS_FILE)
    raw = {}
    for f in (CONTINUOUS_DIR / "isl_csltr").glob("*/*.json"):
        d = json.loads(f.read_text(encoding="utf-8"))
        raw[d["sample_id"]] = d["frames"]
    _, val, test, test_groups, val_group = split_samples(load_samples())
    report = {"continuous_model": cont.status()["version"], "validation_round": val_group, "test_rounds": test_groups}
    for name, part in (("validation", val), ("test", test)):
        part = [s for s in part if s["sample_id"] in raw]
        report[name] = {}
        for style in ("lowered", "hold"):
            for trim in (False, True):
                key = f"{style}{'_trim' if trim else ''}"
                report[name][key] = run(part, raw, cont, vocab, predictor, style, trim)
                print(f"[{name}] {key:13s} {report[name][key]} (n={len(part)})", flush=True)
        if name == "validation":
            v = report["validation"]
            keep = (v["hold_trim"]["correct"] >= v["hold"]["correct"] and v["hold_trim"]["wrong"] <= v["hold"]["wrong"]
                    and v["lowered_trim"]["correct"] >= v["lowered"]["correct"])
            report["trim_in_sentence_mode_decision_on_validation"] = keep
            print("keep trimming in sentence mode (validation):", keep, flush=True)
    Path("reports").mkdir(exist_ok=True)
    Path("reports/eval_sentence_trim.json").write_text(json.dumps(report, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
