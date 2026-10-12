# Kannada SignBridge

**Real-Time Sign Language Recognition and Kannada Communication**: a final-year research prototype for Indian Sign Language (ISL) recognition from a webcam, Kannada text output, facial-expression estimation, and Kannada → sign playback on a 3D avatar, trained and evaluated on **real public ISL datasets**.

| Direction | Pipeline |
|---|---|
| Isolated signs → Kannada | Webcam → MediaPipe hand + face landmarks (browser) → motion-based segmentation → trained classifier → duplicate-free Kannada gloss transcript |
| Isolated signs → meaning | Recognised sign sequence → ISL gloss sequence → **English meaning** → Kannada sentence (phrase-level, whole sequence; word-by-word parts and unknown signs are marked) |
| Sentence → Kannada | Webcam → landmark sequence of a whole sentence → BiGRU + CTC likelihood fused with a sentence classifier → closest ISL-CSLTR corpus sentence → English → Kannada sentence (draft translation) |
| Kannada → Sign | Kannada text → NFC normalisation → phrase dictionary (longest match) → English meaning + ISL gloss plan → avatar clips |
| Face | Separate rule-based estimate of the *visible* expression; never changes a recognised sign |

## Current status (2026-10-11)

| Component | Active version | Measured on recorded videos (held out) | Real webcam |
|---|---|---|---|
| Isolated signs (63) | `v20261010-101617`: logistic regression + GRU ensemble, face-crop landmarks (bit-identical retrain of `v20261010-081537`) | **72.4% accuracy / macro-F1 0.708** on 268 videos of unseen signers (Amrita SLR unseen signers 67.1%, INCLUDE official test split 92.7%) | **not measured yet** |
| Confidence threshold | **0.40**, calibrated on out-of-fold development data (precision 0.50, recall 0.42) | | |
| Sentences (101, closed set) | `c20261010-051510`: BiGRU + CTC likelihood fused with a sentence classifier; posterior < 0.5 is shown as "uncertain" | **29.2%** (45/154) on unseen recording rounds; 43 of the 122 shown sentences correct | **not measured yet** |
| Avatar | 63 clips retargeted from dataset recordings + 8 hand-written placeholders | **none verified as ISL** | |

- **Recorded-video accuracy is not webcam accuracy.** All numbers above come from dataset videos. Webcam accuracy must be measured with [`docs/LIVE_TEST_PROCEDURE.md`](docs/LIVE_TEST_PROCEDURE.md) (two *Evaluation only* sessions).
- **Sentence mode is a closed set:** it can only output one of the ISL-CSLTR corpus' 101 sentences. It is not open sign-language translation.
- A Phase 11 attempt to improve the sentence model was **rejected** (22.1% vs 29.2% on the same test videos): [`docs/PHASE11_REPORT.md`](docs/PHASE11_REPORT.md).
- Kannada wording, ISL phrase orders and all avatar clips still need review by native Kannada speakers and ISL users.

