import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classify, ExpressionSmoother, rawScores } from "./expressionClassifier";

describe("expression heuristic", () => {
  it("returns neutral for a relaxed face", () => {
    assert.equal(classify(rawScores({ mouthSmileLeft: 0.05, mouthSmileRight: 0.05 })).label, "neutral");
  });

  it("detects a smile", () => {
    assert.equal(classify(rawScores({ mouthSmileLeft: 0.8, mouthSmileRight: 0.75 })).label, "happy");
  });

  it("detects raised brows with open jaw as surprised, not sad", () => {
    const s = rawScores({ browInnerUp: 0.8, eyeWideLeft: 0.6, eyeWideRight: 0.6, jawOpen: 0.7 });
    assert.equal(classify(s).label, "surprised");
    assert.ok(s.sad < 1);
  });

  it("detects lowered brows as angry-looking", () => {
    assert.equal(classify(rawScores({ browDownLeft: 0.6, browDownRight: 0.6 })).label, "angry");
  });

  it("reports uncertain when two expressions are close", () => {
    assert.equal(classify({ happy: 1.2, sad: 0, angry: 1.15, surprised: 0 }).label, "uncertain");
  });

  it("handles a missing face", () => {
    const sm = new ExpressionSmoother(0.5, 3);
    assert.equal(sm.update(null).label, "no_face");
    sm.update({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 });
    assert.equal(sm.update(null).label, "happy");
    sm.update(null);
    assert.equal(sm.update(null).label, "no_face");
  });

  it("does not flicker between labels on alternating frames", () => {
    const sm = new ExpressionSmoother(1, 15, 3);
    sm.update({});
    const smile = { mouthSmileLeft: 0.9, mouthSmileRight: 0.9 };
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) seen.add(sm.update(i % 2 ? smile : {}).label);
    assert.deepEqual([...seen], ["neutral"]);
    let last = "";
    for (let i = 0; i < 3; i++) last = sm.update(smile).label;
    assert.equal(last, "happy");
  });

  it("smooths over time", () => {
    const sm = new ExpressionSmoother(0.25);
    sm.update({});
    assert.equal(sm.update({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }).label, "neutral");
    let last = "";
    for (let i = 0; i < 10; i++) last = sm.update({ mouthSmileLeft: 0.9, mouthSmileRight: 0.9 }).label;
    assert.equal(last, "happy");
  });
});
