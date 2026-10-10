# Phase 5: audit, English intermediate layer, continuous decoding, phrases and avatar

All numbers are measured on this laptop (2026-10-10) on **held-out** data: signers or recording rounds
never used to train the evaluated model. The JSON reports are in `backend/reports/`. **No webcam test with a
real signer was possible**: the development browser blocks camera access. See "Live testing" below.

## 1. Audit: where does the error come from?

| Suspect | Evidence | Verdict |
|---|---|---|
| Landmark extraction | Browser vs Python on 8 dataset videos: same prediction 7/8, median landmark offset ≤ 0.007 | Not the bottleneck |
| Camera mirroring / handedness | Mirrored held-out videos: 57.1% vs 56.3% original (`robustness_eval.json`); mirroring augmentation in training | Not the bottleneck |
| Feature schema | Every live frame is checked against `hands-face-v2` (147 values) in the diagnostics panel; browser and Python features agree | Not the bottleneck |
| Face visibility | No face: 49.3% vs 56.3% (−7.0 points); face detection flickers when the hands cover the face | **Real weakness**: keep the face in view |
| Training-data distribution | ~19 videos per sign from ~9 signer groups; no webcam recordings of the user | **Likely the main live risk, unmeasured** until evaluation recordings exist |
| Confidence calibration | Threshold 0.45 chosen on out-of-fold validation (precision 0.48, recall 0.38). Webcam check is now built in (section 3) | Must be validated on webcam |
| Segmentation | With a short pause: sign error rate 0.47 vs 54.3% whole-clip classifier accuracy. Hands never lowered: 0.86 | Small loss with pauses, large without |
| **Model confusion** | Even with perfect boundaries, ~40% of held-out recordings are misclassified (boy↔girl, eat↔nose, grey→hello, stop→ring) | **Main measured bottleneck** |
| Translation mapping | Was word-by-word. 14 of the 29 old phrases used signs the model never learned (yes, no, water, what, your, need, please…) | Fixed for supported signs (section 2) |
| Avatar mapping | 6 recognisable signs had no clip and 2 had hand-written placeholders | Fixed: all 63 have dataset-derived clips, **unverified** |
| Continuous decoder | The live method had been selected by comparing **test** accuracies; greedy CTC decoding discarded the full likelihood | Fixed (section 4) |

The active isolated model `v20261009-225256` was **not retrained** in this phase: no new labelled recordings
exist, and dictionary changes do not affect features or labels. Its numbers are unchanged: 59.7% accuracy,
macro-F1 0.591 on 268 unseen-signer videos.

## 2. English intermediate layer

`backend/app/translation/semantic.py`: recognised labels → ISL gloss sequence → English meaning → Kannada, with
each stage kept separate in every result. The **whole sequence** is matched against the phrase table (longest
match first), so YOU EAT becomes "Did you eat? / ನೀವು ಊಟ ಮಾಡಿದಿರಾ?" instead of "ನೀವು ತಿನ್ನು":
- One phrase entry holds both the English and the Kannada, so the two can never drift apart.
- Leftover signs get word-level glosses, explicitly marked as such.
- Unknown signs are reported, never guessed.
- Sequences whose meaning depends on facial grammar return all readings and are flagged as ambiguous.

No machine-translation model or service is used (none suitable runs offline here), and no video is sent anywhere.

**Direct vs English-intermediate on identical held-out recordings** (`tools/eval_translation.py`):
- For 31 phrases made of recognisable signs, 124 streams were built from held-out test recordings and run through the live pipeline.
- The evaluation model was trained on development signers only.

| Pipeline | Exact match | chrF |
|---|---|---|
| Direct: Kannada gloss word per sign | 39.5% | 0.605 |
| Gloss sequence → English → Kannada (phrase-level) | **60.5%** | **0.669** |
| *Oracle (perfect recognition)*: direct / phrase-level | 61.3% / 100%* | 0.851 / 1.000* |

\* By construction: the references are the phrase table's own Kannada sentences (AI-assisted, not yet reviewed),
so this measures what sequence-level translation adds over word-by-word glossing, not absolute Kannada quality.
The phrase-level pipeline is exactly right in 60.5% of streams, which equals the share recognised perfectly
(75/124). **The English layer does not repair recognition errors.**

## 3. Real-time recognition checks
- **Pipeline diagnostics** (Live page): camera, detection, features, segmentation, classification, then translation through the new Meaning panel.
- **Robustness** (`tools/robustness_eval.py`): real held-out recordings under controlled landmark perturbations. This is a proxy, not webcam data.

