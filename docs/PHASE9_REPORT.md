# Phase 9 report: ISL-only continuous recognition

2026-10-10. **Verified facts** are marked ✓, **assumptions** *A*, and **unresolved limitations** ✗.
Details: [`PHASE9_AUDIT.md`](PHASE9_AUDIT.md), [`CONTINUOUS_ISL_DATASETS.md`](CONTINUOUS_ISL_DATASETS.md).

## 1. ISL-only compliance
- ✓ **Training and evaluation data:** every dataset used is ISL (Amrita SLR, INCLUDE, ISL-CSLTR; publisher pages checked). No other sign language is anywhere in the project.
- ✓ **Avatar clips:** retargeted only from these ISL datasets (63). The 8 placeholders are hand-written, not from another sign language. None is verified by an ISL user.
- ✓ **Excluded:** RWTH-PHOENIX-2014-T (German Sign Language), which a candidate project page links as a dataset.

## 2. Datasets found (ISL only)
| Candidate | Result |
|---|---|
| ISL-CSLTR | ✓ in use; 195 annotated videos unused, 5 duplicate groups (4 with conflicting labels) found |
| ISL-FS (fingerspelling, ISH News) | ✓ open download, 3 signers with an official signer-independent split, letter timestamps; **CC BY-NC** |
| iSign / ISLTranslate | ✓ ISL, but **gated** (HTTP 401 without login and accepting conditions), 228 GB, **no glosses**, CC BY-NC-SA |
| FDMSE-ISL (2,002 words, 20 signers) | ✗ no downloadable files yet |

## 3. Continuous recognition: changes this phase (no retraining)
| Change | Evidence |
|---|---|
| **Incremental predictions** in sentence mode: tentative gloss decode of the sentence so far, every ~0.5 s, shown as "not final" and never added to the transcript | 3 tests; checked with the real model on held-out videos |
| **Integrity exclusions**: 9 duplicate / conflicting-label videos skipped in future training and evaluation (`tools/csltr_integrity.py`) | Test set unchanged (154 videos), so comparisons stay like-for-like |
| Uncertainty: sentences below posterior 0.5 are shown as "uncertain" with candidates (Phase 6), unchanged | |

## 4. Results (recorded videos, not webcam)
- **Sentence model** `c20261010-051510`, ISL-CSLTR test rounds rec4 and rec5 (154 videos). Split by **recording round**: no signer IDs exist.

| Measure | Value |
|---|---|
| Sentence accuracy, no rejection | 29.2% (45/154) |
| Shown as a sentence (posterior ≥ 0.5) | 122; **43 correct**, 79 wrong (precision 35.3%) |
| Gloss error rate of the chosen sentence | 0.685 |
| By recording round | rec4: 31 correct of 69 shown (85 videos), GER 0.62 · **rec5: 12 of 53 shown (69 videos), GER 0.76** |
| Per-frame latency in sentence mode | ≤ 137 ms at the sentence end (sentence scoring); partial decodes are cheap |

- **Partial decodes on 3 held-out videos:** they update while signing but are often wrong. The finals were correctly marked uncertain.
  - "GO SLEEP" → partials "I SLEEP", "DO NOT".
  - "I DO NOT AGREE" → "WHAT HAPPENED", …
- **Isolated model** (unchanged, Phase 6/7): 72.4% / macro-F1 0.708 on 268 videos of unseen signers. Through the live pipeline: 184/268 correct.
- **Webcam:** ✗ no webcam evaluation recordings exist, so no webcam accuracy can be stated.

## 5. Proposed retraining (approval needed; not done)
| Proposal | Expected benefit (estimate, not a result) | Risk / cost |
|---|---|---|
| **A. ISL-CSLTR cleanup + 195 unlisted videos** | Training videos per sentence rise from ~2.5 to ~3.7 (+118 in training rounds rec1/3/6/7/8, +77 in validation round rec2; none in test rounds rec4/rec5). *A:* moderate gain; with this little data each extra recording matters. Measured on the **unchanged** 154-video test set | ~30 min CPU; old model kept; promoted only if better on the same test videos |
| **B. ISL-FS fingerspelling model** (new, separate) | Recognising fingerspelled names (news proper nouns). *A:* weak: 2 training signers; the authors' own best character error rate is high | 1.83 GB download; ~1 h extraction; **CC BY-NC** (academic only) |
| C. iSign / ISLTranslate | Open-vocabulary sign → English | Needs your Hugging Face login and acceptance; 228 GB exceeds the 52 GB free disk; no glosses (end-to-end translation only); *A:* low quality on a CPU laptop |

## 6. News and sports commentary
- ✗ **Not supported.** ISL-CSLTR is everyday conversation (101 sentences, no news or sports glosses). The isolated vocabulary has no news or sports signs.
- ISL-FS covers fingerspelled **names** from ISH News, which helps with proper nouns but not with the signs themselves.

### Collection plan (ISL only)
- **Who:** at least 6 **consenting deaf ISL signers or certified ISL interpreters** (ISLRTC-certified preferred), at least 2 sessions each, different days, rooms and lighting.
- **Content:**
  - news: politics, weather, sports results;
  - sports commentary: cricket, kabaddi, football, wrestling.
  - Interpreters sign from a written script in their natural ISL (not word-by-word), plus free retelling.
- **Vocabulary:** first agree on about 300 domain signs with the interpreters: MATCH, WIN, LOSE, SCORE, TEAM, PLAYER, RUNS, WICKET, GOAL, ELECTION, GOVERNMENT, MINISTER, WEATHER, RAIN, …. Record each isolated (≥ 3 signers) **and** inside continuous sentences.
- **Annotation:**
  1. A second ISL expert writes the gloss sequence and sign boundaries for each sentence video.
  2. A Kannada speaker translates the English meaning.
  3. **A recording is ground truth only after both reviews.** Disagreements are resolved or the clip is excluded.
- **Provenance:** for each clip, record the signer ID (pseudonymous), session, date, device, consent form ID and usage permission (research or commercial), plus the annotator and reviewer IDs.
- **Splits:** by signer: at least 2 signers held out entirely for testing, never seen in training or validation.
- **Storage:** separate from the existing datasets, under a new dataset key, registered with its licence. Never mixed with any non-ISL data.

## 7. Tests
- Backend pytest: **150 passed**.
- Frontend: 25 passed; TypeScript clean; build OK.
- New: `tests/test_phase9_continuous.py` (incremental partials, isolated mode unaffected, integrity exclusions).

## 8. Unresolved limitations
- ✗ No signer-independent sentence evaluation is possible (no signer IDs in ISL-CSLTR).
- ✗ Sentence mode is closed-set (101 sentences), not open translation, and not news or sports.
- ✗ No webcam evaluation yet.
- ✗ No ISL user has reviewed the phrase orders, avatar clips or Kannada translations.
