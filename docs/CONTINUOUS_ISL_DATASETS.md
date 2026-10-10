# Indian Sign Language datasets: verified inventory (Phase 9 / Phase 10)

Checked 2026-10-10. "Verified" means I opened the publisher's page **and** tested the actual files: HTTP
status, downloaded annotation files, columns and row counts. Statements I could not check are marked
*unverified*. Only Indian Sign Language (ISL) resources are listed; any other sign language is out of scope.

## Summary
| Dataset | ISL? | Task | Glosses | Size | Signers | Access (tested) | Licence | Used now |
|---|---|---|---|---|---|---|---|---|
| **ISL-CSLTR** | ✓ publisher: "Indian Sign Language dataset" | continuous sentences | ✓ per sentence (dataset's own gloss file) | 687 sentence videos on disk / 101 sentences / 168 glosses | 7 per publisher; **not identified per file** | ✓ downloaded (Mendeley) | CC BY 4.0 | ✓ sentence model |
| **Amrita SLR** | ✓ "50 commonly used ISL signs" | isolated | class labels | 956 / 978 videos accepted, 49 classes | 7 | ✓ downloaded | CC BY 4.0 | ✓ isolated model |
| **INCLUDE** (Greetings + Pronouns) | ✓ ISL (AI4Bharat / IIT Madras) | isolated | class labels | 484 videos, 17 classes (of 263) | official train / test | ✓ downloaded (Zenodo) | CC BY 4.0 | ✓ isolated model |
| **ISL-FS** (ISL-Fingerspelling) | ✓ ISH News fingerspelling, validated by an ISL interpreter | continuous **fingerspelling** | text + **letter timestamps** | 1,308 segments, 70.9 min, 14,685 letters | **3**, with an official signer-independent split | ✓ open (HTTP 200, annotation files downloaded) | **CC BY-NC 4.0** | ✗ |
| **iSign / ISLTranslate** | ✓ ISL educational videos | continuous **translation** (video → English) | ✗ none (English sentences only) | ISLTranslate: 31,222 pairs, 2,575 source videos; iSign total 228 GB | not stated | **Gated**: files return **HTTP 401** without a Hugging Face login and accepted conditions | **CC BY-NC-SA 4.0** | ✗ |
| **FDMSE-ISL** (Patra et al. 2024) | ✓ (paper) | isolated, 2,002 words | class labels | 40,033 videos | 20 deaf signers | ✗ **no files**: project page has no download link; paper says "will be available" | research only (paper) | ✗ |
| CISLR | ISL (*unverified*) | isolated, one-shot | | 7,050 videos / 4,765 words (*search result only*) | | *not checked* | | ✗ |

**Excluded on purpose:** the FDMSE-ISL project page links RWTH-PHOENIX-2014-T as a "dataset". That is **German Sign Language** and must not be used.

## Details

### ISL-CSLTR (in use)
- **Publisher:** SASTRA, Mendeley Data doi:10.17632/kcmpdxky7p.1, CC BY 4.0. The publisher describes "100 sentences, 700 fully annotated videos, 7 different signers"; the corpus has 101 sentence entries.
- **Annotations (verified):**
  - `corpus_csv_files/ISL Corpus sign glosses.csv` has 101 rows (`Sentence`, `SIGN GLOSSES`).
  - `ISL_CSLRT_Corpus details.xlsx` lists **492** video files.
  - The glosses are the dataset's own; they were **not** derived from English.
- **On disk (verified):** 687 sentence videos.
  - **195 videos are missing from the spreadsheet**, but every one sits in a folder named after an annotated sentence.
  - The folder convention matches the spreadsheet for **492 / 492** listed files.
  - They are **not imported** (approval needed).
- **Integrity (verified by MD5, `tools/csltr_integrity.py`):** 682 distinct contents among 687 files.
  - 5 duplicate groups, 4 of them with **different sentence labels** (e.g. one video filed under both "now onwards he will never hurt you" and "what have you planned for your career").
  - All are among the 492 used so far: one pair crosses train/validation, none touch the test rounds.
  - 9 files are now excluded from future training and evaluation (`data/mappings/isl_csltr_integrity.json`).
- **Signers:** the files carry no signer IDs. The project's "groups" are **recording rounds** inferred from file names (rec1–rec8), not signers. Signer-independent evaluation is therefore **not possible**; the split is by recording round.
- **Domain:** everyday conversational sentences ("are you free today", "comb your hair", "congratulations"). **No news or sports vocabulary.**

### ISL-FS (not used; downloadable)
- **Source:** `huggingface.co/datasets/kirandevraj/ISL-Fingerspelling` (official; `salik2610/...` is a duplicate). Paper: WSLP 2025 (Kirandevraj R, Kurmi, Namboodiri, Jawahar).
- **Files (verified):** 1,308 MP4 clips (1.83 GB); `fingerspelling_annotations.csv` (`uid,text`, 1,308 rows); `signer_split.csv` (`uid,signer,split`).
  - signer_00: 544 clips, signer_01: 266, signer_02: 498.
  - Train = signers 00 + 01 (810 clips); test = signer 02 (498 clips).
  - `letter_timestamps.csv`: 14,685 letters with frame ranges.
- **Content:** fingerspelled **names and places from ISH News**, e.g. "vinesh phogat", "nur-sultan". **Relevant to news/sports proper nouns.**
- **Licence:** CC BY-NC 4.0. Academic use is fine; **commercial use is not**.
- **Compatibility:** the project's MediaPipe pipeline can extract landmarks from the MP4s. It needs a new character-level CTC model (letters), separate from the gloss models.

### iSign / ISLTranslate (not used; gated)
- **GitHub:** `Exploration-Lab/ISLTranslate`.
  - `data/ISLTranslate.csv` is public: 31,222 rows, columns `uid,text`, an English sentence per video segment, 28,108 distinct sentences, median 6 words.
  - `ISL-signer_validation.csv` is public: 291 rows comparing transcribed text with a certified signer's gold translation.
- **Videos and poses:** only in `huggingface.co/datasets/Exploration-Lab/iSign`.
  - **Gated**: `iSign_v1.1.csv` and all other files return HTTP 401 without login and accepted conditions.
  - Total 228 GB (videos + `.pose` files); this laptop has 52 GB free.
- **No glosses:** video-level English translations only. Per the rules, **no gloss labels may be made from these subtitles**. It suits only end-to-end sign-to-English translation; a model needs gloss-free SLT training.
- **Licence:** CC BY-NC-SA 4.0 (non-commercial, share-alike).

### FDMSE-ISL (not available)
- **Paper:** arXiv 2407.14224: 2,002 words, 40,033 videos, 20 deaf signers, ISL dictionary of FDMSE.
- **Access:** the paper says the data "will be made publicly available" at cs.rkmvu.ac.in/~isl. That page (checked) has **no dataset files, request form or licence**.

## Suitability for commercial vs academic use
- **Commercial use allowed (CC BY 4.0, with attribution):** ISL-CSLTR, Amrita SLR, INCLUDE.
- **Non-commercial only:** ISL-FS (CC BY-NC) and iSign/ISLTranslate (CC BY-NC-SA). A model trained on them inherits that restriction in practice.