| Condition | Accuracy | Top-1 | Coverage | Wrong accepted |
|---|---|---|---|---|
| original | 56.3% | 60.1% | 86.9% | 82 |
| mirrored (selfie video) | 57.1% | 61.6% | 86.2% | 78 |
| no face visible | **49.3%** | 53.0% | 83.2% | 91 |
| hand missing in 20% / 40% of frames | 56.0% / 57.8% | 60.1% / 61.9% | 84.0% / 84.7% | 75 / 72 |
| fast 1.5× / slow 0.67× | 55.2% / 57.5% | 59.0% / 60.8% | 84.3% / 86.9% | 78 / 79 |
| far 0.7× / near 1.3× | 54.1% / 57.1% | 59.7% / 61.6% | 87.3% / 84.3% | 89 / 73 |
| off-centre | 57.5% | 60.4% | 88.4% | 83 |
| landmark jitter (sd 0.01) | 53.7% | 59.0% | 85.1% | 84 |

- **Webcam threshold:** the live evaluation now tabulates correct, wrong, missed and false detections (`_none` → word) at every threshold on your evaluation recordings. With ≥ 2 sessions it chooses the threshold on the other sessions and scores the held-out one, and "Use … for live recognition" applies it. **0.45 has not yet been tested on webcam input.**

## 4. Continuous sentences (ISL-CSLTR, same networks, same 154 test videos)
Audit: the decoder's gloss indices are aligned correctly with the annotations (blank = 0, glosses 1…N in both
training and decoding). However, the live method had been chosen by comparing test-set accuracies, and the
"validation" classifier had been trained on the validation round itself (100% validation accuracy).
`tools/eval_continuous_decoders.py` fixes the protocol: the choice is made on the validation round with a
classifier fitted on the training rounds only.

| Decoder | Validation accuracy (choice) | Test sentence accuracy | Test GER (chosen sentence) |
|---|---|---|---|
| greedy CTC → nearest sentence | 17.8% | 18.2% | 0.742 |
| sentence classifier (previously live) | 15.1% | 20.1% (31/154) | 0.883 |
| full CTC likelihood per sentence | 23.3% | 22.1% | 0.724 |
| **CTC likelihood + classifier (chosen)** | **30.1%** | **29.2% (45/154)** | **0.685** |

Activated as continuous version `c20261010-005738`; the previous `c20261009-194444` is kept for rollback. The live
recogniser reproduces 45/154 on the raw test frames. This is still **closed-set recognition of the corpus'
~100 sentences, not translation**.

## 5. Phrases, Kannada, avatar, face
- **Phrases:** 72 phrases in 11 categories, 59 recognisable from the camera (`docs/PHRASES.md`).
  - 43 new phase-5 phrases (38 new entries, 5 earlier aliases given a meaning) were built only from trained signs.
  - **Numbers:** unsupported, since there are no number signs in the data.
  - **Travel:** not recognisable, since GO, WHERE and HOME are untrained.
- **Unicode:** NFC throughout; tests cover the API (UTF-8 JSON), the transcript, copy text and speech output (exact Kannada text to the voice or TTS).
- **Kannada → Sign:**
  - Shows the English meaning and the planned ISL gloss sequence. The sign order comes from the mappings, never English word order.
  - Each sign shows its mapping source and clip provenance.
  - Unsupported words are listed; play, pause, resume, replay and stop are available.
- **Avatar clips:** 63 are extracted from dataset recordings, 8 are hand-written placeholders (food, need, no, please, water, what, yes, your). **All 71 are unverified.**
- **Facial expression:**
  - Still a labelled rule-based heuristic, separate from sign recognition.
  - The displayed label now changes only after 3 consistent frames, so it no longer flickers.
  - ISL-CSLTR has no non-manual annotations, so the continuous model cannot be trained to use facial grammar.

## 6. Live testing (manual: you must do this)
Follow `docs/LIVE_TEST_PROCEDURE.md` in Chrome or Edge:
1. Check the pipeline diagnostics.
2. Record **evaluation-only** sessions on at least 2 different days, lighting setups or distances: signs, `_none` movements and sequences.
3. Run **Evaluate active model**. Note accuracy, macro-F1, wrong words, missed signs, false detections, and the threshold table with its leave-one-session-out choice.
4. Only then decide whether to apply the webcam threshold.
