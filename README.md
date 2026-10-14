# SilentBridge (Kannada SignBridge)

**Two-Way Real-Time Indian Sign Language (ISL) Recognition & Kannada Communication**

A research prototype for real-time Indian Sign Language recognition from a standard webcam, Kannada/English translation, facial-expression estimation, and reverse translation (spoken/typed Kannada → 3D avatar sign playback), trained and evaluated on **public benchmark ISL datasets**.

---

## 📑 Table of Contents
- [Architecture Overview](#-architecture-overview)
- [Current System Status](#-current-system-status)
- [Quick Start](#-quick-start)
  - [macOS / Linux](#macos--linux)
  - [Windows (PowerShell)](#windows-powershell)
- [Core Features](#-core-features)
- [Datasets & Verification](#-datasets--verification)
- [Machine Learning & Evaluation](#-machine-learning--evaluation)
- [Pipeline Diagnostics & Privacy](#-pipeline-diagnostics--privacy)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Academic Disclaimers & Known Limitations](#-academic-disclaimers--known-limitations)

---

## 🏛 Architecture Overview

SilentBridge operates as a bidirectional, privacy-first communication bridge:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 1. FORWARD PATH (Sign → Speech)                        │
│                                                                                        │
│   Webcam Stream (Browser)                                                              │
│       │                                                                                │
│       ▼                                                                                │
│   MediaPipe Holistic (WASM) ──► Hand + Face Landmarks (x,y,z coordinates only)        │
│                                           │ (WebSocket)                                │
│                                           ▼                                            │
│                               FastAPI Backend Pipeline                                 │
│                                 • Spatial Normalization (Face-relative, palm-scaled)   │
│                                 • Temporal Resampling & Missing-hand Interpolation     │
│                                 • Motion Inactivity Segmentation                       │
│                                           │                                            │
│                                           ▼                                            │
│                               Classification Ensemble                                  │
│                                 • Logistic Regression (Static Poses)                   │
│                                 • Bidirectional GRU (Temporal Dynamics)                │
│                                           │                                            │
│                                           ▼                                            │
│                               Translation & Output                                     │
│                                 • ISL Gloss → Meaning / Kannada Grammar Mapping        │
│                                 • Web Speech / Kannada TTS Audio Playback              │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              2. REVERSE PATH (Speech/Text → Sign)                      │
│                                                                                        │
│   Microphone / Typed Kannada (ಅಥವಾ English)                                           │
│       │                                                                                │
│       ▼                                                                                │
│   Whisper ASR / NFC Text Normalizer                                                    │
│       │                                                                                │
│       ▼                                                                                │
│   Longest-Match Phrase & Gloss Dictionary Lookup                                       │
│       │                                                                                │
│       ▼                                                                                │
│   Three.js 3D WebGL Avatar (Retargeted Bone Animations & Crossfade Playback)           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Current System Status

| Component | Active Version | Benchmark Accuracy (Unseen Signers) | Real Webcam Accuracy |
| :--- | :--- | :--- | :--- |
| **Isolated Signs (63)** | `v20261010-101617` (LogReg + BiGRU Ensemble) | **72.4% Top-1 Accuracy / 0.708 Macro-F1** on 268 test videos of unseen signers | Measured via in-app evaluation tool |
| **Confidence Threshold** | **0.40** (calibrated on out-of-fold validation) | Precision: 0.50, Recall: 0.42 | User-adjustable in UI |
| **Continuous Sentences** | `c20261010-051510` (BiGRU + CTC + Sentence Classifier) | **29.2%** on unseen recording rounds (ISL-CSLTR) | Closed-set (~100 corpus sentences) |
| **Avatar Animation** | 63 retargeted dataset clips + 8 baseline clips | Retargeted from real ISL demonstrations | Approximate joint retargeting |

> **Note on Evaluation Rigor:** Benchmark scores are evaluated using **Signer-Independent Splits** (`StratifiedGroupKFold`), ensuring test signers were never seen during training to prevent identity memorization.

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.10 – 3.12** (Python 3.11 recommended)
- **Node.js 18+** & **npm**
- Modern Chromium browser (**Google Chrome** or **Microsoft Edge**) for MediaPipe camera access.

---

### macOS / Linux

#### 1. Setup Environment
```bash
# Backend virtual environment
python3.11 -m venv backend/.venv
backend/.venv/bin/pip install --upgrade pip
backend/.venv/bin/pip install -r backend/requirements.txt
backend/.venv/bin/python backend/tools/make_placeholder_animations.py

# Frontend dependencies
cd frontend
npm install
cd ..
```

#### 2. Start Services
```bash
# Terminal 1: Backend (FastAPI on http://127.0.0.1:8000)
./start-backend.sh

# Terminal 2: Frontend (Vite on http://127.0.0.1:5173)
./start-frontend.sh
```

---

### Windows (PowerShell)

#### 1. One-Time Setup
```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

#### 2. Start Services
```powershell
# Terminal 1: Backend
.\start-backend.ps1

# Terminal 2: Frontend
.\start-frontend.ps1
```

Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.  
Interactive API Swagger Docs: **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

---

## 🎯 Core Features

1. **Live Sign Language Recognition**:
   - High-framerate hand and face tracking in the browser via offline WebAssembly (`@mediapipe/tasks-vision`).
   - Dynamic motion segmentation detecting deliberate gestures versus idle hand rest.
   - Dual output: ISL gloss sequence and translated Kannada sentence with optional English meaning.
   - Text-to-Speech synthesis in Kannada.

2. **Kannada to 3D Sign Avatar**:
   - Input Kannada text or voice.
   - Tokenizes and resolves phrases via longest-match dictionary lookup.
   - Smooth bone-retargeted signing animations rendered in real-time WebGL via Three.js.

3. **Dataset & Model Studio**:
   - In-app sample recorder allowing users to record 5–10 custom samples to calibrate the model to their specific camera, lighting, and signing style.
   - Model Registry with **automated promotion guardrails** (candidates regressing by >2% on held-out test sets are automatically rejected).

4. **Pipeline Diagnostics & Inspection**:
   - Real-time frame inspection: FPS, latency, palm normals, landmark validity, and out-of-distribution (OOD) scores.

---

## 📦 Datasets & Verification

All public datasets used are licensed under **CC BY 4.0** with verified checksums:

| Dataset | Type | Scope | Local Status |
| :--- | :--- | :--- | :--- |
| **Amrita SLR** (Sasidharan et al., 2025) | Isolated Signs | 49 classes, 7 signers, 1080p | **935 valid landmark samples** imported |
| **INCLUDE** (Sridhar et al., ACM MM 2020) | Isolated Signs | 263 classes, large-scale ISL | Greetings & Pronouns subsets supported |
| **ISL-CSLTR** (Elakkiya & Natarajan, 2021) | Continuous Sentences | 101 sentences, 492 video streams | Benchmark for continuous sentence model |

### Dataset Management Commands
```bash
# Check registered datasets and licenses
./download-datasets.sh --list

# Download & import specific datasets (optional, pre-trained model is already included)
./download-datasets.sh amrita_slr
./import-datasets.sh amrita_slr
```

---

## 🧠 Machine Learning & Evaluation

### Feature Schema: `hands-face-v2`
- **147 normalized values per frame**:
  - Per hand: Wrist-relative coordinates, palm-scaled dimensions, 3D finger vectors, palm normal orientation.
  - Face-relative reference anchor for signs positioned near the head/nose/chin.
  - Missing hand flags (distinguishing hands off-screen from hands occluded).
- Sequences are uniformly resampled to **16 or 24 frames**.

### Model Architectures
- **Baseline**: Multinomial Logistic Regression with StandardScaler.
- **Temporal Neural Network**: Bidirectional GRU (2 × 96 hidden units, mean + max pooling, linear softmax).
- **Ensemble**: Weighted probability average combining static hand posture clarity with dynamic temporal motion.
- **Continuous Recognizer**: BiGRU + Connectionist Temporal Classification (CTC) fused with sentence priors.

### Model Training & Promotion
```bash
# Train candidate models with 8x data augmentation
./train-model.sh --augment 8 --models ensemble
```
Every training execution runs a **3-fold Stratified Group K-Fold** on development data and tests against held-out signers. A new candidate is promoted only if:
1. Macro-F1 exceeds 0.40.
2. It does not regress against the active version on shared test samples by more than 2%.
3. It passes live pipeline reload smoke tests.

---

## 🔒 Pipeline Diagnostics & Privacy

### Privacy by Design
- **Zero Raw Video Storage**: No raw webcam video or audio is ever written to disk or sent over the network.
- **Coordinate Transmission Only**: Video frames are processed in-memory by MediaPipe WASM, and only lightweight `(x, y, z)` landmark coordinates (~15 KB/sec) are streamed to the backend.

### Real-Time Diagnostic Stages
The UI diagnostic panel breaks down every recognition decision into 6 stages:
1. **Camera**: Frame jitter, camera resolution, FPS.
2. **Detection**: MediaPipe detection scores, palm facing direction, hand visibility.
3. **Features**: Schema validation, face-relative alignment.
4. **Segmentation**: Motion velocity, inactivity pause detection.
5. **Classification**: Calibrated softmax threshold, alternative candidates, OOD z-score.
6. **Translation**: Gloss-to-Kannada mapping status.

---

## 🧪 Testing & Quality Assurance

SilentBridge maintains an automated test suite across backend algorithms and frontend interfaces:

```bash
# Run backend pytest suite (150+ unit & integration tests)
backend/.venv/bin/pytest backend/tests -q

# Run frontend test suite & type checks
cd frontend
npm test
npm run typecheck
```

---

## ⚠️ Academic Disclaimers & Known Limitations

1. **Recorded Benchmark vs. Live Camera Accuracy**:
   The active isolated model achieves **72.4% test accuracy** on unseen signers in benchmark videos. Live webcam accuracy depends on camera angle, room lighting, and user signing pace. Personal calibration via the in-app recorder is recommended for individual demonstrations.
2. **Closed-Domain Continuous Recognition**:
   Continuous sentence mode is strictly closed-set to the ISL-CSLTR corpus sentences (~100 sentences) and is not open-vocabulary conversational translation.
3. **Linguistic Review**:
   ISL grammar structure is distinct from spoken languages. Current Kannada translations follow gloss order with phrase-level idiomatic mapping; formal grammatical review by native ISL users is ongoing.
4. **Avatar Retargeting**:
   Avatar motions are retargeted from real video landmarks and baseline keyframes. They provide visual reference for demonstration purposes and are not certified official ISL instructional clips.
5. **Kannada text-to-speech**:
   Windows may not have a Kannada system voice. Microsoft Edge can provide online Kannada voices, and Live Recognition also offers an optional Online TTS fallback that requires `backend/requirements-optional.txt`.
6. **Sign Reference**:
   The Sign Reference page plays dataset recordings for the vocabulary signs used by the model. It requires the original dataset videos and falls back to avatar clips when recordings are unavailable.

---

## 📜 License & Acknowledgments
- **Codebase**: MIT License (educational and research prototype).
- **Datasets**: Subject to original academic citations and CC BY 4.0 terms for Amrita SLR, INCLUDE, and ISL-CSLTR.
