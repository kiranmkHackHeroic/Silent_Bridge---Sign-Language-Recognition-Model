"""Adds the daily-communication phrase set to labels.json + kannada_sign_mapping.json.

Every phrase gets a PROPOSED ISL gloss order (topic-comment, question word last,
no copula - common descriptions of ISL grammar). All entries are verified=false:
they must be checked by an ISL-proficient reviewer before being presented as
correct translations. Gloss signs without data/animation are added to the
vocabulary so they can be recorded later; the app reports them as unavailable.

Run from backend/:  python tools/add_phrases.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.translation.kannada_mapping import clean_display_text, normalize_kannada  # noqa: E402

NEW_SIGNS = [
    ("how", "HOW", "How", "ಹೇಗೆ"), ("understand", "UNDERSTAND", "Understand", "ಅರ್ಥ"),
    ("again", "AGAIN", "Again", "ಮತ್ತೆ"), ("say", "SAY", "Say / tell", "ಹೇಳು"),
    ("where", "WHERE", "Where", "ಎಲ್ಲಿ"), ("go", "GO", "Go", "ಹೋಗು"), ("home", "HOME", "Home / house", "ಮನೆ"),
    ("wait", "WAIT", "Wait", "ಕಾಯಿರಿ"), ("emergency", "EMERGENCY", "Emergency", "ತುರ್ತು"),
    ("sick", "SICK", "Sick / unwell", "ಅನಾರೋಗ್ಯ"),
]

# (category, Kannada phrase, English meaning, proposed ISL gloss sign_ids, notes)
PHRASES = [
    ("Greetings", "ನಮಸ್ಕಾರ", "Hello", ["namaskara"], ""),
    ("Greetings", "ಶುಭೋದಯ", "Good morning", ["good_morning"], ""),
    ("Greetings", "ಶುಭ ರಾತ್ರಿ", "Good night", ["good", "night"], ""),
    ("Greetings", "ಸುಸ್ವಾಗತ", "Welcome", ["welcome"], ""),
    ("Introductions", "ನನ್ನ ಹೆಸರು", "My name (is ...)", ["i_me", "name"],
     "A following proper name must be fingerspelled; fingerspelling is not available, so the name is reported as unsupported."),
    ("Introductions", "ನಿಮ್ಮ ಹೆಸರು ಏನು", "What is your name?", ["your", "name", "what"], "Question sign at the end."),
    ("Introductions", "ನೀವು ಹೇಗಿದ್ದೀರಿ", "How are you?", ["you", "how"], "Question sign at the end; no copula."),
    ("Assistance", "ನನಗೆ ಸಹಾಯ ಬೇಕು", "I need help.", ["i_me", "help", "need"], ""),
    ("Assistance", "ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ", "I did not understand.", ["i_me", "understand", "no"], "Negation after the verb."),
    ("Assistance", "ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ", "Please say it again.", ["please", "again", "say"], ""),
    ("Assistance", "ದಯವಿಟ್ಟು ಕಾಯಿರಿ", "Please wait.", ["please", "wait"], ""),
    ("Food and water", "ನನಗೆ ನೀರು ಬೇಕು", "I need water.", ["i_me", "water", "need"], ""),
    ("Food and water", "ನನಗೆ ಊಟ ಬೇಕು", "I need food.", ["i_me", "food", "need"], ""),
    ("Travel and directions", "ನೀವು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ", "Where are you going?", ["you", "go", "where"], "Question sign at the end."),
    ("Travel and directions", "ನನಗೆ ಮನೆಗೆ ಹೋಗಬೇಕು", "I have to go home.", ["i_me", "home", "go", "need"], ""),
    ("Health and emergencies", "ತುರ್ತು ಸಹಾಯ ಬೇಕು", "I need emergency help.", ["emergency", "help", "need"], ""),
    ("Health and emergencies", "ನನಗೆ ಅನಾರೋಗ್ಯ", "I am unwell.", ["i_me", "sick"], ""),
    ("Everyday responses", "ಧನ್ಯವಾದಗಳು", "Thank you.", ["thank_you"], ""),
    ("Everyday responses", "ಹೌದು", "Yes.", ["yes"], ""),
    ("Everyday responses", "ಇಲ್ಲ", "No.", ["no"], ""),
    ("Everyday responses", "ಕ್ಷಮಿಸಿ", "Sorry.", ["sorry"], ""),
    ("Family", "ನನ್ನ ತಾಯಿ", "My mother", ["i_me", "mother"], ""),
    ("Family", "ನನ್ನ ತಂದೆ", "My father", ["i_me", "father"], ""),
    ("Family", "ನನ್ನ ಸಹೋದರ", "My brother", ["i_me", "brother"], ""),
    ("Education and college", "ನಾನು ವಿದ್ಯಾರ್ಥಿ", "I am a student.", ["i_me", "student"], "No copula."),
    ("Education and college", "ನಾನು ಓದುತ್ತೇನೆ", "I study.", ["i_me", "study"], ""),
    ("Numbers and time", "ಇಂದು", "Today", ["today"], ""),
    ("Numbers and time", "ನಾಳೆ", "Tomorrow", ["tomorrow"], ""),
    ("Numbers and time", "ನಿನ್ನೆ", "Yesterday", ["yesterday"], ""),
]


def main():
    root = Path(__file__).resolve().parent.parent / "data"
    labels = json.loads((root / "labels.json").read_text(encoding="utf-8"))
    mapping = json.loads((root / "kannada_sign_mapping.json").read_text(encoding="utf-8"))
    have = {x["label"] for x in labels["labels"]}
    none = [x for x in labels["labels"] if x["label"] == "_none"]
    rest = [x for x in labels["labels"] if x["label"] != "_none"]
    for label, gloss, english, kannada in NEW_SIGNS:
        if label not in have:
            rest.append({"label": label, "isl_gloss": gloss, "english": english, "kannada": clean_display_text(kannada),
                         "verified": False, "notes": "Needed by the phrase dictionary; no training data or animation yet."})
            have.add(label)
    added = 0
    for category, kannada, english, sign_ids, notes in PHRASES:
        assert set(sign_ids) <= have, (kannada, set(sign_ids) - have)
        key = normalize_kannada(kannada)
        entry = mapping["entries"].get(key, {})
        mapping["entries"][key] = {
            "sign_ids": sign_ids, "verified": False,
            "source": entry.get("source") if entry.get("source") and len(sign_ids) == 1 else "phrase dictionary (proposed ISL gloss order)",
            "notes": notes or entry.get("notes", ""), "english": english, "category": category,
            "display": clean_display_text(kannada),
        }
        added += 1
    labels["labels"] = rest + none
    (root / "labels.json").write_text(json.dumps(labels, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (root / "kannada_sign_mapping.json").write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n",
                                                    encoding="utf-8")
    print(f"phrases written: {added}; vocabulary size: {len(labels['labels'])}; dictionary entries: {len(mapping['entries'])}")


if __name__ == "__main__":
    main()
