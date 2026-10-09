# Kannada SignBridge

**Real-Time Sign Language Recognition and Kannada Communication**: a final-year project prototype for continuous recognition of a supported Indian Sign Language (ISL) vocabulary, Kannada text output, facial-expression estimation, and Kannada → sign playback on a 3D avatar.

| Direction | What it does |
|---|---|
| Sign → Kannada | Webcam → MediaPipe hand + face landmarks (in the browser) → motion-based segmentation → trained classifier → stable, duplicate-free **Kannada gloss** transcript (editable, copyable, speakable) |
| Face | Separate rule-based estimate of the *visible* expression; never changes a sign's meaning |
| Kannada → Sign | Kannada text → NFC normalization → word/phrase dictionary → ordered ISL gloss sequence → avatar clips |

---

## Current status (be honest in the demo)

| Component | Status |
|---|---|
| Hand / face landmarks | **Real**: Google MediaPipe pretrained models, running locally (WASM + WebGL). Video never leaves the browser. |
| Recorded dataset | **Empty when delivered.** No public ISL dataset was available, so you must record your own samples with the app. |
| Sign classifier | **Not trained yet**, because there is no data. The full training/evaluation pipeline is implemented and tested. Accuracy shows as **“Not evaluated”** until you train. |
| Continuous recognition | **Real** pipeline: segments a continuous stream into supported isolated signs. It does not translate unrestricted ISL sentences. |
| Simulated demo mode | **Simulated**, purple badges everywhere, for showing the UI without a model. |
| Kannada text | Correct Unicode (NFC) for every supported word, bundled Noto Sans Kannada font. Output is a **Kannada gloss** in signing order, not grammatical translation. |
| Kannada → sign mappings | Word and phrase entries (e.g. ನಿಮ್ಮ ಹೆಸರು ಏನು → YOUR NAME WHAT); **all marked unverified** until an ISL expert reviews them. |
| Avatar clips | 16 **placeholder** clips (hand-written, *not verified ISL*). Replace each with a **captured** clip from your own recording; none are verified. Each clip has a review checklist (handshape, orientation, movement, location, non-manual). |
| Speech output | Installed Kannada system voice if present; optional online gTTS fallback (off by default, sends text to Google). |

---

## Setup (one time, Windows PowerShell)

Requirements: Windows 10/11, Python 3.12, Node.js 20, Chrome or Edge. Internet is needed only for installation.

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

This creates `backend\.venv`, installs `backend\requirements.txt`, runs `npm install` in `frontend` (copies the MediaPipe WASM runtime and installs the bundled Inter + Noto Sans Kannada fonts) and downloads the MediaPipe `.task` models if missing. On this laptop everything is already installed.

## Start the application

