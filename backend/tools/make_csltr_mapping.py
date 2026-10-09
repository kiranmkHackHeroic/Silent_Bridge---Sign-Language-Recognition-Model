"""Writes data/mappings/isl_csltr.json: ISL-CSLTR sentence -> gloss (original + normalized) -> Kannada.

The Kannada sentences are DRAFT translations written for this project (AI-assisted)
and have NOT been reviewed by a native Kannada speaker or an ISL interpreter.
Gloss normalization only fixes annotation inconsistencies (spelling variants of
the same token, punctuation inside glosses); the original gloss string is kept.

Run from backend/:  python tools/make_csltr_mapping.py
"""
import csv
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.translation.kannada_mapping import clean_display_text  # noqa: E402

KANNADA = [
    "ನೀವು ಇಂದು ಬಿಡುವಾಗಿದ್ದೀರಾ?", "ನೀವು ಏನನ್ನಾದರೂ ಮುಚ್ಚಿಡುತ್ತಿದ್ದೀರಾ?", "ನನಗೆ ನೀರು ತನ್ನಿ.",
    "ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಹುದೇ?", "ದಯವಿಟ್ಟು ಅದನ್ನು ಮತ್ತೊಮ್ಮೆ ಹೇಳುತ್ತೀರಾ?", "ನಿಮ್ಮ ಕೂದಲು ಬಾಚಿಕೊಳ್ಳಿ.",
    "ಅಭಿನಂದನೆಗಳು.", "ದಯವಿಟ್ಟು ನಿಧಾನವಾಗಿ ಮಾತನಾಡುತ್ತೀರಾ?", "ನನಗೊಂದು ಉಪಕಾರ ಮಾಡಿ.", "ಅವನನ್ನು ನಿಂದಿಸಬೇಡಿ.",
    "ಹಠ ಮಾಡಬೇಡಿ.", "ನನಗೆ ನೋವು ಮಾಡಬೇಡಿ.", "ನನಗೆ ಕೋಪ ಬರಿಸಬೇಡಿ.", "ಅದನ್ನು ಮನಸ್ಸಿಗೆ ಹಚ್ಚಿಕೊಳ್ಳಬೇಡಿ.",
    "ಚಿಂತಿಸಬೇಡಿ.", "ನಿಮಗೆ ಏನಾದರೂ ಬೇಕೇ?", "ಹೋಗಿ ಮಲಗಿ.", "ಊಟ ಆಯಿತೇ?", "ಅವನು ರೈಲಿನಲ್ಲಿ ಬಂದನು.",
    "ಅವನು ಕೋಣೆಯೊಳಗೆ ಹೋಗುತ್ತಿದ್ದಾನೆ.", "ಅವನು ದಾರಿಯಲ್ಲಿದ್ದಾನೆ.", "ಅವನು/ಅವಳು ನನ್ನ ಸ್ನೇಹಿತ.",
    "ಅವನು ಇಂದು ಬರುತ್ತಾನೆ.", "ನನಗೆ ಸಹಾಯ ಮಾಡಿ.", "ಹಾಯ್, ಹೇಗಿದ್ದೀರಿ?", "ಎಲ್ಲಾ ಹೇಗಿದೆ?",
    "ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?", "ನಾನು ನಿಮ್ಮನ್ನು ಹೇಗೆ ನಂಬಲಿ?", "ನಿಮಗೆ ಎಷ್ಟು ಧೈರ್ಯ?",
    "ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?", "ನನಗೆ (ವಯಸ್ಸು) ವರ್ಷ.", "ನನಗೆ ಅದರ ಬಗ್ಗೆ ಭಯವಿದೆ.", "ನಾನು ಅಳುತ್ತಿದ್ದೇನೆ.",
    "ನನಗೆ ಬೇಸರವಾಗುತ್ತಿದೆ.", "ನನಗೆ ಚಳಿಯಾಗುತ್ತಿದೆ.", "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ. ಧನ್ಯವಾದಗಳು ಸರ್.",
    "ನನಗೆ ಹಸಿವಾಗಿದೆ.", "ಏನು ಮಾಡಬೇಕೆಂದು ನನಗೆ ಗೊಂದಲವಾಗಿದೆ.", "ನನಗೆ ಖಚಿತವಾಗಿ ಗೊತ್ತಿಲ್ಲ.",
    "ನಾನು ನಿಜವಾಗಿಯೂ ಕೃತಜ್ಞನಾಗಿದ್ದೇನೆ.", "ನಾನು ತರಗತಿಯಲ್ಲಿ ಕುಳಿತಿದ್ದೇನೆ.", "ಅದನ್ನು ಕೇಳಿ ತುಂಬಾ ಬೇಸರವಾಯಿತು.",
    "ನನಗೆ ಜ್ವರ ಬಂದಿದೆ.", "ನನಗೆ ಸುಸ್ತಾಗಿದೆ.", "ನನಗೆ ತುಂಬಾ ಸಂತೋಷವಾಗಿದೆ.",
    "ಆ ವಿಷಯದಲ್ಲಿ ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲಾರೆ.", "ನಾನು ಒಪ್ಪುವುದಿಲ್ಲ.", "ನನಗೆ ಅದು ಇಷ್ಟವಿಲ್ಲ.",
    "ನಾನು ಹಾಗೆ ಉದ್ದೇಶಿಸಿರಲಿಲ್ಲ.", "ನಾನು ಒಪ್ಪುವುದಿಲ್ಲ.", "ನನಗೆ ತುಂಬಾ ಖುಷಿಯಾಯಿತು.", "ನನಗೆ ಪೆಟ್ಟಾಯಿತು.",
    "ನನಗೆ ನೀವು ಇಷ್ಟ, ನಾನು ನಿಮ್ಮನ್ನು ಪ್ರೀತಿಸುತ್ತೇನೆ.", "ನನಗೆ ನೀರು ಬೇಕು.", "ನಾನು ಮಾತು ಕೊಡುತ್ತೇನೆ.",
    "ನಾನು ಅದನ್ನು ನಿಜವಾಗಿಯೂ ಮೆಚ್ಚುತ್ತೇನೆ.", "ಅದರ ಬಗ್ಗೆ ನನಗೆ ಹೇಗೋ ತಿಳಿಯಿತು.", "ನನ್ನನ್ನು ಯಾರೋ ತಡೆದರು.",
    "ಅದರಿಂದ ನನಗೆ ಯಾವುದೇ ವ್ಯತ್ಯಾಸವಿಲ್ಲ.", "ನಿಮ್ಮೊಂದಿಗೆ ಮಾತನಾಡಿ ಸಂತೋಷವಾಯಿತು.", "ಅವನು ಸಮಯ ತೆಗೆದುಕೊಳ್ಳಲಿ.",
    "ನನ್ನ ಹೆಸರು ______.", "ನಿಮ್ಮನ್ನು ಭೇಟಿಯಾಗಿ ಸಂತೋಷವಾಯಿತು.", "ಚಿಂತೆ ಬೇಕಿಲ್ಲ, ಚಿಂತಿಸಬೇಡಿ.",
    "ಇನ್ನು ಮುಂದೆ ಅವನು ನಿಮಗೆ ಎಂದಿಗೂ ನೋವು ಮಾಡುವುದಿಲ್ಲ.", "ಲೋಟಕ್ಕೆ ಇನ್ನೂ ಸ್ವಲ್ಪ ನೀರು ಹಾಕಿ.",
    "ಹಾಸಿಗೆ ಸಿದ್ಧಪಡಿಸಿ.", "ಊಟ ಬಡಿಸಿ.", "ನಾವು ಹೊರಗೆ ಹೋಗೋಣವೇ?", "ಮೆಲ್ಲಗೆ ಮಾತನಾಡಿ.",
    "ನಿಮ್ಮ ಬಗ್ಗೆ ಕಾಳಜಿ ವಹಿಸಿ.", "ನನಗೆ ಸತ್ಯ ಹೇಳಿ.", "ತುಂಬಾ ಧನ್ಯವಾದಗಳು.", "ಅದು ನಿಮ್ಮ ದೊಡ್ಡತನ.",
    "ಈ ಸ್ಥಳ ಸುಂದರವಾಗಿದೆ.", "ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಪ್ರಯತ್ನಿಸಿ.", "ದೀಪ ಹಾಕಿ, ದೀಪ ಆರಿಸಿ.",
    "ನಾವೆಲ್ಲರೂ ನಿಮ್ಮೊಂದಿಗಿದ್ದೇವೆ.", "ಅಂಗಿ ಹಾಕಿಕೊಳ್ಳಿ.", "ನೀವು ಏನು ಮಾಡುತ್ತಿದ್ದೀರಿ?",
    "ನೀವು ಅವನಿಗೆ ಏನು ಹೇಳಿದಿರಿ?", "ನೀವು ಏನು ಮಾಡುತ್ತೀರಿ?", "ನೀವು ಏನು ಯೋಚಿಸುತ್ತೀರಿ?",
    "ನೀವು ಏನಾಗಲು ಬಯಸುತ್ತೀರಿ?", "ಏನಾಯಿತು?", "ನಿಮ್ಮ ವೃತ್ತಿಜೀವನಕ್ಕಾಗಿ ಏನು ಯೋಜನೆ ಮಾಡಿದ್ದೀರಿ?",
    "ನಿಮ್ಮ ಫೋನ್ ಸಂಖ್ಯೆ ಏನು?", "ನಿಮಗೆ ಏನು ಬೇಕು?", "ರೈಲು ಯಾವಾಗ ಹೊರಡುತ್ತದೆ?", "ನೀವು ಎಲ್ಲಿಯವರು?",
    "ನೀವು ಯಾವ ಕಾಲೇಜು/ಶಾಲೆಯವರು?", "ನೀವು ಯಾರು?", "ನೀವು ಯಾಕೆ ಕೋಪಗೊಂಡಿದ್ದೀರಿ?", "ನೀವು ಯಾಕೆ ಅಳುತ್ತಿದ್ದೀರಿ?",
    "ನೀವು ಯಾಕೆ ನಿರಾಶರಾಗಿದ್ದೀರಿ?", "ನೀವು ಕೆಟ್ಟವರು.", "ನೀವು ಒಳ್ಳೆಯವರು.", "ಪರವಾಗಿಲ್ಲ.", "ನಿಮ್ಮಿಂದ ಸಾಧ್ಯ.",
    "ನೀವು ಏನಾದರೂ ಮಾಡಿ, ನನಗೆ ಚಿಂತೆಯಿಲ್ಲ.", "ನಿಮಗೆ ಔಷಧಿ ಬೇಕು, ಇದನ್ನು ತೆಗೆದುಕೊಳ್ಳಿ.",
]

