import { describe, expect, it } from "vitest";
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
    expect(joinTranscript(items())).toBe("ನಿಮ್ಮ ಹೆಸರು ಏನು");
  });

  it("attaches punctuation to the previous word", () => {
    expect(joinTranscript(insertPunctuation(items(), "?"))).toBe("ನಿಮ್ಮ ಹೆಸರು ಏನು?");
    const mid = insertPunctuation(items(), ",", 0);
    expect(joinTranscript(mid)).toBe("ನಿಮ್ಮ, ಹೆಸರು ಏನು");
  });

  it("replaces instead of stacking punctuation", () => {
    const once = insertPunctuation(items(), "?");
    const twice = insertPunctuation(once, ".");
    expect(twice).toHaveLength(4);
    expect(joinTranscript(twice)).toBe("ನಿಮ್ಮ ಹೆಸರು ಏನು.");
  });

  it("corrects a mistaken sign and marks it edited", () => {
    const fixed = correctAt(items(), 2, { label: "need", kannada: "ಬೇಕು", english: "Need" });
    expect(joinTranscript(fixed)).toBe("ನಿಮ್ಮ ಹೆಸರು ಬೇಕು");
    expect(fixed[2].source).toBe("edited");
  });

  it("removes an incorrect word", () => {
    expect(joinTranscript(removeAt(items(), 1))).toBe("ನಿಮ್ಮ ಏನು");
  });

  it("normalizes to NFC and keeps Kannada characters intact", () => {
    const decomposed = "ಕೊ".normalize("NFD");
    const t = fromServerToken(tok("x", decomposed));
    expect(t.kannada).toBe("ಕೊ".normalize("NFC"));
    for (const word of ["ನಮಸ್ಕಾರ", "ಧನ್ಯವಾದಗಳು", "ನೀರು", "ಸಹಾಯ ಬೇಕು"]) {
      expect(exportText(word)).toBe(word);
    }
  });

  it("exports tidy text for copying", () => {
    expect(exportText("  ನಿಮ್ಮ   ಹೆಸರು ಏನು ?  ")).toBe("ನಿಮ್ಮ ಹೆಸರು ಏನು?");
  });

  it("does not show confidence for simulated tokens", () => {
    expect(fromServerToken({ ...tok("x", "ನೀರು"), source: "simulated" }).confidence).toBeNull();
  });
});
