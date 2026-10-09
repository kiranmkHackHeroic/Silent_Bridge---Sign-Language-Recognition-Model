# Kannada SignBridge

**Real-Time Sign Language Recognition and Kannada Communication**: a final-year research prototype for Indian Sign Language (ISL) recognition from a webcam, Kannada text output, facial-expression estimation, and Kannada → sign playback on a 3D avatar, trained and evaluated on **real public ISL datasets**.

| Direction | Pipeline |
|---|---|
| Isolated signs → Kannada | Webcam → MediaPipe hand + face landmarks (browser) → motion-based segmentation → trained classifier → duplicate-free Kannada gloss transcript |
| Sentence → Kannada | Webcam → landmark sequence of a whole sentence → BiGRU + CTC gloss decoder → closest ISL-CSLTR corpus sentence → Kannada sentence (draft translation) |
| Kannada → Sign | Kannada text → NFC normalisation → phrase dictionary (longest match) → ISL gloss sequence → avatar clips |
| Face | Separate rule-based estimate of the *visible* expression; never changes a recognised sign |

---

## Datasets (all CC BY 4.0, downloaded only from public files, checksums verified)

| Dataset | Use | Status on this laptop |
|---|---|---|
| **Amrita SLR – Real Time ISL Dataset** (Sasidharan et al., Mendeley Data, doi:10.17632/dtg9s785v8.1): 49 signs, 7 signers | Isolated signs | Downloaded; **956 / 978 videos accepted** (22 rejected: no usable hands) |
| **ISL-CSLTR** (Elakkiya & Natarajan 2021, Mendeley Data, doi:10.17632/kcmpdxky7p.1): 101 sentences, 492 sentence videos, gloss sequence per sentence | Continuous sentences | Downloaded; **492/492 videos imported** |
| **INCLUDE** (Sridhar et al., ACM MM 2020, doi:10.1145/3394171.3413528): Greetings + Pronouns categories only (5 GB of 57 GB) | Isolated signs, official train/test split | **Greetings: 253/253 videos imported.** Pronouns still downloading (Zenodo serves ~0.1–0.5 MB/s): when done, click **Import** on Dataset & Model (retraining is then queued automatically), or run `.\import-datasets.ps1 include` followed by `.	rain-model.ps1` |
| Your own webcam recordings (Dataset & Model page) | Isolated signs | Optional |

Registry with sources, licenses and citations: `backend/data/datasets_registry.json`. Class → app label → Kannada mappings: `backend/data/mappings/*.json`.

Annotation facts we found and handle (not hidden):
- **Amrita SLR** has no signer IDs. We infer **recording groups from the file-naming style** of each signer, only to keep a signer's repetitions together in splits. Labels come from the dataset's class folders.
- **ISL-CSLTR** gloss annotations contain typos and variants (`CONGRATULATIIONS`, `DONOT`/`DONT`/`DO NOT`, punctuation inside glosses). A documented normalisation map is applied for training; the original annotation is kept with every sample. There are no signer IDs (recording index from the file name), and 116 of 168 gloss types occur in only one sentence.
- **INCLUDE** was recorded in Chennai, and ISL varies regionally. Merged labels (e.g. HELLO from Amrita and INCLUDE) may combine regional variants.

## Results (measured on this laptop, 2026-10-10)

### Isolated-sign recognition: active model `v20261009-192223`
- **Data:** 1,123 valid videos, 55 signs (Amrita SLR 933 + INCLUDE Greetings 190 training/dev videos).
- **Independent test set:** 245 videos = INCLUDE's official test split + **two Amrita signers never seen in training**.

| Measure | Result |
|---|---|
| Overall accuracy / macro-F1 | **58.8% / 0.577** (chance ≈ 1.8%) |
| Amrita SLR, 2 unseen signers (213 videos) | **55.4%** |
| INCLUDE official test split (32 videos) | **81.3%** |
| Continuous replay of the test videos through the live pipeline | sign error rate 0.51 (50 substitutions, 74 missed, **0 extra words**) |
| Classifier latency | ≈ 1.8 ms per sign; backend ≈ 0.7–2.4 ms per frame |

