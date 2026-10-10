# Data collection plan (Phase 6)

Code changes cannot fix what the data does not contain. These recordings are what would most improve
**live** recognition. The evidence is in the active model's held-out results
(`backend/models/registry/v20261010-081537/metrics.json`) and `backend/reports/phase6_*.json`.

## Why new data is needed
- **Few examples:** 15–42 videos per sign (imbalance 2.8×), from at most ~9 signer groups. The smallest signs (bird, black, cat, cow, dog, grey) have 15 videos each.
- **INCLUDE signs have one development group:** the greetings, pronouns and pleased classes come from a single development group (`include_train`) plus the official test group. Signer-independent validation is therefore impossible for 17 classes, and I/ME has **no test video at all**.
- **No non-sign data:** there is no `_none` class, so the model cannot learn to reject arbitrary movement. Every movement is forced into one of 63 signs.
- **No webcam recordings of you:** the real demonstration condition (your camera, room and signing) is absent from training and evaluation.

## Priority classes
Current evidence (Phase 7): the active model type (logreg + GRU ensemble), through the live pipeline, on a
**validation signer** (296 videos) and the **held-out test signers** (268 videos). Source:
`backend/reports/trace_live_pipeline_20261010-112552.json`. About 80% of the remaining live errors are
**model confusions** (the right sign is 2nd/3rd, or not in the top 3); these need more recordings, not code changes.
Record **both** signs of each confused pair.

| Priority | Signs | Evidence (recall on validation / test; confusions) |
|---|---|---|
| 1 | EAT, NOSE, AFTERNOON | EAT 0 / 0; NOSE→EAT 7 (val), EAT→NOSE 5 (test), AFTERNOON→EAT 4 (test) |
| 1 | CAT, BIRD, DOG (+ UMBRELLA, MONSOON, SIT, GOOD-EVENING, GOOD-MORNING) | CAT 0 / 0.33, BIRD 0 / 0.33, DOG 0 / –; CAT→UMBRELLA, BIRD→MONSOON, DOG→SIT |
| 1 | HELLO (namaskara), GOOD, GOOD-MORNING | HELLO 0 on validation; HELLO→GOOD 3 (test); GOOD-MORNING 0 (val) |
| 1 | `_none` (non-sign movement) | no data at all: needed to reject random movement and to measure false detections |
| 2 | RING, STOP, HAND, UMBRELLA, STAND | RING/STOP 0.33 (val); RING→UMBRELLA, HAND→RING, HAND→STAND |
| 2 | YOU-ARE-PERFECT + HOW-ARE-YOU, FATHER + BROTHER, BOY + GIRL, ANGRY + GIRL, MOTHER + BLACK, HELP + TEACHER | test recall 0.17 (YOU-ARE-PERFECT), 0.33 (ANGRY); pairs confused 2–3 times |
| 3 | MUSIC, FISH, FRIEND, SIT, WRITE, GREY, DRINK | recall ≤ 0.33 on one of the two sets |
| 3 | I/ME, HE, SHE, IT, WE, THEY, YOU, YOU-PLURAL, PLEASED, GOOD-AFTERNOON, GOOD-EVENING, GOOD-NIGHT, HOW-ARE-YOU, ALRIGHT | one signer group each (INCLUDE); I/ME has **no test video** |

**Minimum useful amount:**
- Priority 1: **3 new signers × 2 sessions × 8–10 repetitions** per sign (≈ 50 per sign). Today each sign has only 15–42 videos from at most ~9 signer groups.
- Priority 2: 2 signers × 2 sessions × 8 repetitions.
- Priority 3: 1–2 signers × 2 sessions.
- `_none`: 50+ clips across signers.

## Collection targets (Phase 8)
**These priorities come from recorded dataset videos replayed through the live pipeline. No webcam results
exist yet.** Re-rank them after the first two evaluation-only webcam sessions (`backend/reports/live_eval_*.json`):
the signs your camera actually gets wrong come first.