## Demo workflow (5 minutes)
1. Start both servers (see [Start the application](#start-the-application)) and open **http://127.0.0.1:5173** in Chrome or Edge.
2. **Live Recognition → Start camera.** Allow camera access. Sit 1–1.5 m away with face and both hands visible, in front lighting.
3. Sign a trained word (e.g. HELLO/namaskara, THANK YOU, GOOD), then lower your hands. The word appears as *pending* with its confidence and alternatives, then joins the Kannada transcript. Low-confidence signs are listed as *uncertain* and never added automatically.
4. Sign two or three words with a short pause between them. The **Meaning** panel shows the ISL gloss sequence, an English meaning and a Kannada sentence when the sequence is in the phrase table; otherwise it is marked "word-by-word". Press **Speak** to hear the Kannada (needs a Kannada voice, see limitations).
5. **Kannada to Sign:** type or pick ನಮಸ್ಕಾರ or ನಿಮ್ಮ ಹೆಸರು ಏನು? and the avatar plays the sign sequence. Unsupported words are listed as skipped, never guessed.
6. **About & Testing:** measured results, the browser-vs-Python pipeline check, and the model and data audit.

---

## Datasets (all CC BY 4.0, downloaded only from public files, checksums verified)

| Dataset | Use | Status on this laptop |
|---|---|---|
| **Amrita SLR – Real Time ISL Dataset** (Sasidharan et al., Mendeley Data, doi:10.17632/dtg9s785v8.1): 49 signs, 7 signers | Isolated signs | Downloaded; **956 / 978 videos accepted** (22 rejected: no usable hands) |
| **ISL-CSLTR** (Elakkiya & Natarajan 2021, Mendeley Data, doi:10.17632/kcmpdxky7p.1): 101 sentences, 492 sentence videos, gloss sequence per sentence | Continuous sentences | Downloaded; **492/492 videos imported** |
| **INCLUDE** (Sridhar et al., ACM MM 2020, doi:10.1145/3394171.3413528): Greetings + Pronouns categories only (5 GB of 57 GB) | Isolated signs, official train/test split | **Greetings 253 + Pronouns 231 videos imported** (484/484 accepted, checksums verified) |
| Your own webcam recordings (Dataset & Model page) | Isolated signs | Optional |

Registry with sources, licenses and citations: `backend/data/datasets_registry.json`. Class → app label → Kannada mappings: `backend/data/mappings/*.json`.

Annotation facts we found and handle (not hidden):
- **Amrita SLR** has no signer IDs. We infer **recording groups from the file-naming style** of each signer, only to keep a signer's repetitions together in splits. Labels come from the dataset's class folders.
- **ISL-CSLTR** gloss annotations contain typos and variants (`CONGRATULATIIONS`, `DONOT`/`DONT`/`DO NOT`, punctuation inside glosses). A documented normalisation map is applied for training; the original annotation is kept with every sample. There are no signer IDs (recording index from the file name), and 116 of 168 gloss types occur in only one sentence.
- **INCLUDE** was recorded in Chennai, and ISL varies regionally. Merged labels (e.g. HELLO from Amrita and INCLUDE) may combine regional variants.

## Results history (measured on this laptop)

**Project reports:**
- **Phase 5:** audit, English meaning layer, phrases: [`PHASE5_REPORT.md`](docs/PHASE5_REPORT.md).
- **Phase 6:** accuracy, ensemble: [`PHASE6_REPORT.md`](docs/PHASE6_REPORT.md).
- **Phases 7–8:** live evaluation tooling: [`PHASE7_REPORT.md`](docs/PHASE7_REPORT.md), [`PHASE8_REPORT.md`](docs/PHASE8_REPORT.md).
- **Phases 9–10:** ISL-only data audit, sentence partials: [`PHASE9_REPORT.md`](docs/PHASE9_REPORT.md), [`PHASE10_REPORT.md`](docs/PHASE10_REPORT.md).
- **Phase 11:** sentence-model candidate, rejected: [`PHASE11_REPORT.md`](docs/PHASE11_REPORT.md).

**Phase 6 (accuracy):** the logreg + GRU ensemble on face-crop landmarks (`v20261010-081537`, retrained bit-identically as the active `v20261010-101617`) reaches **72.4% accuracy / macro-F1 0.708** on the same 268 held-out videos where the previous model scored 59.7% / 0.591. Sentence mode marks low-confidence sentences as uncertain (`c20261010-051510`). What to record next: [`docs/DATA_COLLECTION_PLAN.md`](docs/DATA_COLLECTION_PLAN.md).

**Phase 5 (audit, English intermediate layer, continuous decoder, phrases, avatar): see [`docs/PHASE5_REPORT.md`](docs/PHASE5_REPORT.md).** Supported phrases: [`docs/PHRASES.md`](docs/PHRASES.md).

### Isolated-sign recognition: previous model `v20261009-225256` (superseded in Phase 6, kept for rollback)
- **Data:** 1,290 valid videos, **63 signs**: Amrita SLR 933, INCLUDE Greetings + **Pronouns** 357 (Pronouns imported 2026-10-10: 484/484 videos accepted, 8 new signs).
- **Independent test set:** 268 videos = INCLUDE's official test split + **two Amrita signers never seen in training**.

| Measure | Result |
|---|---|
| Overall accuracy / macro-F1 | **59.7% / 0.591** (chance ≈ 1.6%) |
| Amrita SLR, 2 unseen signers (213 videos) | **54.5%** |
| INCLUDE official test split (55 videos) | **80.0%** |
| Continuous replay of the test videos (threshold 0.6, short gaps) | sign error rate 0.485 (55 substitutions, 74 missed, 1 extra word) |
| Confidence threshold (calibrated, see below) | **0.45**: validation precision 0.48, recall 0.38 |
| Classifier latency | a few ms per sign; backend ≈ 0.7 ms per frame |

- **Model comparison** (signer-grouped CV on development data, macro-F1): logistic regression **0.397** (selected), GRU 0.373, MLP 0.359, RBF-SVM 0.342. With ~19 videos per sign the GRU temporal model does not beat the linear baseline.
- **Most confused pairs:** boy↔girl, eat↔nose, grey→hello, stop→ring: similar handshapes and locations.
- **Promotion history** (`models/registry/*/status.json`):
  - `v20261009-204853` (same data, first with calibration) was compared with `v20261009-192223` on the identical 245-video test set: 59.6% / 0.570 vs 58.8% / 0.577, within the 0.02 tolerance.
  - `v20261009-225256` added 8 pronoun signs. On the identical 213 Amrita unseen-signer videos it scores 54.5% vs 55.9% (3 videos fewer). The previous versions did not store per-sample predictions, so no macro-F1 head-to-head was possible. From now on each version stores its development-only prediction per test video, and the registry compares versions on the held-out videos they share.
- **Face-dropout augmentation** (randomly blanking the face-relative features in training) was tested because the browser-vs-Python check showed face-detection flicker under hand occlusion. It lowered development CV macro-F1 (0.539 vs 0.544), so it is **off**. The decision used development data only: the test set happened to favour it (0.604 vs 0.591), and that was not used.
- **Finding:** splitting signs at brief slow-downs ("motion minima") hurts on real signing (see the segmentation table below). It is off by default.

### Continuous sentence recognition (ISL-CSLTR): decoder comparison
The networks below are those of `c20261010-005738`. The active `c20261010-051510` uses the same networks with the fused decoder and adds an "uncertain" threshold (posterior 0.5, chosen on validation).
- **Data:** 492 sentence videos (101 sentences, 168 normalised glosses).
- **Split:** by recording round: train 263 / validation 75 / **test 154** (unseen rounds rec4, rec5).
- **Decoder chosen on the validation round only** (`tools/eval_continuous_decoders.py`). The validation classifier was fitted on the training rounds only. The original selection compared test accuracies, which is now fixed.

| Decoder (same networks, same 154 test videos) | Test sentence accuracy | Gloss error rate of chosen sentence |
|---|---|---|
| Sentence classifier (previously live) | 20.1% (31/154) | 0.883 |
| BiGRU + CTC greedy path → nearest sentence | 18.2% | 0.742 |
| CTC full likelihood of each corpus sentence | 22.1% | 0.724 |
| **CTC likelihood + sentence classifier (used live)** | **29.2% (45/154)** | **0.685** |

Chance for sentence accuracy ≈ 1%. These are weak results: ~4 recordings per sentence, and 116 glosses appear in only one sentence. **This is closed-domain recognition of the corpus' sentences, not sign-language translation.**

### Avatar
All 63 recognisable signs have clips **retargeted from real dataset recordings** (Amrita SLR / INCLUDE). On Dataset & Model, **Use as avatar clip** can replace a sign's clip with your newest webcam recording or uploaded video of it. The source file and signer group are stored in `animation_mapping.json`. Arms are assigned by image position, so mirrored phone videos don't cross the arms. Retargeting is approximate (no elbow tracking, depth from hand size), and **no clip is verified ISL**. Signs without data keep the hand-written placeholders.

### Continuous segmentation (consecutive signs, no button presses)
`tools/eval_segmentation.py`: held-out recordings are joined into 50 streams of 5 signs with **exact known boundaries**. ISL-CSLTR has no temporal annotations, so it cannot be used for this. The streams are fed frame by frame through the live pipeline. The evaluation model is trained on development signers only. Variants are **chosen on 3 validation folds of development signers** and then **reported on the test signers**. Full report: `backend/reports/segmentation_eval*.json`, also shown on About & Testing.

| Test signers, sign error rate (S / D / I of 245 signs) | short hands-down pause | back to back | hands never lowered (synthetic) |
|---|---|---|---|
| **Current: pause 800 ms / hands absent 200 ms (default)** | **0.473** (76 / 36 / 4) | **0.539** | 0.857 (76 / 134 / 0) |
| absent 400 ms + pause 600 ms (best on validation by 0.04) | 0.522 | 0.559 | 0.869 |
| split at motion minima (dip split) | 1.224 (204 extra words) | 1.171 | 1.143 |
| sliding window + stability gate | 0.841 (90 extra words) | 0.861 | 0.861 |
| classifier-verified split of long segments (new, experimental switch) | 0.743 | 0.775 | **0.727** |

- With perfect boundaries the same classifier gets 54.3% of these recordings right. Segmentation with a short pause therefore costs little: most errors are **classifier substitutions**, not boundary errors, and there are almost no extra words.
- **Consecutive signs without lowering the hands are the weak case.** Signs merge into one segment, so one word is lost (134 deletions). The classifier-verified split recovers some of them (0.857 → 0.727) but wrongly splits long single signs during normal signing, so validation rejected it (mean SER 0.969 vs 0.759). It is an opt-in switch on Live Recognition, off by default.
- The pause and absence variants differed by < 0.05 and flipped between validation and test signers, so the **defaults were not changed**: the evidence does not support a change. Motion features are never disabled to improve a score.
- **Repeated signs** (e.g. HELLO HELLO) are kept: duplicates are suppressed only within 600 ms of the same sign; a new movement segment is a new word.

### Live pipeline checks without a camera (browser vs Python)
The **Video-file pipeline test** (About & Testing) plays a dataset video into the **same browser MediaPipe pipeline as the webcam**. It steps frame by frame at the video's frame rate, streams the landmarks over the WebSocket, and compares them with the Python (training-time) extraction of the same file. Measured on 8 videos (4 Amrita SLR, 4 INCLUDE; all in the final model's training data, so **consistency only, not accuracy**):

| Measure | Result |
|---|---|
| Hand presence agreement | 91.8–100% per video |
| Handedness label agreement | 81.5–100% (mirroring augmentation makes the model robust to the 81.5% case) |
| Median landmark distance | 0.002–0.007 image units |
| Whole-clip prediction, browser vs Python features | **same label in 7/8** |
| Live pipeline output (segmentation + classifier) | correct single word in 6/8 |

Diagnosis of the mismatches, made with the new per-block report:
- **`namaskara` (manideep):** the face was detected in the same frames only 59% of the time. The hands cover the face during this sign, and detection under occlusion is borderline at both resolutions. The face-relative block differed by 0.80 while all other blocks differed by < 0.05. The response was **face-dropout augmentation** in training (see below).
- **`cat` (nachiketh):** the live segmenter split the sign in two at a brief hand-detection gap. This is a **segmentation** error, visible as two decisions in the diagnostics table.

Older tools: `tools/replay_websocket.py` (isolated, mechanics only) and `tools/replay_sentences.py` (sentence mode, 2/8 on an unseen round).

## What is real / what is not

| Component | Status |
|---|---|
| Landmarks | MediaPipe 0.10.21 Hand + Face Landmarker, **same models and version in the browser and for dataset videos** (identical features) |
| Isolated classifier | **Trained on real ISL videos** (63 signs), signer-independent test as above, validation-calibrated threshold |
| Sentence model | BiGRU + CTC trained on ISL-CSLTR. **Closed domain**: only that corpus' ~100 sentences / 168 glosses, not open translation |
| Kannada output | Kannada word for each recognised **ISL gloss**, shown with the gloss, in signing order: **not a grammatical translation**. Every label's wording got an AI-assisted check (`kannada_review` in labels.json; *understand* corrected to ಅರ್ಥಮಾಡಿಕೊಳ್ಳು); native-speaker review pending. ISL-CSLTR sentences use draft translations |
| Phrase dictionary | 72 phrases in 11 categories ([list](docs/PHRASES.md)), 59 recognisable from the camera. Ambiguous sign sequences (question vs statement) list both readings. **All unverified** |
| Avatar clips | Retargeted from dataset videos (source dataset, sample ID, file and signer group shown on Kannada → Sign) or placeholders. Extraction from a video does **not** make a clip correct ISL: **none is verified** |
| Facial expression | **Heuristic** estimate from blendshapes (labelled "heuristic"), separate from the sign classifier, "No face detected" when the face is hidden. Not an emotion detector |
| Simulated demo mode | Scripted words, clearly badged |

## Setup (Windows PowerShell)

```powershell
cd $HOME\Desktop\KannadaSignBridge
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```
Installs the backend venv (FastAPI, scikit-learn, MediaPipe 0.10.21, OpenCV, CPU PyTorch, pandas, pyarrow 17, openpyxl) and the frontend (React/Vite, bundled Inter + Noto Sans Kannada fonts), and downloads the MediaPipe `.task` models. Already done on this laptop.

**Requirements:** Python 3.12, Node.js 18+, Chrome or Edge (camera access needs `http://127.0.0.1` or `localhost`). **macOS/Linux:** equivalent shell scripts exist: `start-backend.sh`, `start-frontend.sh`, `download-datasets.sh`, `import-datasets.sh`, `train-model.sh`. They expect the venv at `backend/.venv` (`python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt`, then `npm install` in `frontend/`).

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

**Uploads** are isolated signs only (one sign per video, label chosen explicitly, never guessed from file names). Uploaded videos always become **training** data. To measure accuracy, record with the in-app recorder using *Evaluation only*. New signs need about 5 or more videos each before training uses them (minimum 3; 10–15 recommended).

**Sentence model training** (Dataset & Model → *Train candidate sentence model*) saves an **inactive candidate** and never replaces the active sentence model. Replacing it requires the gated comparison on the same held-out test videos (`tools/train_continuous_candidate.py`), because a single training run varies by about 9 points with the random seed.

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

### Camera setup and troubleshooting
| Message in the app | What to do |
|---|---|
| Camera permission denied | Click the camera icon in the address bar → *Allow*, then **Start camera** again. On Windows, also check Settings → Privacy & security → Camera → *Let desktop apps access your camera* |
| No camera found / camera in use | Close Teams, Zoom or the Camera app, then press **Start camera**; pick the right device in the camera list |
| "This browser does not support camera access" | Use a recent Chrome or Edge at `http://127.0.0.1:5173` (not a file:// page or an embedded preview) |
| Hands detected but no words | Lower your hands or pause briefly after each sign; keep both hands and your face in view; check **Pipeline diagnostics** (all 6 stages green) |
| Backend disconnected | Start `start-backend.ps1`; the page reconnects automatically |

## Diagnosing the live pipeline
Live Recognition → **Pipeline diagnostics** shows each stage for the current frame and for every decided segment:

| Stage | Shown |
|---|---|
| 1 Camera | Resolution, requested and processed FPS, frame interval (jitter). Preview is mirrored; landmarks are sent **un-mirrored**, like the training videos |
| 2 Detection | Hands valid / sent, MediaPipe label → **signer's hand** (unmirrored: MediaPipe "Left" = signer's right), detection score, **palm facing** (towards/away/sideways), wrist position in face widths, face visible |
| 3 Features | 147 values/frame and a check that they are finite and match schema `hands-face-v2`; face-relative block filled or empty |
| 4 Segmentation | Activity, motion, frames in the segment, why it ended (pause / hands absent / max length) |
| 5 Classification | Threshold and its source (**calibrated on validation data**), top guess, latency, **out-of-distribution score** (mean z-score vs. the training data's 99th percentile, and the most different feature block) |
| 6 Translation | Label → Kannada, or "no Kannada text" |

Every segment result names the **stage that decided it**: segmentation (too short, duplicate, continuation), classification (below threshold, `_none`, out of distribution → *features*), translation, or ok. **Save diagnostics snapshot** stores the last ~20 s of landmarks and decisions (no video) in `backend/data/diagnostics/`.

**Confidence threshold:** calibrated per model on out-of-fold development predictions by maximising the F1 of accepted words. A `_none` recording predicted as a sign counts as a wrong word. Active model: **0.40** (precision 0.50, recall 0.42, F1 0.46 on 1,022 out-of-fold development predictions). The slider overrides it, and "Use calibrated value" restores it.

**Word confirmation:** recognised words first appear as **pending**, showing the ISL gloss, the Kannada word, the confidence and the next two alternatives. You can add, pick an alternative, choose any other word or reject. In auto mode a pending word is added after a countdown (default 4 s). Uncertain predictions are listed separately and never added unless you click them. Transcript words show their ISL gloss above the Kannada.

## Measuring live performance (your webcam)
Step-by-step procedure: [`docs/LIVE_TEST_PROCEDURE.md`](docs/LIVE_TEST_PROCEDURE.md).
- Record with **Purpose: Evaluation only**. These recordings are stored in `data/eval_recordings` and `data/eval_sequences` and **never trained on**. Record in a new session, plus `_none` movements and **sign sequences** (several signs in a row with the order declared).
- Recording conditions are stored with every sample: speed, distance, lighting and hand position. **Guided variation** asks for a different speed and position on each sample.
- **Dataset & Model → Live evaluation**, or `python tools/evaluate_live.py`, reports accuracy, macro precision, recall and F1, rejected words, **false detections** (`_none` → word), accuracy per condition, confusions, and the sign error rate (substitutions, deletions, insertions) of the sequences.
- **No live webcam numbers are reported here:** the camera is blocked in the development environment, so they must be measured by you with this procedure.

## How recognition works
- **Features** (`backend/app/recognition/landmarks.py`, schema `hands-face-v2`, 147 values/frame): per hand, wrist-relative palm-scaled shape, image position, **face-relative position**, **finger direction + palm normal**, and a presence flag; plus a face flag. Missing hands are flagged, never zero-filled as a sign.
- **Isolated model input:** segment resampled to a fixed number of steps + velocities. The active model uses 16 steps (2,444 values). New models are trained with 24 steps (`FeatureConfig.resample_frames`). Each model is always run with the step count stored in it, so changing the default never breaks an existing model. Training augments with temporal crop, speed, jitter and **left/right mirroring** (left-handed signers, mirrored videos).
- **Live isolated mode:** a sign starts when hands enter or move, and ends at a pause (800 ms, adjustable) or when the hands drop. Each segment is classified once with a confidence threshold, an "uncertain" state and duplicate suppression.
- **Sentence mode:** one segment = one sentence (1.5 s pause or hands down) → CTC decoding → nearest corpus sentence → Kannada.

## Tests (2026-10-11)
Run everything with `.\run-tests.ps1`, or `cd backend; .\.venv\Scripts\python.exe -m pytest -q` and `cd frontend; npx vitest run; npx tsc --noEmit; npm run build`.
- **Backend pytest: 156 passed.** Added since Phase 6:
  - live evaluation, cause attribution and still-tail trimming (Phases 7–8);
  - sentence partials and integrity exclusions (Phase 9);
  - extractor version, unlisted-video opt-in and McNemar (Phase 11);
  - avatar clips from uploaded videos;
  - sentence-model training that never replaces the active model;
  - refusal of sentence-video uploads.
- History: 137 passed at Phase 6 (Phase 6 adds the ensemble model type and the upload label summary). Phase 5: (Phase 5 adds: sequence-level meaning, ambiguity and unknown signs, phrase-table integrity, Unicode API round trip, reverse ISL ordering, dictionary edits do not trigger retraining, webcam threshold selection with false detections). Earlier: Adds diagnostics per frame and per stage, the OOD score, threshold calibration (F1, `_none` false alarms), browser-vs-Python comparison, snapshot API, evaluation-only storage (never mixed with training data), sequence recordings and the live evaluation report, the classifier-verified split, face-dropout augmentation, and the registry's fair comparison on an identical test set. Earlier coverage: Kannada Unicode, phrases, mapping consistency, validation, training/saving/loading, registry promote/reject/rollback, job queue, eligibility, video extraction, ZIP path traversal, GRU/CTC, sentence mode, API and WebSocket.
- **Frontend vitest: 25 passed** (adds Kannada speech text and expression-label stability). **TypeScript clean. Production build OK.**
- **Browser pipeline:** verified with real dataset videos through the same in-browser MediaPipe → WebSocket path (table above).
- **Webcam:** the development environment blocks camera access (the app correctly shows its "permission denied" message), so **live signing with a real person was not tested** and no live accuracy is claimed. Measure it with [`docs/LIVE_TEST_PROCEDURE.md`](docs/LIVE_TEST_PROCEDURE.md).

## Known limitations
- 72.4% top-1 accuracy on recorded videos of unseen signers for 63 signs (67.1% on Amrita SLR's unseen signers, 92.7% on INCLUDE's own test split): usable for demonstrating clearly signed vocabulary, not reliable communication. Live accuracy on your camera is **unmeasured** until you run the live test procedure.
- **Consecutive signs without lowering the hands** merge into one segment (sign error rate ≈ 0.86 in the synthetic stress test). Pause briefly or drop your hands between signs. The experimental verified-split switch trades this against errors in normal signing.
- Face detection flickers when the hands cover the face. Signs made at the face therefore get less reliable face-relative features. Diagnostics show this as a face-relative out-of-distribution score.
- Public data has no `_none` (non-sign) class. Record `_none` samples so random movements are rejected; false detections are measured by the live evaluation.
- Amrita has ~19 videos per sign. Adding your own recordings (same camera and lighting as the demo) is the fastest way to improve live accuracy.
- **Sentence mode is closed-set:** it only knows the 101 ISL-CSLTR sentences (29.2% sentence accuracy on unseen recording rounds; 35% of the sentences it shows are correct). The corpus has no signer IDs, so signer independence cannot be tested; recording groups are inferred from file names.
- Signs you add yourself are learned from your own videos only and may not generalise to other signers. The held-out test set contains none of them, so their accuracy is not measured until you record *Evaluation only* samples.
- The English meaning layer only knows the phrase table; anything else is shown word by word and marked. It cannot fix recognition errors (phrase-level output was exactly right in 60.5% of held-out streams, the same share that was recognised perfectly).
- A hidden face costs about 7 accuracy points (robustness test); keep your face in view.
- Kannada words are glosses in signing order, not grammatical sentences. Wording got an AI-assisted check only; native-speaker and ISL review are pending. Kannada → Sign phrase glosses and all avatar clips are unverified.
- Windows usually has no Kannada TTS voice; the optional online fallback sends text to Google.
