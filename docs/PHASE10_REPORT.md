# Phase 10 report: ISL → English → Kannada

2026-10-10. Phase 10 and Phase 9 were carried out together. The Phase 9 rule "do not retrain or replace a
production model without reporting the expected benefit and obtaining approval" applies, so **no model was
trained or replaced**. Everything below is the audit, inference-only changes and measured results on recorded
videos. **No webcam results exist.**

## Dataset verification
See [`PHASE10_DATA_AUDIT.md`](PHASE10_DATA_AUDIT.md) and [`CONTINUOUS_ISL_DATASETS.md`](CONTINUOUS_ISL_DATASETS.md).
- **ISLTranslate:** text verified (31,222 English sentences); videos gated (iSign, 228 GB, CC BY-NC-SA); no glosses.
- **ISL-CSLTR:** in use. 195 annotated videos unused; 5 duplicate groups (4 with conflicting labels) found and excluded for future runs.
- **ISL-FS:** open, 3 signers, letter timestamps, CC BY-NC.
- **"ISL500 / ISL-DATA":** not found. FDMSE-ISL has no downloadable files.

## Current pipeline (unchanged models)
Live webcam → MediaPipe landmarks (browser) → either:
- **isolated signs:** ensemble `v20261010-101617`, 63 signs;
- **sentence mode:** ISL-CSLTR fused CTC + classifier decoder `c20261010-051510`, closed set of 101 sentences, now with **tentative partial glosses while signing**.

Then: ISL gloss sequence → English meaning (phrase table or corpus sentence) → Kannada, with "uncertain" and "word-by-word" states shown.

## Model comparison (identical held-out test data; recorded videos)
| Model | Test data | Result |
|---|---|---|
| Isolated, previous `v20261009-225256` | 268 videos, unseen signers | 59.7%, macro-F1 0.591 |
| Isolated, current `v20261010-101617` | same 268 | **72.4%, macro-F1 0.708**; live pipeline 184/268 |
| Sentence, earlier `c20261009-194444` | 154 videos, unseen recording rounds | 20.1% sentence accuracy |
| Sentence, current `c20261010-051510` | same 154 | 29.2%; 43 correct of 122 shown, the rest marked uncertain; GER 0.685 |

**Unseen signers:**
- Isolated: yes (2 held-out Amrita signers + the INCLUDE test split).
- Sentence: **not measurable** (no signer IDs). By recording round: rec4 36% vs rec5 17%.

**Common failures:**
- Isolated: EAT/NOSE/AFTERNOON, CAT/BIRD/DOG, HELLO/GOOD, FATHER/BROTHER.
- Sentence: wrong partial glosses on unseen rounds; signs merge when the hands are never lowered.

## What I need from you (approval or action)
1. **Approve A:** ISL-CSLTR cleanup + the 195 unlisted videos, retrain the sentence model, compare on the same 154 test videos, and promote only if better.
2. **Approve B:** download ISL-FS (1.83 GB, CC BY-NC, academic use) and train a separate fingerspelling model, evaluated on its unseen signer.
3. **For iSign / ISLTranslate:** this would need your own Hugging Face login and acceptance of its conditions (I can't do that for you), plus ~228 GB of disk (52 GB free). I don't recommend it on this laptop.
4. **Record the webcam evaluation sessions** (`LIVE_TEST_PROCEDURE.md`). Without them no live accuracy can be claimed.

## Limitations
- Sentence mode recognises only the corpus' 101 sentences: it is not open translation, and it does not cover news or sports.
- Isolated signing needs a short pause or lowered hands between signs.
- Kannada sentences and the ISL phrase orders are AI-assisted and unreviewed.