| Group (record ALL signs of the group) | Training recordings per sign | Signers × sessions | Variations within each session |
|---|---|---|---|
| EAT, NOSE, AFTERNOON | 50 | ≥ 3 × 2 | slow / normal / fast; hand near vs touching the mouth or nose; near / medium distance |
| CAT, BIRD, DOG + UMBRELLA, MONSOON, SIT | 50 | ≥ 3 × 2 | speed; centre / left / right; bright / dim |
| HELLO, GOOD, GOOD-MORNING | 50 | ≥ 3 × 2 | speed; distance; ending with hands lowered *and* with a still hold |
| FATHER, BROTHER, BOY, GIRL, MOTHER, BLACK | 30 | ≥ 3 × 2 | speed; lighting |
| RING, STOP, HAND, STAND, YOU-ARE-PERFECT, HOW-ARE-YOU, ANGRY, HELP, TEACHER | 30 | ≥ 3 × 2 | speed; distance |
| `_none` (non-sign) | 50+ clips | ≥ 3 × 2 | see below |

**Label and quality checks** (before training):
- **Before recording:** check the sign against a verified ISL reference. One person signs; a second person confirms the label while recording.
- **After each batch:** review samples with **Replay the last saved sample** and delete wrong or incomplete ones.
- **Validation:** Dataset & Model → Dataset validation must show no rejected samples for these classes, and each class must appear in ≥ 2 sessions.
- **Metadata:** the Signer ID is a real, distinct name per person (not `signer1`); press **New** for a fresh Session ID per session.
- **Ambiguous clips:** never relabel them automatically. Delete them, or keep them aside for a human decision.

**`_none` collection:**
- Choose `_none · background` and Purpose: Training data, at least 3 signers × 2 sessions.
- Record ordinary movement in front of the camera:
  - raising and lowering the hands, resting hands on the table;
  - scratching the face or head, adjusting hair or glasses, touching the mouth (important for EAT/NOSE);
  - pointing at something, waving to someone off-camera;
  - the transition movements between two signs.
- Keep 10+ separate `_none` clips per session as **Evaluation only** to measure false detections.

**Separation:**
- Evaluation sessions use Purpose: Evaluation only and, ideally, a signer who is **not** in the training recordings.
- Training never reads `data/eval_recordings` or `data/eval_sequences` (regression-tested).

## What to record
For **each priority sign**:
1. **At least 3 different signers.** More signers matter more than more repetitions.
2. **2 sessions per signer** on different days or under different lighting.
3. **8–10 repetitions per session**, using **Guided variation** so speed and hand position change between repetitions.
4. **Conditions** to vary across sessions:
   - distance: near / medium / far, with the face always in view;
   - lighting: bright / normal / dim;
   - camera position: straight on / slightly to the side.
5. **Verify each sign against a verified ISL source** (e.g. the ISLRTC dictionary) before recording. If unsure whether a recording is correct, **do not label it**: leave it out or mark it for review.

For **`_none`**: 50+ clips across signers, covering raising and lowering hands, scratching, adjusting hair or glasses, resting, typing or pointing, and transitions between signs.

For **sequences** (evaluation only): 10+ sequences of 3–5 signs per signer, signed at natural speed with natural transitions. Include repeated signs (HELLO HELLO).

Keep **one complete session per signer as evaluation-only** (Purpose: Evaluation only). It is never trained on and measures real webcam accuracy.

## How to record and import
- **In the app:** Dataset & Model → Recording settings. Set Signer ID (one per person) and Session ID (press **New** each session), Purpose: Training data (or Evaluation only), the conditions and Guided variation, then record. Samples are validated on save (hands present, frame count, label in the vocabulary).
- **Videos:** Dataset & Model → **Upload sign videos**. Use one label per batch, a ZIP with one folder per label, or a CSV/JSON annotation file (`file,label,signer,session[,start,end]`).
  - The **preview** lists every video's problems, plus a **label check before import**: unsupported labels, examples per class now → after import, classes still below the training minimum (5), new classes and **priority classes covered**.
  - Nothing is imported until you click Import. Labels are never inferred from file names unless you choose the folder convention.
- **Training:** after a video **import** (upload or dataset), an eligibility check queues one training job automatically when there are ≥ 20 new valid samples or a new class. **Webcam recordings made in the Record panel do not trigger training**: click **Retrain model** on Dataset & Model when ready. Either way, the new model is promoted only if it passes the evaluation gates; otherwise the current model stays active and older versions stay available for rollback.

## What not to do
- Do not relabel ambiguous clips automatically. Flag them, review them, then delete or keep.
- Do not create synthetic landmark samples. Augmentation (crop, speed, jitter, mirroring) happens only inside training.
- Do not put evaluation sessions into training. Use Purpose: Evaluation only.
