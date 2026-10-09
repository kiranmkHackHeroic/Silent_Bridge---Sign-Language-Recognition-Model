# Kannada SignBridge — Real-Time Sign Language Communication

**Real-Time Continuous Sign Language Recognition, Facial Expression Analysis, and Bidirectional Kannada–Sign Language Translation Using an Animated Avatar** (final-year project prototype).

| Direction | What it does |
|---|---|
| Sign → Kannada | Webcam → MediaPipe hand landmarks (in the browser) → continuous, event-based recognition of **supported isolated signs** → stable, duplicate-free Kannada transcript → optional speech |
| Face | Separate, rule-based estimate of the *visible* facial expression (never changes a sign's meaning) |
| Kannada → Sign | Kannada text → normalization → longest-match lookup → ordered sign IDs → animation clips played on a 3D avatar |

---

## Honest status: what is real and what is not

| Component | Status |
|---|---|
| Webcam capture, hand & face landmarks | **Real.** Google MediaPipe pretrained Hand/Face Landmarker, running locally (WASM + WebGL). Video never leaves the browser; only landmark coordinates go to the local backend. |
| Sign classifier | **Trained on your own recordings.** No public ISL model/dataset was available in the environment, so the app ships a recording UI + training pipeline. **Until you record and train, no sign can be recognized.** |
| Continuous recognition | **Real.** Activity segmentation (pause / hand-drop boundaries) or sliding window + EMA smoothing + stability gate; confidence threshold; unknown/background handling; duplicate suppression. |
| Simulated demo mode | **Simulated**, clearly labelled in the UI (purple "SIMULATED" badges). Scripted words for showing the interface without a model. |
| Kannada mapping | Lexical word ↔ sign lookup. All entries are marked `verified: false` (no ISL expert review). Not grammatical translation. |
| Facial expression | Transparent heuristic over MediaPipe blendshapes. Not a trained emotion model, not calibrated, not an emotion detector. |
| Avatar | Procedural Three.js prototype avatar (IK arms + 15 finger joints). Clips are either **placeholder** (hand-written, *not verified ISL*) or **captured** (retargeted from your own recordings, still unverified). |
| Kannada speech output | Installed Kannada system voice if present; optional online gTTS fallback (off by default, sends text to Google). |
| Accuracy numbers | **Not measured yet**: they are produced only after you train, using out-of-fold evaluation grouped by recording session. Nothing in the app claims an accuracy figure it has not measured. |

---

## Requirements (tested on this machine)

- Windows 11, **Python 3.12.1**, **Node.js 20.11.1 / npm 10.4**
- Chrome or Edge (webcam + WebGL). Use `http://127.0.0.1:5173` (camera access requires localhost or HTTPS).
- Internet only for the one-time install (pip, npm, MediaPipe model download). The app itself runs offline.

## Setup (one time) — Windows PowerShell

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

`setup.ps1` creates `backend\.venv`, installs `backend\requirements.txt`, generates placeholder avatar clips, runs `npm install` in `frontend` (which copies the MediaPipe WASM runtime into `frontend\public\mediapipe-wasm`), and downloads `hand_landmarker.task` / `face_landmarker.task` into `frontend\public\models` if missing. On this machine everything is already installed.

Manual equivalent:

```powershell
cd $HOME\Desktop\KannadaSignBridge\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..\frontend
npm install
```

Optional online TTS fallback: `.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-optional.txt`

## Run

Terminal 1 (backend):

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

Terminal 2 (frontend):

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1
```

| URL | What |
|---|---|
| http://127.0.0.1:5173 | The application (Vite dev server; proxies `/api` and `/ws` to the backend) |
| http://127.0.0.1:8000/docs | FastAPI interactive API docs |
| http://127.0.0.1:8000/api/health | Health check |

## First-time workflow: make recognition work (≈ 30–40 min)

1. Open **Dataset & Model** → *Start camera*.
2. Learn each sign from a verified ISL reference (e.g. the ISLRTC Indian Sign Language dictionary).
3. For each sign: choose the label → *Record 10 samples*. For every sample: start with hands **down / out of view**, perform the sign once during the red **REC** window, lower your hands.
4. Record the **`_none`** class too (raising/lowering hands, scratching face, resting) so the model can reject non-signs.
5. Press **New** (new session ID) and record every sign again: at least **2 sessions** per sign, ideally with different lighting or a second signer. Evaluation is then session-independent.
6. Press **Train model on recorded data** (a few seconds). Results appear on **About & Testing**.
7. Optional: for each sign, **Use as avatar clip** retargets your latest recording onto the avatar (replaces the placeholder motion).
8. Go to **Live Recognition** and sign continuously, with a short pause or a hand drop between signs.

Tip for a reliable demo: start with 5–6 visually distinct signs and 15+ samples each over 2 sessions, then add more.

## Demonstration script (≈ 5 min)

1. **About & Testing:** explain the architecture and that video stays on the laptop.
2. **Live Recognition:** start the camera, show the landmark overlay and FPS. Perform 3–4 trained signs with pauses; point out the stable Kannada transcript, the confidence bar vs threshold, and that holding a sign still does **not** repeat it. Perform an untrained gesture to show the "uncertain" message. Correct a word via its dropdown; Copy / Speak.
3. **Expression:** smile / raise eyebrows; explain it is a separate estimate, not emotion and not sign meaning.
4. **Kannada to Sign:** type `ನಮಸ್ಕಾರ ನಾನು ನೀರು ದಯವಿಟ್ಟು ಬೆಂಗಳೂರು`, then show the timeline, the unsupported-word warning for ಬೆಂಗಳೂರು, pause/resume/replay, per-sign replay, and the placeholder vs captured badges.
5. **Dataset & Model → About:** show per-class counts, retrain, and walk through the per-class precision/recall/F1 and confusion matrix.

## How recognition works

- **Per frame** (`backend/app/recognition/landmarks.py`): each hand gives 20 wrist-relative landmarks divided by palm size (translation/scale invariant; orientation kept), plus wrist position, palm size and an explicit **presence flag**. Two hand slots give 128 values. Frames with no hands are never classified; a missing hand is flagged, not treated as a valid zero sample.
- **Segment mode (default)** (`segmenter.py`): a sign starts when hands enter the view or move, and ends when they are still for `still_ms` (UI slider), leave the view for 200 ms, or after 4 s. Each segment is classified **once**, so a stationary hand cannot produce repeats, and a new movement produces a new event.
- **Sliding mode (experimental)** (`sequence_buffer.py`, `temporal_smoothing.py`): a rolling 30-frame window is classified every 3 frames, with EMA probability smoothing and a stability gate (N consecutive agreeing evaluations above threshold). The emitted label is then locked and released after a hand-drop boundary or a sustained probability drop, with a cooldown between emissions.
- **Sequence features** (`sequence_features.py`): trim → fill short per-hand gaps → drop hand-less frames → resample to 16 steps → add wrist velocities and path length. Identical code runs at train and inference time, and the model file stores its feature config; a mismatched model is refused at load.
- **Classifier** (`training/train_model.py`): scikit-learn StandardScaler + LogisticRegression or calibrated RBF-SVM, chosen by out-of-fold macro-F1. Augmentation (crop, speed, jitter) is applied to training folds only.
- **Transcript** (`translation/sentence_builder.py`): confidence threshold → `_none`/unknown rejected → repeat of the same label within 600 ms suppressed → Kannada text from `data/labels.json`.

## Configuration files

| File | Purpose |
|---|---|
| `backend/data/labels.json` | Sign classes → Kannada / English text |
| `backend/data/kannada_sign_mapping.json` | Kannada word/phrase → sign ID (Kannada → Sign), with `verified` and `source` |
| `backend/data/animation_mapping.json` | Sign ID → avatar clip file, type (`placeholder` / `captured`), `verified` |
| `backend/data/animations/` | Clip JSON files (`placeholder/`, `captured/`) |
| `backend/data/dataset/<label>/*.json` | Your recorded landmark samples (no images) |
| `backend/models/` | `sign_model.joblib`, `model_meta.json`, `metrics.json` |
| `backend/app/config.py` | Feature config and recognition default thresholds |

## API

`GET /api/health` · `GET /api/model/status` · `GET /api/model/metrics` · `POST /api/model/train` · `GET|POST /api/vocabulary` · `POST /api/translate/kannada` · `GET /api/animations[/{sign_id}]` · `POST /api/animations/capture` · `POST /api/dataset/record` · `GET /api/dataset/summary` · `DELETE /api/dataset/samples/{label}/{id}` · `POST /api/tts` (optional, online) · `WS /ws/recognition`

## Tests

```powershell
powershell -ExecutionPolicy Bypass -File .\run-tests.ps1
```

Last run (2026-10-09, this machine):

- **Backend pytest: 59 passed.** Covers Kannada Unicode normalization (NFC, zero-width, punctuation, viramas), label→Kannada mappings, unknown/background handling, duplicate suppression, smoothing, stability gate, buffer boundaries, missing/invalid landmarks, segmentation, Kannada→animation lookup, unsupported/path-traversal animation handling, API health and invalid input, WebSocket protocol, model-loading errors (missing/corrupt/wrong format/feature mismatch), and an end-to-end **synthetic** train → load → continuous stream → transcript test. The synthetic data only proves the mechanics, not real-world accuracy.
- **Frontend vitest: 12 passed** (expression heuristic, animation interpolation, sequence timeline). **TypeScript: no errors. Production build: OK.**
- **Measured in the browser** (this laptop, GPU delegate, steady state): MediaPipe hand landmarks ≈ 42 ms/frame, face ≈ 31 ms on the frames where it runs (every 3rd frame).
- **Not tested automatically:** live webcam recognition with real signs. No sign data exists yet, and the camera was not switched on during development. Use the checklist below.

## Manual webcam test checklist

- [ ] Start camera → permission prompt → mirrored preview, FPS > 15
- [ ] Deny permission → clear "permission denied" message
- [ ] Unplug webcam while running → "camera disconnected" message
- [ ] Stop backend → "backend not connected"; it reconnects when restarted
- [ ] No hands → activity "idle", nothing added
- [ ] Hold one sign still for 5 s → added once
- [ ] Same sign twice with a pause → added twice
- [ ] Random non-sign movement → "uncertain"/"background", nothing added
- [ ] Threshold 90% → fewer, more confident words
- [ ] Pause → no new words; Resume → continues
- [ ] Cover face → expression "No face detected"
- [ ] Kannada → Sign with an unknown word → warning, word skipped

## Known limitations

- Recognizes only signs you have recorded and trained; generalization to other signers is limited by your data.
- Signs must be separated by a pause or a hand drop; fluent co-articulated signing is not segmented reliably.
- Hand landmarks only (no body pose). Location relative to the body is approximated from image position.
- Output is the ordered list of recognized words, not grammatical ISL → Kannada translation; Kannada → Sign is word lookup, not ISL grammar.
- Kannada morphology is not analysed: inflected forms are supported only if listed in `kannada_sign_mapping.json`.
- Expression labels are heuristic estimates of visible facial movement.
- The avatar is procedural. Captured clips use approximate retargeting (depth estimated from apparent hand size), and no clip is verified ISL.
- Windows usually has no Kannada TTS voice installed; speech output then needs a voice pack or the online fallback.

## Troubleshooting

- **"Backend not connected"**: run `start-backend.ps1`; check that port 8000 is free.
- **Camera blocked**: click the camera icon in the address bar → Allow; close Zoom/Teams if the camera is busy.
- **Scripts blocked**: use `powershell -ExecutionPolicy Bypass -File <script>` as shown.
- **Kannada text shows boxes**: Windows' "Nirmala UI" font supports Kannada; install "Noto Sans Kannada" if needed.
- **"model trained with a different feature configuration"**: you changed `FeatureConfig`, so retrain.

## Project structure

```
backend/
  app/main.py                  FastAPI app, REST + WebSocket
  app/config.py                paths, feature config, thresholds
  app/recognition/             landmarks, sequence_features, sequence_buffer,
                               segmenter, temporal_smoothing, predictor, pipeline
  app/translation/             kannada_mapping (normalize, vocabulary, lookup), sentence_builder
  app/animation/               retarget (recording → clip), library (clip mapping)
  app/dataset/store.py         landmark dataset storage
  app/training/train_model.py  training + session-grouped evaluation (CLI: python -m app.training.train_model)
  tools/make_placeholder_animations.py
  data/  models/  tests/
frontend/
  src/services/                api, WebSocket, MediaPipe loader, camera/vision hook, speech
  src/expression/              rule-based expression estimate (+ tests)
  src/avatar/                  Three.js rig, IK, animation timeline (+ tests)
  src/pages/                   LiveRecognition, KannadaToSign, DatasetModel, AboutTesting
  public/models/               MediaPipe .task models (downloaded)
```

Third-party: MediaPipe (Apache-2.0), Three.js (MIT), React (MIT), FastAPI (MIT), scikit-learn (BSD-3).