- **Model comparison** (same signer-grouped CV folds on development data, macro-F1): logistic regression **0.450** (selected), GRU 0.427, RBF-SVM 0.381, MLP 0.370. With ~19 videos per sign the GRU temporal model does not beat the linear baseline.
- **Regularisation:** C=0.1 was chosen by a development-only sweep (`tools/tune_isolated.py`); the test set was never used for tuning.
- **Most confused pairs:** boy↔girl, eat↔nose, good morning↔hello: similar handshapes and locations.
- **Previous model** `v20261009-172730` (Amrita only, 49 signs) scored 56.3% on the same two unseen Amrita signers, so adding INCLUDE did not hurt Amrita (55.4%) and added 6 signs. It predates sample-ID tracking, so the registry reported that no fair head-to-head comparison was possible; new models record their training sample IDs for future comparisons.
- **Finding:** splitting signs at brief slow-downs ("motion minima") hurt on real signing (sign error rate 0.93 vs 0.48), because real ISL signs contain internal holds. It is off by default.

### Continuous sentence recognition: active model `c20261009-194444` (ISL-CSLTR)
- **Data:** 492 sentence videos (101 sentences, 168 normalised glosses).
- **Split:** by recording round: train 263 / validation 75 (early stopping and matcher choice) / **test 154** (unseen rounds rec4, rec5).

| Method (same 154 test videos) | Gloss error rate (↓) | Sentence accuracy |
|---|---|---|
| Sentence classifier baseline (32-step landmarks + logistic regression) | 0.883 | **20.1%** (31/154): **used live** |
| BiGRU + CTC gloss decoder, length-normalised nearest-sentence matching | **0.733** | 18.2% (28/154) |

Chance for sentence accuracy ≈ 1%. These are weak results: ~4 recordings per sentence, and 116 glosses appear in only one sentence. **This is closed-domain recognition of the corpus' sentences, not sign-language translation.**

### Avatar
All 55 recognisable signs have clips **retargeted from real dataset recordings** (Amrita SLR / INCLUDE). The source file and signer group are stored in `animation_mapping.json`. Arms are assigned by image position, so mirrored phone videos don't cross the arms. Retargeting is approximate (no elbow tracking, depth from hand size), and **no clip is verified ISL**. Signs without data keep the hand-written placeholders.

### Live path checks (no camera available)
`tools/replay_websocket.py` and `tools/replay_sentences.py` stream dataset landmark recordings frame by frame through the running server's WebSocket, exactly as the browser does.
- **Isolated mode:** 12/12 correct, but those videos were part of the deployed model's final training data, so this only proves the mechanics, not accuracy.
- **Sentence mode:** 2/8 on an unseen recording round, consistent with the measured ~20%.

## What is real / what is not

| Component | Status |
|---|---|
| Landmarks | MediaPipe 0.10.21 Hand + Face Landmarker, **same models and version in the browser and for dataset videos** (identical features) |
| Isolated classifier | **Trained on real ISL videos**, signer-independent test as above |
| Sentence model | BiGRU + CTC trained on ISL-CSLTR. **Closed domain**: only that corpus' ~100 sentences / 168 glosses, not open translation |
| Kannada output | Gloss of recognised signs; ISL-CSLTR sentences use **draft Kannada translations (AI-assisted, not reviewed by a native speaker)** |
| Kannada → Sign | 84+ dictionary entries incl. 29 everyday phrases with *proposed* ISL gloss order. **All unverified** |
| Avatar clips | Placeholder (hand-written) or captured from your recordings. **None verified ISL**; each has a review checklist |
| Facial expression | Heuristic estimate from blendshapes, not an emotion detector |
| Simulated demo mode | Scripted words, clearly badged |

## Setup (Windows PowerShell)

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
Installs the backend venv (FastAPI, scikit-learn, MediaPipe 0.10.21, OpenCV, CPU PyTorch, pandas, pyarrow 17, openpyxl) and the frontend (React/Vite, bundled Inter + Noto Sans Kannada fonts), and downloads the MediaPipe `.task` models. Already done on this laptop.

