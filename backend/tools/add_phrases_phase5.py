"""Phase-5 phrase expansion: phrases built ONLY from signs the active model can recognise.

Each entry stores the sign sequence (proposed ISL order: time/topic first, no copula), the English
meaning and a natural Kannada sentence. Where ISL marks the meaning with the face (statement vs
question) or with direction (I HELP = "help me" / "I will help"), BOTH meanings are entered for the
same sign sequence; the first is the default and the translator reports the sequence as ambiguous.
All entries are verified=false: Kannada wording was AI-assisted, the ISL order is a proposal, and
both need review by a native Kannada speaker and an ISL user.

Idempotent. Run from backend/:  python tools/add_phrases_phase5.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.config import KANNADA_MAPPING_FILE  # noqa: E402
from app.translation.kannada_mapping import clean_display_text, normalize_kannada  # noqa: E402

SOURCE = "phase-5 phrase set (AI-assisted Kannada, proposed ISL order; review pending)"
Q = "Question vs statement is marked by facial expression in ISL; the manual signs are the same."

# (category, Kannada, English, sign_ids, notes)
PHRASES = [
    ("Greetings", "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?", "Hello, how are you?", ["namaskara", "how_are_you"], ""),
    ("Greetings", "ಶುಭ ಮಧ್ಯಾಹ್ನ", "Good afternoon", ["good_afternoon"], ""),
    ("Greetings", "ಶುಭ ಸಂಜೆ", "Good evening", ["good_evening"], ""),
    ("Greetings", "ಶುಭೋದಯ, ಶಿಕ್ಷಕರೇ", "Good morning, teacher.", ["good_morning", "teacher"], ""),
    ("Introductions", "ನಿಮ್ಮ ಹೆಸರೇನು?", "What is your name?", ["you", "name"], Q),
    ("Introductions", "ನಿಮ್ಮ ಹೆಸರು", "Your name", ["you", "name"], "Statement reading of YOU NAME."),
    ("Introductions", "ನಾನು ಶಿಕ್ಷಕ", "I am a teacher.", ["i_me", "teacher"], "ಶಿಕ್ಷಕಿ when the signer is a woman."),
    ("Introductions", "ನಾನು ಚೆನ್ನಾಗಿದ್ದೇನೆ", "I am fine.", ["i_me", "good"], ""),
    ("Introductions", "ನನಗೆ ಸಂತೋಷವಾಗಿದೆ", "I am happy.", ["i_me", "pleased"], ""),
    ("Education and college", "ನಾನು ಇಂದು ಓದುತ್ತೇನೆ", "I will study today.", ["today", "i_me", "study"], "Time sign first."),
    ("Education and college", "ಅವನು ವಿದ್ಯಾರ್ಥಿ", "He is a student.", ["he", "student"], ""),
    ("Education and college", "ಅವಳು ಶಿಕ್ಷಕಿ", "She is a teacher.", ["she", "teacher"], ""),
    ("Education and college", "ಅವರು ವಿದ್ಯಾರ್ಥಿಗಳು", "They are students.", ["they", "student"], ""),
    ("Education and college", "ಶಿಕ್ಷಕರು ಒಳ್ಳೆಯವರು", "The teacher is good.", ["teacher", "good"], ""),
    ("Education and college", "ಧನ್ಯವಾದಗಳು, ಶಿಕ್ಷಕರೇ", "Thank you, teacher.", ["thank_you", "teacher"], ""),
    ("Education and college", "ನಾನು ಬರೆಯುತ್ತಿದ್ದೇನೆ", "I am writing.", ["i_me", "write"], ""),
    ("Family", "ನನ್ನ ಸ್ನೇಹಿತ", "My friend", ["i_me", "friend"], ""),
    ("Family", "ನಾವು ಸ್ನೇಹಿತರು", "We are friends.", ["we", "friend"], ""),
    ("Family", "ಅವಳು ನನ್ನ ತಾಯಿ", "She is my mother.", ["she", "i_me", "mother"], ""),
    ("Family", "ಅವನು ನನ್ನ ತಂದೆ", "He is my father.", ["he", "i_me", "father"], ""),
    ("Family", "ಅವನು ನನ್ನ ಸಹೋದರ", "He is my brother.", ["he", "i_me", "brother"], ""),
    ("Food and water", "ನೀವು ಊಟ ಮಾಡಿದಿರಾ?", "Did you eat?", ["you", "eat"], Q),
    ("Food and water", "ದಯವಿಟ್ಟು ತಿನ್ನಿರಿ", "Please eat.", ["you", "eat"], "Imperative reading of YOU EAT."),
    ("Food and water", "ನಾನು ತಿನ್ನುತ್ತಿದ್ದೇನೆ", "I am eating.", ["i_me", "eat"], ""),
    ("Food and water", "ನಾನು ಕುಡಿಯುತ್ತಿದ್ದೇನೆ", "I am drinking.", ["i_me", "drink"], ""),
    ("Common questions", "ನೀವು ವಿದ್ಯಾರ್ಥಿಯೇ?", "Are you a student?", ["you", "student"], Q),
    ("Common questions", "ನೀವು ವಿದ್ಯಾರ್ಥಿ", "You are a student.", ["you", "student"], "Statement reading."),
    ("Common questions", "ನೀವು ಕೆಲಸ ಮಾಡುತ್ತೀರಾ?", "Do you work?", ["you", "work"], Q),
    ("Common questions", "ನೀವು ಕೆಲಸ ಮಾಡುತ್ತೀರಿ", "You work.", ["you", "work"], "Statement reading."),
    ("Assistance", "ಸಹಾಯ ಮಾಡಿ!", "Help!", ["help"], ""),
    ("Assistance", "ನನಗೆ ಸಹಾಯ ಮಾಡಿ", "Please help me.", ["i_me", "help"],
     "Directional verb in ISL: the movement direction distinguishes 'help me' from 'I will help'."),
    ("Assistance", "ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ", "I will help.", ["i_me", "help"], "Other reading of I HELP."),
    ("Assistance", "ದಯವಿಟ್ಟು ಕುಳಿತುಕೊಳ್ಳಿ", "Please sit down.", ["sit"], ""),
    ("Assistance", "ದಯವಿಟ್ಟು ನಿಂತುಕೊಳ್ಳಿ", "Please stand up.", ["stand"], ""),
    ("Health and emergencies", "ನಿಲ್ಲಿಸಿ!", "Stop!", ["stop"], ""),
    ("Numbers and time", "ನಾಳೆ ನಾನು ಕೆಲಸ ಮಾಡುತ್ತೇನೆ", "I will work tomorrow.", ["tomorrow", "i_me", "work"], "Time sign first."),
    ("Numbers and time", "ನಿನ್ನೆ ನಾನು ಓದಿದೆ", "I studied yesterday.", ["yesterday", "i_me", "study"], "Time sign first."),
    ("Numbers and time", "ಇಂದು ರಾತ್ರಿ", "Tonight", ["today", "night"], ""),
    ("Everyday responses", "ಸರಿ", "OK.", ["alright"], ""),
    ("Everyday responses", "ಒಳ್ಳೆಯದು", "Good.", ["good"], ""),
    ("Everyday responses", "ನಾನು ಮಲಗುತ್ತೇನೆ", "I am going to sleep.", ["i_me", "sleep"], ""),
    ("Everyday responses", "ನನಗೆ ಕೋಪ ಬಂದಿದೆ", "I am angry.", ["i_me", "angry"], ""),
    ("Everyday responses", "ನಾನು ಕೆಲಸ ಮಾಡುತ್ತೇನೆ", "I work.", ["i_me", "work"], ""),
]


def main():
    data = json.loads(KANNADA_MAPPING_FILE.read_text(encoding="utf-8"))
    entries = data.setdefault("entries", {})
    added = upgraded = skipped = 0
    for cat, kn, en, signs, notes in PHRASES:
        key = normalize_kannada(kn)
        new = {"sign_ids": signs, "verified": False, "source": SOURCE, "notes": notes,
               "english": en, "category": cat, "display": clean_display_text(kn)}
        if key in entries:
            old = entries[key]
            if not old.get("category") and old.get("sign_ids") == signs:
                old.update({k: new[k] for k in ("english", "category", "display")})   # alias -> phrase meaning
                upgraded += 1
            else:
                skipped += 1
            continue
        entries[key] = new
        added += 1
    KANNADA_MAPPING_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"added {added}, upgraded {upgraded}, skipped (already present) {skipped}")


if __name__ == "__main__":
    main()
