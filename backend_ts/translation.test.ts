import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ActivitySegmenter,
  computeMotion,
  defaultRecognitionSettings,
  editCounts,
  FRAME_DIM,
  framesToVector,
  parseFrame,
} from "./features.ts";
import {
  KannadaSignMapper,
  normalizeKannada,
  SemanticTranslator,
  SentenceBuilder,
  Vocabulary,
} from "./translation.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "backend", "data");

describe("Vocabulary & KannadaSignMapper", () => {
  const vocab = new Vocabulary(path.join(DATA_DIR, "labels.json"));
  const mapper = new KannadaSignMapper(path.join(DATA_DIR, "kannada_sign_mapping.json"));

  it("loads vocabulary entries and excludes special labels by default", () => {
    const list = vocab.asList();
    assert.ok(list.length >= 140, "should load 140+ signs");
    assert.ok(list.every((s) => !s.label.startsWith("_")));
    const namaskara = vocab.get("namaskara");
    assert.ok(namaskara);
    assert.equal(namaskara.kannada, "ನಮಸ್ಕಾರ");
    assert.equal(vocab.emittable("namaskara"), true);
    assert.equal(vocab.emittable("_none"), false);
  });

  it("normalizes Kannada text and strips punctuation while preserving vowel signs", () => {
    assert.equal(normalizeKannada("  ನಮಸ್ಕಾರ,   ನನಗೆ ನೀರು ಬೇಕು! "), "ನಮಸ್ಕಾರ ನನಗೆ ನೀರು ಬೇಕು");
  });

  it("translates Kannada phrases and multi-word expressions into sign_ids", () => {
    const items = mapper.translate("ನನಗೆ ನೀರು ಬೇಕು");
    const signIds = items.flatMap((it) => it.sign_ids);
    assert.deepEqual(signIds, ["i_me", "water", "need"]);
    assert.ok(items.every((it) => it.supported));
  });

  it("reports unsupported Kannada words accurately", () => {
    const items = mapper.translate("ನಮಸ್ಕಾರ ಅಜ್ಞಾತಪದ");
    const supportedIds = items.filter((it) => it.supported).flatMap((it) => it.sign_ids);
    const unsupported = items.filter((it) => !it.supported).map((it) => it.text);
    assert.deepEqual(supportedIds, ["namaskara"]);
    assert.deepEqual(unsupported, ["ಅಜ್ಞಾತಪದ"]);
  });
});

describe("SemanticTranslator (ISL glosses <-> Kannada grammar)", () => {
  const vocab = new Vocabulary(path.join(DATA_DIR, "labels.json"));
  const mapper = new KannadaSignMapper(path.join(DATA_DIR, "kannada_sign_mapping.json"));
  const semantic = new SemanticTranslator(vocab, mapper, vocab.asList().map((e) => e.label));

  it("translates phrase sequences into structured meaning and natural Kannada", () => {
    const res = semantic.translate(["i_me", "water", "need"]);
    assert.equal(res.status, "phrase");
    assert.ok(res.kannada_text.includes("ನನಗೆ ನೀರು ಬೇಕು"));
    assert.ok(res.natural_kannada.includes("ನನಗೆ ನೀರು ಬೇಕು"));
  });

  it("applies non-manual negation and eyebrow-raise question markers", () => {
    const neg = semantic.translate(["i_me", "water", "need"], ["head_shake"]);
    assert.ok(neg.natural_kannada.includes("ಬೇಡ"), "head_shake should negate ಬೇಕು -> ಬೇಡ");

    const q = semantic.translate(["you", "home", "go"], { sentence_type: "question", negation: false });
    assert.ok(q.natural_kannada.endsWith("?"), "question marker should form a question");
  });

  it("reverses Kannada sentences into ISL gloss sequences", () => {
    const rev = semantic.reverse("ನನಗೆ ನೀರು ಬೇಕು");
    assert.deepEqual(rev.gloss_sequence, ["I/ME", "WATER", "NEED"]);
    assert.equal(rev.unsupported.length, 0);
  });
});

describe("SentenceBuilder & Feature Pipeline", () => {
  const vocab = new Vocabulary(path.join(DATA_DIR, "labels.json"));

  it("suppresses duplicate sign tokens within 600ms and allows later repeats", () => {
    const builder = new SentenceBuilder(vocab, 600);
    const t1 = builder.add("namaskara", 0.91, 1000);
    const t2 = builder.add("namaskara", 0.93, 1300); // suppressed
    const t3 = builder.add("namaskara", 0.89, 1800); // allowed (>= 600ms)
    assert.ok(t1);
    assert.equal(t2, null);
    assert.ok(t3);
    assert.equal(builder.text(), "ನಮಸ್ಕಾರ ನಮಸ್ಕಾರ");
  });

  it("parses 21-point hand landmarks into 147-d frame vectors and 3668-d sequence vectors", () => {
    const makeHand = (dx: number) =>
      Array.from({ length: 21 }, (_, i) => [0.3 + dx + (i % 5) * 0.03, 0.4 + Math.floor(i / 5) * 0.04, 0.0]);

    const frames = [];
    let prev = null;
    for (let i = 0; i < 10; i++) {
      const f = parseFrame({
        t: i * 33.3,
        w: 640,
        h: 480,
        hands: [{ handedness: "Left", score: 0.98, landmarks: makeHand(i * 0.01) }],
        face: { cx: 0.5, cy: 0.3, w: 0.2, h: 0.25 },
      });
      assert.equal(f.vector.length, FRAME_DIM);
      assert.equal(f.has_hands, true);
      computeMotion(prev, f);
      prev = f;
      frames.push(f);
    }

    const vec = framesToVector(frames);
    assert.ok(vec);
    assert.equal(vec.length, 3668);

    const seg = new ActivitySegmenter(defaultRecognitionSettings());
    for (const f of frames) seg.update(f);
    assert.equal(seg.active, true);
    const closed = seg.flush();
    assert.ok(closed);
    assert.equal(closed.reason, "flush");
  });

  it("computes Levenshtein sign error rate counts accurately", () => {
    const counts = editCounts(["namaskara", "i_me", "water"], ["namaskara", "water"]);
    assert.equal(counts.reference_signs, 3);
    assert.equal(counts.deletions, 1);
    assert.equal(counts.substitutions, 0);
    assert.equal(counts.insertions, 0);
  });
});