## Data and training workflow

```powershell
.\download-datasets.ps1                        # list datasets, sizes, licenses
.\download-datasets.ps1 amrita_slr isl_csltr   # ~10 GB, resumable, checksum-verified
.\import-datasets.ps1 amrita_slr include       # videos -> landmark samples (isolated)
.\import-datasets.ps1 isl_csltr                # sentence videos -> landmark sequences
.\train-model.ps1                              # isolated model -> registry -> promote if accepted
.\train-continuous.ps1                         # sentence model (BiGRU+CTC vs baseline)
.\evaluate-model.ps1                           # validation report, error analysis, latency
```
The same actions are available in the app on **Dataset & Model**: dataset import buttons, video upload (drag & drop, ZIP, CSV/JSON annotations, preview before import), background jobs (cancel/retry), the model registry (activate / restore previous) and training.

**Automatic retraining:** after each import job, an eligibility check runs. It needs ≥ 2 classes with ≥ 5 valid samples, data different from the active model's, and ≥ 20 new samples or a new class. Only then is **one** training job queued, so single uploads never trigger training. A new model becomes active only if its held-out macro-F1 ≥ 0.40, it is not worse than the active model on the same test samples (by more than 0.02), and it passes a reload + live-pipeline smoke test. Otherwise the previous model stays active. Jobs survive restarts.

## Start the application

Terminal 1:
```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```
Terminal 2:
```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1
```
Open **http://127.0.0.1:5173** (Chrome/Edge). API docs: http://127.0.0.1:8000/docs. Status: `/api/model/status`, `/api/model/registry`, `/api/datasets`, `/api/jobs`, `/api/continuous/status`.

## How recognition works
- **Features** (`backend/app/recognition/landmarks.py`, schema `hands-face-v2`, 147 values/frame): per hand, wrist-relative palm-scaled shape, image position, **face-relative position**, **finger direction + palm normal**, and a presence flag; plus a face flag. Missing hands are flagged, never zero-filled as a sign.
- **Isolated model input:** segment resampled to 16 steps + velocities = 2,444 values. Training augments with temporal crop, speed, jitter and **left/right mirroring** (left-handed signers, mirrored videos).
- **Live isolated mode:** a sign starts when hands enter or move, and ends at a pause (800 ms, adjustable) or when the hands drop. Each segment is classified once with a confidence threshold, an "uncertain" state and duplicate suppression.
- **Sentence mode:** one segment = one sentence (1.5 s pause or hands down) → CTC decoding → nearest corpus sentence → Kannada.

## Tests (2026-10-09)
- **Backend pytest: 112 passed.** Covers Kannada Unicode and phrases, mapping consistency, validation, training/saving/loading, encoder and schema checks, the registry (promote, reject, rollback), the job queue (restart recovery, cancel/retry, failure), training eligibility, video probing/extraction (no invented landmarks), annotation parsing, ZIP path-traversal refusal, upload preview label rules, GRU and CTC learning and reload, sentence mode, live-vs-dataset feature equality, API and WebSocket.
- **Frontend vitest: 20 passed. TypeScript clean. Production build OK.**
- **Webcam:** the browser pipeline (MediaPipe loading and inference) was verified, but **live recognition with a real person signing was not tested** during development. Use the checklist on the About & Testing page.

## Known limitations
- About 55–59% top-1 accuracy on unseen signers for 55 signs: usable for demonstrating clearly signed vocabulary, not reliable communication. Sentence mode is ~20% on unseen recordings.
- Amrita has ~19 videos per sign. Adding your own recordings (same camera and lighting as the demo) is the fastest way to improve live accuracy.
- There is no `_none` (non-sign) class in the public data. Record `_none` samples so random movements are rejected.
- Sentence mode only knows the ISL-CSLTR sentences; recording groups there are inferred.
- Kannada → Sign phrase glosses and all avatar clips are unverified.
- Windows usually has no Kannada TTS voice; the optional online fallback sends text to Google.
