# Phase 10 data audit: ISL → English → Kannada

Verified 2026-10-10. The full evidence (files tested, columns, row counts, HTTP status, licences) is in
[`CONTINUOUS_ISL_DATASETS.md`](CONTINUOUS_ISL_DATASETS.md); this page answers the Phase 10 questions per resource.

| Resource | Downloadable? (tested) | Annotation format (verified) | Licence | Coverage | Fits the pipeline? |
|---|---|---|---|---|---|
| **ISLTranslate** | Text **yes** (GitHub CSV, HTTP 200). Videos and poses **no**: only in the gated iSign Hugging Face repo (HTTP 401 without login and accepting conditions); 228 GB, more than the 52 GB free disk | `uid,text`: one English sentence per video segment; 31,222 rows, 2,575 source videos, 28,108 distinct sentences. **No glosses, no sign boundaries** | CC BY-NC-SA 4.0 | Educational content, open vocabulary | Only for gloss-free sign → English training. **No gloss labels may be made from the English text.** Not trainable here without your login and acceptance, plus more disk |
| **ISL-CSLTR** (in use) | **Yes** (downloaded) | Per-sentence gloss sequence (dataset's own file) + sentence video; no sign timestamps | CC BY 4.0 | 101 everyday sentences, 168 glosses | ✓ in use (closed set). 195 annotated videos unused; 9 duplicate / conflicting files excluded |
| **"ISL500 / ISL-DATA"** | No dataset by that name found. The closest is **FDMSE-ISL** (2,002 isolated words, 20 deaf signers): **no files** published yet | — | research only (paper) | isolated words | ✗ not available |
| **ISL-FS** | **Yes** (Hugging Face, open; annotation files downloaded) | `uid,text` + letter timestamps (14,685 letters) + signer-independent split (3 signers) | CC BY-NC 4.0 | Fingerspelled news names | ✓ technically: needs a new character-level CTC model |

**Data used in the project** (all ISL, verified): Amrita SLR and INCLUDE (isolated), ISL-CSLTR (continuous).
No other sign language is used.
