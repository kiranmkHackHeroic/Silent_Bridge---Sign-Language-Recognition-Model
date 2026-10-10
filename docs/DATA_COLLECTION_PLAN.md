# Data collection plan (Phase 6)

Code changes cannot fix what the data does not contain. These recordings are what would most improve
**live** recognition. The evidence is in `backend/reports/phase6_baseline.json` (per-class results on held-out
signers) and `phase6_face_parity.json`.

## Why new data is needed
- **Few examples:** 15–42 videos per sign (imbalance 2.8×), from at most ~9 signer groups. The smallest signs (bird, black, cat, cow, dog, grey) have 15 videos each.
- **INCLUDE signs have one development group:** the greetings, pronouns and pleased classes come from a single development group (`include_train`) plus the official test group. Signer-independent validation is therefore impossible for 17 classes, and I/ME has **no test video at all**.
- **No non-sign data:** there is no `_none` class, so the model cannot learn to reject arbitrary movement. Every movement is forced into one of 63 signs.
- **No webcam recordings of you:** the real demonstration condition (your camera, room and signing) is absent from training and evaluation.

## Priority classes
| Priority | Signs | Evidence |
|---|---|---|
| 1 | EAT, NOSE | EAT→NOSE is the most frequent confusion (5 of 6 EAT test videos); EAT recall 0 |
| 1 | STOP, RING | STOP→RING confusion; both recall 0 on test |
| 1 | GREY, HELLO (namaskara) | GREY→HELLO; HELLO test recall 0.14 |
| 1 | YOU-ARE-PERFECT, HOW-ARE-YOU | confused 3/6 |
| 2 | BOY, GIRL, MOTHER | BOY↔GIRL, GIRL→MOTHER |
| 2 | TEETH, DOG, BIRD, CAT, BLACK, COW, MONSOON, FATHER, BAD | test recall ≤ 0.33 or frequent confusions; smallest classes (15 videos) |
| 2 | I/ME, HE, SHE, IT, WE, THEY, YOU, YOU-PLURAL, PLEASED, GOOD-AFTERNOON, GOOD-EVENING, GOOD-NIGHT, HOW-ARE-YOU, ALRIGHT | single signer group (INCLUDE); I/ME has no test video |
| 1 | `_none` (non-sign) | needed for rejecting random movement and measuring false detections |

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
- **Videos:** Dataset & Model → Upload videos. Use one label per batch, a ZIP with one folder per label, or a CSV/JSON annotation file (`file,label,signer,session[,start,end]`).
  - The **preview** lists every video's problems, plus a **label check before import**: unsupported labels, examples per class now → after import, classes still below the training minimum (5), new classes and **priority classes covered**.
  - Nothing is imported until you click Import. Labels are never inferred from file names unless you choose the folder convention.
- After ≥ 20 new valid samples (or a new class), one training job is queued automatically. The new model is promoted only if it passes the evaluation gates; otherwise the current model stays active.

## What not to do
- Do not relabel ambiguous clips automatically. Flag them, review them, then delete or keep.
- Do not create synthetic landmark samples. Augmentation (crop, speed, jitter, mirroring) happens only inside training.
- Do not put evaluation sessions into training. Use Purpose: Evaluation only.
