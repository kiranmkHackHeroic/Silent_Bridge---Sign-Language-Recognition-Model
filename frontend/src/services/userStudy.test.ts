import test from "node:test";
import assert from "node:assert/strict";
import {
  TASK1_SIGN_BANK,
  TASK2_SENTENCES,
  SUS_ITEMS,
  aggregateStudySessions,
  buildTask1Trials,
  computeSessionMetrics,
  computeSusScore,
  exportSessionsToCsv,
  exportSessionsToJson,
  type CompletedStudySession,
  type Task1Response,
  type Task2Response,
  type Task3Response,
} from "./userStudy.ts";

test("Empty session list strictly reports zero sessions and null aggregate scores (zero fabricated human data)", () => {
  const agg = aggregateStudySessions([]);
  assert.equal(agg.sessionCount, 0);
  assert.equal(agg.realDeafSessionCount, 0);
  assert.equal(agg.meanTask1AccuracyPct, null);
  assert.equal(agg.meanTask1Clarity, null);
  assert.equal(agg.meanTask2GistPct, null);
  assert.equal(agg.meanTask2Naturalness, null);
  assert.equal(agg.meanUsefulness, null);
  assert.equal(agg.meanSusScore, null);
  assert.equal(agg.totalClipsEvaluated, 0);
  assert.equal(agg.totalSentencesEvaluated, 0);
});

test("buildTask1Trials produces 18 unique blind trials with deterministic 4-AFC options containing the true answer", () => {
  assert.equal(TASK1_SIGN_BANK.length, 18);
  assert.equal(TASK2_SENTENCES.length, 5);
  for (const s of TASK2_SENTENCES) {
    assert.equal(s.signIds.length >= 3 && s.signIds.length <= 5, true, `Sentence ${s.id} must have 3–5 signs`);
  }

  const runA = buildTask1Trials("P01");
  const runB = buildTask1Trials("P01");
  const runC = buildTask1Trials("P02");

  assert.equal(runA.length, 18);
  assert.deepEqual(
    runA.map((t) => t.sign.id),
    runB.map((t) => t.sign.id),
    "Same participant ID should yield identical deterministic trial order"
  );
  assert.notDeepEqual(
    runA.map((t) => t.sign.id),
    runC.map((t) => t.sign.id),
    "Different participant IDs should yield randomized trial orders"
  );

  const seenSigns = new Set<string>();
  for (const trial of runA) {
    assert.equal(seenSigns.has(trial.sign.id), false, "No duplicate sign in 18 trials");
    seenSigns.add(trial.sign.id);
    assert.equal(trial.options.length, 4, "Every trial must have 4-AFC options");
    const optIds = trial.options.map((o) => o.id);
    assert.equal(new Set(optIds).size, 4, "All 4 options must be unique");
    assert.equal(optIds.includes(trial.sign.id), true, "True sign must appear in 4-AFC options");
  }
});

test("computeSusScore follows Brooke (1996) formula across all edge cases", () => {
  assert.equal(SUS_ITEMS.length, 10);

  // Perfect score: odd=5, even=1 -> (4*5 + 4*5) * 2.5 = 100
  const perfect: Record<number, number> = {
    1: 5, 2: 1, 3: 5, 4: 1, 5: 5, 6: 1, 7: 5, 8: 1, 9: 5, 10: 1,
  };
  assert.equal(computeSusScore(perfect), 100);

  // Worst score: odd=1, even=5 -> 0
  const worst: Record<number, number> = {
    1: 1, 2: 5, 3: 1, 4: 5, 5: 1, 6: 5, 7: 1, 8: 5, 9: 1, 10: 5,
  };
  assert.equal(computeSusScore(worst), 0);

  // All neutral (3) -> 20 * 2.5 = 50
  const neutral: Record<number, number> = {
    1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 3, 8: 3, 9: 3, 10: 3,
  };
  assert.equal(computeSusScore(neutral), 50);

  // Incomplete SUS returns null
  const incomplete: Record<number, number | null> = { ...neutral, 7: null };
  assert.equal(computeSusScore(incomplete), null);
});

