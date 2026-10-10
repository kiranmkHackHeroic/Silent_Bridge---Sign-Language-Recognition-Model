# Phase 9 audit: ISL-only status of KannadaSignBridge

Checked 2026-10-10 on the files themselves (paths relative to `backend/`).

## 1. Datasets and their sign-language identity
| Dataset on disk | Sign language (source) | Used for | Notes |
|---|---|---|---|
| `data/raw/amrita_slr` (1.4 GB) | **ISL** (publisher: "50 commonly used ISL signs") | isolated model | 956 videos accepted |
| `data/raw/include` (5.0 GB) | **ISL** (INCLUDE) | isolated model | Greetings + Pronouns, official split |
| `data/raw/isl_csltr` (8.5 GB) | **ISL** (publisher: "Indian Sign Language dataset") | sentence model | 492 of 687 videos imported (section 4) |

- **No other sign language exists anywhere in the project:** no ASL, no DGS and no other data in `data/raw`, `data/processed`, the registry or the models.
- `data/datasets_registry.json` lists exactly these three. User recordings (`data/dataset`, `data/eval_recordings`) are empty.

## 2. Vocabulary, glosses and translations
- **Isolated vocabulary** (`data/labels.json`, 82 labels):
  - 63 trained classes come from the ISL datasets' class folders.
  - 18 extra labels (yes, no, water, …) were added for the phrase dictionary and are **not trained**.
  - `isl_gloss` values are English-word glosses of the ISL signs (normal ISL glossing). The Kannada words got an AI-assisted check; native-speaker review is pending.
- **Sentence vocabulary** (`data/mappings/isl_csltr.json`): 101 sentences and 168 glosses from the dataset's **own** gloss file. A documented normalisation fixes 5 typos. Kannada sentences are AI-assisted drafts.
- **Phrase dictionary** (`data/kannada_sign_mapping.json`, 72 phrases): the sign **order is a proposed ISL order** (AI-assisted), **unverified** by an ISL user. No other sign language's grammar was used.

## 3. Models and registry
| Model | Data | Status |
|---|---|---|
| Isolated `v20261010-101617` (active; identical to `v20261010-081537`) | Amrita SLR + INCLUDE (ISL) | 63 classes; 72.4% / macro-F1 0.708 on held-out signers (recorded videos) |
| Sentence `c20261010-051510` (active) | ISL-CSLTR (ISL) | 29.2% test sentence accuracy before rejection; 43 correct / 122 shown at the 0.5 rejection threshold |
| Earlier versions | same ISL data | kept in `models/registry/` and `models/continuous/` |

**Splits:**
- Isolated: signer/session-grouped, with the INCLUDE official test split.
- Sentence: by recording round. ISL-CSLTR has no signer IDs, so this is **not** signer-independent.

## 4. Data-integrity findings (ISL-CSLTR)
- **Unused videos:** 195 videos (28%) were never used. The corpus spreadsheet lists only 492 of the 687 files; the folder names validate them (492/492), but adding them needs approval.
- **Duplicates:** **5 exact-duplicate groups** (MD5) among the imported 492.
  - **4 carry different sentence labels.**
  - One conflicting pair spans train and validation; none touches the test rounds.
  - Now excluded for future runs (`data/mappings/isl_csltr_integrity.json`). The current production model was trained with them.

## 5. Live recognition, subtitles, avatar
- **Live webcam:**
  - **Isolated mode:** motion segmentation with still-tail trimming, threshold 0.40, pending-word confirmation.
  - **Sentence mode:** one segment per sentence (1.5 s pause or hands down); fused decoder with an "uncertain" result below posterior 0.5.
  - **New this phase:** tentative partial glosses while signing.
  - **Not supported:** continuous isolated-sign streams without pauses (signs merge).
- **Meaning and Kannada:** separate stages (sign label → ISL gloss → English meaning → Kannada), with unknown and word-by-word parts marked.
- **Avatar** (`data/animation_mapping.json`, 71 clips):
  - 49 retargeted from Amrita SLR videos and 14 from INCLUDE videos (ISL);
  - 8 hand-written placeholders (food, need, no, please, water, what, yes, your), not taken from any sign-language data;
  - **0 verified** by an ISL user.

## 6. Gaps
- No ISL data covers **news or sports**.
- **Signer-independent sentence evaluation** is impossible with ISL-CSLTR.
- No **ISL user has reviewed** the phrase orders, the avatar clips or the Kannada translations.
