import { describe, expect, it } from "vitest";
import { classify, ExpressionSmoother, rawScores } from "./expressionClassifier";

describe("expression heuristic", () => {
  it("returns neutral for a relaxed face", () => {
    expect(classify(rawScores({ mouthSmileLeft: 0.05, mouthSmileRight: 0.05 })).label).toBe("neutral");
  });

  it("detects a smile", () => {
    expect(classify(rawScores({ mouthSmileLeft: 0.8, mouthSmileRight: 0.75 })).label).toBe("happy");
  });

  it("detects raised brows with open jaw as surprised, not sad", () => {
    const s = rawScores({ browInnerUp: 0.8, eyeWideLeft: 0.6, eyeWideRight: 0.6, jawOpen: 0.7 });
    expect(classify(s).label).toBe("surprised");
    expect(s.sad).toBeLessThan(1);
  });

  it("detects lowered brows as angry-looking", () => {
    expect(classify(rawScores({ browDownLeft: 0.6, browDownRight: 0.6 })).label).toBe("angry");
  });

  it("reports uncertain when two expressions are close", () => {
    expect(classify({ happy: 1.2, sad: 0, angry: 1.15, surprised: 0 }).label).toBe("uncertain");
  });

  it("handles a missing face", () => {
    const sm = new ExpressionSmoother(0.5, 3);
    expect(sm.update(null).label).toBe("no_face");
    sm.update({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 });
    expect(sm.update(null).label).toBe("happy"); // brief dropout keeps last estimate
    sm.update(null);
    expect(sm.update(null).label).toBe("no_face");
  });

  it("does not flicker between labels on alternating frames", () => {
    const sm = new ExpressionSmoother(1, 15, 3);           // alpha 1: no score smoothing, only label hysteresis
    sm.update({});
    const smile = { mouthSmileLeft: 0.9, mouthSmileRight: 0.9 };
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) seen.add(sm.update(i % 2 ? smile : {}).label);
    expect([...seen]).toEqual(["neutral"]);                // a smile on every other frame never wins
    let last = "";
    for (let i = 0; i < 3; i++) last = sm.update(smile).label;
    expect(last).toBe("happy");                            // a sustained change is shown after 3 frames
  });

  it("smooths over time", () => {
    const sm = new ExpressionSmoother(0.25);
    sm.update({});
    expect(sm.update({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }).label).toBe("neutral"); // one frame is not enough
    let last = "";
    for (let i = 0; i < 10; i++) last = sm.update({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }).label;
    expect(last).toBe("happy");
  });
});