test("computeSessionMetrics, aggregateStudySessions, and JSON/CSV exports compute exact verified statistics", () => {
  const trials = buildTask1Trials("P01");
  const t1: Record<string, Task1Response> = {};
  trials.forEach((trial, idx) => {
    const pickCorrect = idx < 15; // 15/18 = 83.3%
    const wrongOpt = trial.options.find((o) => o.id !== trial.sign.id)!;
    t1[trial.sign.id] = {
      signId: trial.sign.id,
      openEndedText: trial.sign.english,
      selectedOptionId: pickCorrect ? trial.sign.id : wrongOpt.id,
      clarityRating: idx % 2 === 0 ? 5 : 4, // mean = 4.5
      errorTags: pickCorrect ? [] : ["handshape", "missing_nmm"],
      replayCount: 1,
    };
  });

  const t2: Record<string, Task2Response> = {};
  TASK2_SENTENCES.forEach((s, idx) => {
    t2[s.id] = {
      sentenceId: s.id,
      openEndedGist: s.english,
      gistVerdict: idx < 3 ? "full" : idx === 3 ? "partial" : "none", // (3 + 0.5) / 5 = 70%
      naturalnessRating: 4,
      replayCount: 1,
      notes: "",
    };
  });

  const t3: Task3Response = {
    scenarioId: "clinic_counter",
    usefulnessRating: 5,
    susRatings: { 1: 5, 2: 2, 3: 4, 4: 2, 5: 5, 6: 2, 7: 4, 8: 1, 9: 4, 10: 2 }, // (4+3+3+3+4+3+3+4+3+3)*2.5 = 82.5
    qualitativeFeedback: "Clear arm trajectories; facial expressions helpful.",
  };

  const summary = computeSessionMetrics(trials, t1, t2, t3);
  assert.equal(summary.task1Answered, 18);
  assert.equal(summary.task1Correct4AFC, 15);
  assert.equal(summary.task1AccuracyPct, 83.3);
  assert.equal(summary.task1MeanClarity, 4.5);
  assert.equal(summary.task1ErrorTagCounts.handshape, 3);
  assert.equal(summary.task1ErrorTagCounts.missing_nmm, 3);
  assert.equal(summary.task2Answered, 5);
  assert.equal(summary.task2GistScorePct, 70);
  assert.equal(summary.task2MeanNaturalness, 4);
  assert.equal(summary.usefulnessRating, 5);
  assert.equal(summary.susScore, 82.5);

  const session: CompletedStudySession = {
    sessionId: "S-001",
    recordedAt: "2026-11-22T10:00:00.000Z",
    protocolVersion: "NCDTE-2026-v1.0",
    participant: {
      participantId: "P01",
      proficiency: "native_deaf_isl",
      interpreterPresent: true,
      consentAcknowledged: true,
      sessionNotes: "",
    },
    task1: trials.map((tr) => ({
      ...t1[tr.sign.id],
      correctSignId: tr.sign.id,
      isCorrect4AFC: t1[tr.sign.id].selectedOptionId === tr.sign.id,
    })),
    task2: TASK2_SENTENCES.map((s) => t2[s.id]),
    task3: t3,
    summary,
  };

  const agg = aggregateStudySessions([session]);
  assert.equal(agg.sessionCount, 1);
  assert.equal(agg.realDeafSessionCount, 1);
  assert.equal(agg.meanTask1AccuracyPct, 83.3);
  assert.equal(agg.meanSusScore, 82.5);

  const jsonOut = JSON.parse(exportSessionsToJson([session]));
  assert.equal(jsonOut.aggregate.sessionCount, 1);
  assert.equal(jsonOut.sessions.length, 1);

  const csvOut = exportSessionsToCsv([session]);
  const lines = csvOut.split("\n");
  assert.equal(lines.length, 2);
  assert.equal(lines[1].includes("P01,native_deaf_isl,true,18,15,83.3,4.5"), true);
  assert.equal(lines[1].includes(",5,82.5,"), true);
});
