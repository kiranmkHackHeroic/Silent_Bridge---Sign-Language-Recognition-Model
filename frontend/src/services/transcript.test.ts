import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  correctAt, exportText, fromServerToken, insertPunctuation, joinTranscript, removeAt, type TranscriptItem,
} from "./transcript";
import type { TranscriptToken } from "./types";

const tok = (label: string, kannada: string): TranscriptToken => ({
  label, kannada, english: label, confidence: 0.9, source: "model", t: 0,
});

const items = (): TranscriptItem[] => [
  fromServerToken(tok("your", "ನಿಮ್ಮ")),
  fromServerToken(tok("name", "ಹೆಸರು")),
  fromServerToken(tok("what", "ಏನು")),
];

describe("Kannada transcript", () => {
  it("joins words with single spaces", () => {
    assert.equal(joinTranscript(items()), "ನಿಮ್ಮ ಹೆಸರು ಏನು");
  });

  it("attaches punctuation to the previous word", () => {
    assert.equal(joinTranscript(insertPunctuation(items(), "?")), "ನಿಮ್ಮ ಹೆಸರು ಏನು?");
    const mid = insertPunctuation(items(), ",", 0);
    assert.equal(joinTranscript(mid), "ನಿಮ್ಮ, ಹೆಸರು ಏನು");
  });

  it("replaces instead of stacking punctuation", () => {
    const once = insertPunctuation(items(), "?");
    const twice = insertPunctuation(once, ".");
    assert.equal(twice.length, 4);
    assert.equal(joinTranscript(twice), "ನಿಮ್ಮ ಹೆಸರು ಏನು.");
  });

  it("corrects a mistaken sign and marks it edited", () => {
    const fixed = correctAt(items(), 2, { label: "need", kannada: "ಬೇಕು", english: "Need" });
    assert.equal(joinTranscript(fixed), "ನಿಮ್ಮ ಹೆಸರು ಬೇಕು");
    assert.equal(fixed[2].source, "edited");
  });

  it("removes an incorrect word", () => {
    assert.equal(joinTranscript(removeAt(items(), 1)), "ನಿಮ್ಮ ಏನು");
  });

  it("normalizes to NFC and keeps Kannada characters intact", () => {
    const decomposed = "ಕೊ".normalize("NFD");
    const t = fromServerToken(tok("x", decomposed));
    assert.equal(t.kannada, "ಕೊ".normalize("NFC"));
    for (const word of ["ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದಗಳು", "ನೀರು", "ಸಹಾಯ ಬೇಕು"]) {
      assert.equal(exportText(word), word);
    }
  });

  it("exports tidy text for copying", () => {
    assert.equal(exportText("  ನಿಮ್ಮ   ಹೆಸರು ಏನು ?  "), "ನಿಮ್ಮ ಹೆಸರು ಏನು?");
  });

  it("does not show confidence for simulated tokens", () => {
    assert.equal(fromServerToken({ ...tok("x", "ನೀರು"), source: "simulated" }).confidence, null);
  });
});
