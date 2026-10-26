"""Add a curated set of INCLUDE signs (daily communication) to the app vocabulary.

For each sign: the INCLUDE class (matched by its NAME in the official metadata), an app label, English, Kannada and
an ISL gloss. Writes
  - data/labels.json                 vocabulary entry (verified=false, AI-assisted Kannada word, review pending)
  - data/kannada_sign_mapping.json   Kannada word -> sign, for Kannada -> Sign (unverified)
  - data/mappings/include.json       INCLUDE class -> app label, so import + training use INCLUDE's official split
Then run tools/download_include_subset.py, the INCLUDE import and training.

Refuses duplicate labels and Kannada words that already name another sign. Usage (from backend/):
    python tools/add_include_signs.py [--dry-run]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app.translation.kannada_mapping import KannadaSignMapper, normalize_kannada  # noqa: E402

LABELS = ROOT / "data" / "labels.json"
MAPPING = ROOT / "data" / "mappings" / "include.json"
RAW = ROOT / "data" / "raw" / "include"
REVIEW = {"status": "word choice checked", "note": "",
          "by": "AI-assisted word choice (2026-10-25); native-speaker and ISL review pending"}

# (INCLUDE class name without its number, app label, English, Kannada, ISL gloss)
SIGNS = [
    # people
    ("Son", "son", "Son", "ಮಗ", "SON"), ("Daughter", "daughter", "Daughter", "ಮಗಳು", "DAUGHTER"),
    ("Sister", "sister", "Sister", "ಸಹೋದರಿ", "SISTER"), ("Baby", "baby", "Baby", "ಶಿಶು", "BABY"),
    ("Child", "child", "Child", "ಮಗು", "CHILD"), ("Man", "man", "Man", "ಗಂಡಸು", "MAN"),
    ("Woman", "woman", "Woman", "ಹೆಂಗಸು", "WOMAN"), ("Family", "family", "Family", "ಕುಟುಂಬ", "FAMILY"),
    ("Grandfather", "grandfather", "Grandfather", "ಅಜ್ಜ", "GRANDFATHER"),
    ("Grandmother", "grandmother", "Grandmother", "ಅಜ್ಜಿ", "GRANDMOTHER"),
    ("Husband", "husband", "Husband", "ಗಂಡ", "HUSBAND"), ("Wife", "wife", "Wife", "ಹೆಂಡತಿ", "WIFE"),
    # places (INCLUDE "House" = the existing, untrained vocabulary sign "home")
    ("House", "home", None, None, None), ("School", "school", "School", "ಶಾಲೆ", "SCHOOL"),
    ("Hospital", "hospital", "Hospital", "ಆಸ್ಪತ್ರೆ", "HOSPITAL"), ("Market", "market", "Market", "ಮಾರುಕಟ್ಟೆ", "MARKET"),
    ("Temple", "temple", "Temple", "ದೇವಸ್ಥಾನ", "TEMPLE"), ("Bank", "bank", "Bank", "ಬ್ಯಾಂಕ್", "BANK"),
    ("Office", "office", "Office", "ಕಚೇರಿ", "OFFICE"), ("Store or Shop", "shop", "Shop / store", "ಅಂಗಡಿ", "SHOP"),
    ("Street or Road", "road", "Road / street", "ರಸ್ತೆ", "ROAD"),
    ("Train Station", "railway_station", "Railway station", "ರೈಲು ನಿಲ್ದಾಣ", "TRAIN-STATION"),
    ("Restaurant", "restaurant", "Restaurant", "ಉಪಾಹಾರ ಗೃಹ", "RESTAURANT"), ("City", "city", "City", "ನಗರ", "CITY"),
    # days and time
    ("Sunday", "sunday", "Sunday", "ಭಾನುವಾರ", "SUNDAY"), ("Monday", "monday", "Monday", "ಸೋಮವಾರ", "MONDAY"),
    ("Tuesday", "tuesday", "Tuesday", "ಮಂಗಳವಾರ", "TUESDAY"), ("Wednesday", "wednesday", "Wednesday", "ಬುಧವಾರ", "WEDNESDAY"),
    ("Thursday", "thursday", "Thursday", "ಗುರುವಾರ", "THURSDAY"), ("Friday", "friday", "Friday", "ಶುಕ್ರವಾರ", "FRIDAY"),
    ("Saturday", "saturday", "Saturday", "ಶನಿವಾರ", "SATURDAY"), ("Week", "week", "Week", "ವಾರ", "WEEK"),
    ("Month", "month", "Month", "ತಿಂಗಳು", "MONTH"), ("Year", "year", "Year", "ವರ್ಷ", "YEAR"),
    ("Morning", "morning", "Morning", "ಬೆಳಿಗ್ಗೆ", "MORNING"), ("Time", "time", "Time", "ಸಮಯ", "TIME"),
    # colours
    ("Red", "red", "Red", "ಕೆಂಪು", "RED"), ("Green", "green", "Green", "ಹಸಿರು", "GREEN"),
    ("Blue", "blue", "Blue", "ನೀಲಿ", "BLUE"), ("Yellow", "yellow", "Yellow", "ಹಳದಿ", "YELLOW"),
    ("White", "white", "White", "ಬಿಳಿ", "WHITE"), ("Brown", "brown", "Brown", "ಕಂದು", "BROWN"),
    ("Pink", "pink", "Pink", "ಗುಲಾಬಿ ಬಣ್ಣ", "PINK"), ("Orange", "orange", "Orange (colour)", "ಕಿತ್ತಳೆ ಬಣ್ಣ", "ORANGE"),
    # transport
    ("Bus", "bus", "Bus", "ಬಸ್", "BUS"), ("Car", "car", "Car", "ಕಾರು", "CAR"), ("Train", "train", "Train", "ರೈಲು", "TRAIN"),
    ("Bicycle", "bicycle", "Bicycle", "ಸೈಕಲ್", "BICYCLE"), ("Plane", "plane", "Aeroplane", "ವಿಮಾನ", "PLANE"),
    ("Boat", "boat", "Boat", "ದೋಣಿ", "BOAT"),
    # things
    ("Cell phone", "phone", "Mobile phone", "ಮೊಬೈಲ್ ಫೋನ್", "PHONE"), ("Computer", "computer", "Computer", "ಕಂಪ್ಯೂಟರ್", "COMPUTER"),
    ("Television", "television", "Television", "ದೂರದರ್ಶನ", "TELEVISION"), ("Clock", "clock", "Clock", "ಗಡಿಯಾರ", "CLOCK"),
    ("Fan", "fan", "Fan", "ಫ್ಯಾನ್", "FAN"), ("Book", "book", "Book", "ಪುಸ್ತಕ", "BOOK"), ("Pen", "pen", "Pen", "ಲೇಖನಿ", "PEN"),
    ("Key", "key", "Key", "ಬೀಗದ ಕೈ", "KEY"), ("Bag", "bag", "Bag", "ಚೀಲ", "BAG"),
    ("Bathroom", "bathroom", "Bathroom", "ಸ್ನಾನಗೃಹ", "BATHROOM"),
    ("Shirt", "shirt", "Shirt", "ಅಂಗಿ", "SHIRT"), ("Shoes", "shoes", "Shoes", "ಬೂಟು", "SHOES"),
    # society, jobs
    ("Money", "money", "Money", "ಹಣ", "MONEY"), ("Medicine", "medicine", "Medicine", "ಔಷಧಿ", "MEDICINE"),
    ("God", "god", "God", "ದೇವರು", "GOD"), ("Marriage", "marriage", "Marriage", "ಮದುವೆ", "MARRIAGE"),
    ("Sport", "sport", "Sport", "ಕ್ರೀಡೆ", "SPORT"), ("Doctor", "doctor", "Doctor", "ವೈದ್ಯ", "DOCTOR"),
    ("Police", "police", "Police", "ಪೊಲೀಸ್", "POLICE"), ("Patient", "patient", "Patient", "ರೋಗಿ", "PATIENT"),
    # adjectives with 21 recordings
    ("happy", "happy", "Happy", "ಖುಷಿ", "HAPPY"), ("hot", "hot", "Hot", "ಬಿಸಿ", "HOT"),
    ("cold", "cold", "Cold", "ತಣ್ಣಗೆ", "COLD"), ("big large", "big", "Big / large", "ದೊಡ್ಡ", "BIG"),
    ("small little", "small", "Small / little", "ಚಿಕ್ಕ", "SMALL"), ("fast", "fast", "Fast", "ವೇಗ", "FAST"),
    ("slow", "slow", "Slow", "ನಿಧಾನ", "SLOW"), ("new", "new", "New", "ಹೊಸ", "NEW"), ("old", "old", "Old", "ಹಳೆಯ", "OLD"),
    ("healthy", "healthy", "Healthy", "ಆರೋಗ್ಯಕರ", "HEALTHY"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    meta = pd.concat([pd.read_parquet(RAW / f"{s}.parquet") for s in ("train", "val", "test")]).drop_duplicates("video_path")
    by_name = {re.sub(r"^\d+\.\s*", "", c).strip().lower(): c for c in meta["label"].unique()}
    counts = meta.groupby("label").size()
    labels_doc = json.loads(LABELS.read_text(encoding="utf-8"))
    vocab = {e["label"]: e for e in labels_doc["labels"]}
    used_kn = {normalize_kannada(e.get("kannada", "")): e["label"] for e in labels_doc["labels"] if e.get("kannada")}
    mapping = json.loads(MAPPING.read_text(encoding="utf-8"))
    mapper = KannadaSignMapper()
    problems, added, mapped = [], [], 0
    for name, label, english, kannada, gloss in SIGNS:
        cls = by_name.get(name.lower())
        if cls is None:
            problems.append(f"no INCLUDE class named '{name}'")
            continue
        if cls in mapping["classes"]:
            continue
        if english is None:                                    # maps onto an existing vocabulary sign
            entry = vocab.get(label)
            if entry is None:
                problems.append(f"'{label}' is not in the vocabulary")
                continue
            english, kannada, gloss = entry["english"], entry["kannada"], entry["isl_gloss"]
        else:
            if label in vocab:
                problems.append(f"label '{label}' already exists")
                continue
            owner = used_kn.get(normalize_kannada(kannada))
            if owner:
                problems.append(f"Kannada '{kannada}' already names '{owner}'")
                continue
            entry = {"label": label, "english": english, "kannada": kannada, "isl_gloss": gloss, "verified": False,
                     "notes": f"Class '{cls}' of the INCLUDE dataset (CC BY 4.0).", "kannada_review": dict(REVIEW)}
            vocab[label] = entry
            labels_doc["labels"].append(entry)
            used_kn[normalize_kannada(kannada)] = label
            added.append(label)
        mapping["classes"][cls] = {"label": label, "english": english, "kannada": kannada, "isl_gloss": gloss}
        mapped += 1
        print(f"{cls:22s} -> {label:16s} {kannada}  ({counts[cls]} videos)")
    print(f"\n{len(added)} new vocabulary signs, {mapped} INCLUDE classes mapped, {len(problems)} problem(s)")
    for p in problems:
        print("  !", p)
    if a.dry_run or problems:
        if problems:
            sys.exit("nothing written: fix the problems first")
        return
    LABELS.write_text(json.dumps(labels_doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    MAPPING.write_text(json.dumps(mapping, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for label in added:
        e = vocab[label]
        mapper.add(e["kannada"], label, f"INCLUDE sign added 2026-10-25 (AI-assisted Kannada, unverified)")
    print("written: labels.json, kannada_sign_mapping.json, mappings/include.json")


if __name__ == "__main__":
    main()
