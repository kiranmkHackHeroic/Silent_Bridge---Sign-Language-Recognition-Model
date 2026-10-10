"""Record the Kannada wording review of every sign label in data/labels.json.

This is an AI-assisted spelling / word-choice check (Unicode NFC, script, meaning of the word
against the English gloss). It is NOT a native-speaker or Deaf-community review: 'verified'
stays false for every label until such a reviewer confirms it.

Usage (from backend/):  python tools/review_kannada_labels.py
"""
from __future__ import annotations

import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import LABELS_FILE  # noqa: E402
from app.translation.kannada_mapping import is_kannada  # noqa: E402

REVIEWER = "AI-assisted word-choice check (2026-10-10); native-speaker and ISL review pending"
CHANGES = {   # label -> (new Kannada, reason)
    "understand": ("ಅರ್ಥಮಾಡಿಕೊಳ್ಳು", "ಅರ್ಥ alone is the noun 'meaning'; the verb 'understand' is ಅರ್ಥಮಾಡಿಕೊಳ್ಳು"),
}
NOTES = {
    "sit": "polite imperative ('please sit'); eat/drink/write use the plain verb form: register to be harmonised by a native speaker",
    "stand": "polite imperative ('please stand'); see 'sit'",
    "stop": "polite imperative ('please stop'); see 'sit'",
    "wait": "polite imperative ('please wait'); see 'sit'",
    "pleased": "ಸಂತೋಷ is the noun 'happiness/pleasure', used as the gloss word",
    "sick": "ಅನಾರೋಗ್ಯ is the noun 'illness', used as the gloss word",
    "power": "English class name is ambiguous (electricity vs strength); ವಿದ್ಯುತ್ = electricity",
    "study": "ಓದು means both 'read' and 'study'",
    "food": "ಊಟ = meal; ಆಹಾರ = food in general",
    "need": "ಬೇಕು = 'need / want' (modal); a sentence needs the subject in the dative (ನನಗೆ ... ಬೇಕು)",
    "grey": "ಬೂದು ಬಣ್ಣ = 'grey colour'",
    "you_plural": "ನೀವೆಲ್ಲರೂ = 'all of you'",
}


def main():
    data = json.loads(LABELS_FILE.read_text(encoding="utf-8"))
    changed = 0
    for item in data["labels"]:
        lab = item["label"]
        if lab == "_none":
            continue
        kn = item.get("kannada", "")
        problems = []
        if kn != unicodedata.normalize("NFC", kn):
            problems.append("not NFC")
        if kn and not is_kannada(kn):
            problems.append("contains non-Kannada script")
        if lab in CHANGES and kn != CHANGES[lab][0]:
            item["kannada"] = CHANGES[lab][0]
            changed += 1
        item["kannada_review"] = {
            "status": "changed" if lab in CHANGES else ("issues: " + ", ".join(problems) if problems else "word choice checked"),
            "note": CHANGES[lab][1] if lab in CHANGES else NOTES.get(lab, ""),
            "by": REVIEWER,
        }
    LABELS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"reviewed {len(data['labels']) - 1} labels, changed {changed}")


if __name__ == "__main__":
    main()