GLOSS_FIXES = {"DONOT": ["DO", "NOT"], "DONT": ["DO", "NOT"], "CONGRATULATIIONS": ["CONGRATULATIONS"],
               "(AGE)": ["AGE"], "XXXXXXXX": ["NAME-FINGERSPELLED"]}


def sentence_key(s: str) -> str:
    """Matching key that tolerates the corpus' spacing/case inconsistencies."""
    return re.sub(r"[^a-z]", "", str(s).lower())


def normalize_gloss(gloss: str) -> list[str]:
    out = []
    for tok in str(gloss).replace(",", " ").split():
        tok = tok.strip(".").upper()
        if tok:
            out.extend(GLOSS_FIXES.get(tok, [tok]))
    return out


def main():
    backend = Path(__file__).resolve().parent.parent
    src = backend / "data/raw/isl_csltr/extracted/ISL_CSLRT_Corpus/corpus_csv_files/ISL Corpus sign glosses.csv"
    rows = list(csv.DictReader(src.open(encoding="utf-8-sig")))
    assert len(rows) == len(KANNADA), (len(rows), len(KANNADA))
    sentences = {}
    for i, (r, kn) in enumerate(zip(rows, KANNADA)):
        sent = " ".join(r["Sentence"].split())
        sentences[f"s{i:03d}"] = {
            "sentence": sent, "key": sentence_key(sent), "gloss_original": r["SIGN GLOSSES"].strip(),
            "gloss": normalize_gloss(r["SIGN GLOSSES"]), "kannada": clean_display_text(kn),
            "translation_status": "draft (AI-assisted), not reviewed by a native Kannada speaker",
        }
    out = {"_comment": "ISL-CSLTR sentence table. 'gloss' is the normalized training target (see tools/"
                       "make_csltr_mapping.py GLOSS_FIXES); 'gloss_original' is the corpus annotation. Kannada "
                       "sentences are draft translations, not reviewed.",
           "dataset": "isl_csltr", "gloss_fixes": GLOSS_FIXES, "sentences": sentences}
    path = backend / "data/mappings/isl_csltr.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    vocab = sorted({g for s in sentences.values() for g in s["gloss"]})
    print(f"{len(sentences)} sentences, {len(vocab)} gloss types after normalization -> {path}")


if __name__ == "__main__":
    main()