Terminal 1 (backend, http://127.0.0.1:8000):

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

Terminal 2 (frontend, http://127.0.0.1:5173):

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1
```

Open **http://127.0.0.1:5173** in Chrome or Edge. API docs: http://127.0.0.1:8000/docs

## Before the demonstration: record and train (≈ 40 min)

1. **Dataset & Model** → *Start camera*. Learn each sign from a verified ISL source (e.g. the ISLRTC dictionary) first.
2. Choose a sign → *Record 10 samples*. Each sample: hands down → sign once during the red REC window → hands down. Turn on *Review each sample* to replay and keep or discard every recording. Incomplete recordings are always shown for review.
3. Record **`_none`** too (raising/lowering hands, resting, scratching your face).
4. Press **New** and repeat for a second and a **third session**. With 3+ sessions, the latest session becomes an **independent test set**.
5. Check **Dataset validation** (rejected samples and reasons, too-few-sample warnings).
6. Click **Train model**. The progress bar shows the real stages; results appear under *Evaluation results* and on *About & Testing*.
   Command-line equivalent: `.\train-model.ps1`, then `.\evaluate-model.ps1` for error analysis.
7. Optional: **Use as avatar clip** per sign (retargets your latest recording onto the avatar).
8. Rehearse on **Live Recognition**. Start with 5–6 visually distinct signs.

## How it works

**Features** (`backend/app/recognition/landmarks.py`, schema `hands-face-v2`, 147 values per frame)
- **Per hand slot (73 values):** 20 wrist-relative landmarks divided by palm size (60 values; translation/scale invariant, rotation kept); image position + palm size; **position relative to the face** in face-widths (sign location); **finger direction + palm normal** (orientation); presence flag.
- **Per frame:** a face-present flag.
- **Missing hands** are flagged, never treated as zero-valued samples. Frames with no hands are never classified.

**Sequence model input** (`sequence_features.py`)
- Each segment is trimmed, short hand dropouts are filled, then it is resampled to 16 steps; wrist velocities and path length are added (2,444 features = 16 × 147 + 90 velocity + 2 path-length values).
- Training and live inference share this code. The model stores its feature schema, and an incompatible model is refused at load time.

**Segmentation** (`segmenter.py`, `pipeline.py`)
- A sign starts when hands enter the view or move.
- It ends at:
  1. a **motion minimum**: hand speed dips below 35% of the segment's peak for ≥ 100 ms, and the classifier is confident. This allows continuous signing without long pauses. A dip that yields the same sign again counts as a continuation, not a new word.
  2. a pause (configurable, default 600 ms).
  3. hands leaving the view.
  4. a 4 s maximum.
- Each segment is classified once, so a held sign is never repeated. A deliberately repeated sign is added again.
- Below the confidence threshold: “uncertain, not added”.
- The `_none` class rejects non-signs.
- Sliding-window mode (EMA smoothing + stability gate) is available as an experimental alternative.

**Training** (`backend/app/training/train_model.py`)
- **Data:** only validated samples are used (`app/dataset/validate.py`; the manifest is written to `backend/data/dataset_manifest.csv`).
- **Candidates:** logistic regression (**baseline**), RBF-SVM with calibrated probabilities, and an MLP neural network (128 hidden units, early stopping). All are class-balanced and use a fixed seed (42).
- **Augmentation** (training folds only): temporal crop, speed change, landmark jitter, position/scale shifts.
- **Model selection:** best macro-F1 on out-of-fold predictions from **StratifiedGroupKFold over recording sessions**. There is never a frame-level split.
- **Independent test:** with 3+ sessions, the latest session is held out. The baseline and the selected model are compared on it, and the held-out recordings are replayed through the live pipeline for a **continuous sign error rate**.
- **Saving:** the final model is refit on all valid data and saved with its metadata (version, classes = label encoder, feature schema, dataset hash, sklearn version). The previous model is archived to `backend/models/archive/`, and each run is appended to `backend/models/training_log.jsonl`.

**Kannada handling** (`backend/app/translation/kannada_mapping.py`, `frontend/src/services/transcript.ts`)
- **Display/storage text:** NFC plus tidy spacing; ZWJ/ZWNJ are kept.
- **Lookup keys:** additionally drop zero-width characters and punctuation.
- No ASCII filtering is applied anywhere. All JSON is UTF-8 with `ensure_ascii=False`.
- **Transcript:** words and inserted punctuation (`? . , !`); punctuation attaches to the previous word. Words can be corrected or removed, and copied text is NFC.
- **Unsupported words** get a bilingual warning: ಸಂಜ್ಞೆ ಲಭ್ಯವಿಲ್ಲ · No sign available.

## Configuration files

| File | Purpose |
|---|---|
| `backend/data/labels.json` | Sign class ID → ISL gloss, Kannada display text, English gloss, verified flag, notes |
| `backend/data/kannada_sign_mapping.json` | Normalized Kannada word/phrase → ordered sign IDs, verified flag, source, notes |
| `backend/data/animation_mapping.json` | Sign ID → clip file, type (placeholder/captured), verified flag, review checklist |
| `backend/data/animations/` | Clip JSON (`placeholder/`, `captured/`) |
| `backend/data/dataset/<label>/*.json` | Recorded landmark samples (no images) |
| `backend/data/dataset_manifest.csv` | Validation result for every sample (regenerated) |
| `backend/models/` | `sign_model.joblib`, `model_meta.json`, `metrics.json`, `training_log.jsonl`, `archive/` |
| `backend/app/config.py` | Feature schema, recognition thresholds, training defaults |

## Tests (last run 2026-10-09 on this laptop)

```powershell
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1
```

- **Backend pytest: 90 passed.** Covers:
  - Kannada Unicode with real strings (ನಮಸ್ಕಾರ, ಧನ್ಯವಾದಗಳು, ನೀರು, ಸಹಾಯ ಬೇಕು, ನಿಮ್ಮ ಹೆಸರು ಏನು?): NFC, viramas, ZWJ, JSON and HTTP round-trips.
  - Sign→Kannada and Kannada→sign mapping consistency, including phrase entries.
  - Dataset validation and the manifest.
  - Training, saving and loading; label-encoder consistency; archiving of the previous model; refusal of incompatible feature schemas.
  - Unknown/uncertain gestures.
  - Segmentation: hand-drop, pause and motion-minimum splits; continuation suppression; repeated signs; brief hand dropouts.
  - Duplicate suppression, smoothing, buffer limits and missing landmarks.
  - API validation, training-failure recovery and the WebSocket protocol.
- **Frontend vitest: 20 passed** (transcript editing, punctuation and NFC export; expression heuristic; avatar timeline). **TypeScript: no errors. Production build: OK.**
- **Pipeline check on synthetic test fixtures only** (in a temp folder, never shipped as the app's model): training, held-out-session evaluation and continuous-stream replay all ran. Scores on synthetic shapes say nothing about real-signer accuracy.
- **Browser smoke test:** all four pages, light/dark themes and a 375 px phone width (no horizontal scroll).
- **Not tested:** real webcam recognition, since there is no recorded data and the camera was not switched on during development. Use the checklist on the About & Testing page.

## Known limitations

- Recognises only the signs you record and train; generalisation to other signers depends on your data.
- Fluent co-articulated signing with no slowing between signs can merge two signs into one segment.
- Hand + face landmarks only (no body pose); depth is approximate.
- Kannada output is a gloss of recognised words, not grammatical ISL → Kannada translation. Kannada → sign is word/phrase lookup, and inflected forms work only if listed.
- Expression labels are heuristic estimates of visible facial movement.
- The avatar is a procedural prototype; no clip is verified ISL.
- Windows usually has no Kannada TTS voice; install one (Settings → Time & language → Speech) or enable the online fallback.

## Troubleshooting

| Problem | Fix |
|---|---|
| “Backend not connected” | Run `start-backend.ps1`; port 8000 must be free. |
| Camera blocked | Address bar → camera icon → Allow; close Zoom/Teams. |
| Scripts blocked | Run them with `powershell -ExecutionPolicy Bypass -File …` as shown above. |
| “different feature configuration” | The feature schema changed; retrain. |
| Training says “need at least 2 classes” | Record ≥ 3 valid samples for at least 2 classes (including `_none`). |
