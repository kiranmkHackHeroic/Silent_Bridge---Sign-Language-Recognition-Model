/**
 * Pure domain logic for the Pre-Registered Deaf ISL User Study (N = 8–12 protocol).
 *
 * Implements the exact three-task evaluation protocol specified in Section 5.2 of the
 * NCDTE conference paper:
 *   - Task 1: Blind Avatar Understandability (18 randomized isolated clips without text,
 *             open-ended identification, 4-AFC comprehension, 1–5 clarity, error-type tags)
 *   - Task 2: Continuous Sentence Comprehension (5 Kannada-to-ISL 3–5 sign sentences,
 *             gist verdict & 1–5 transition naturalness)
 *   - Task 3: Real-World Counter-Dialogue Usefulness (1–5) & 10-item Brooke (1996) SUS (0–100)
 *
 * Academic integrity invariant:
 *   This module NEVER seeds or fabricates participant responses. With 0 recorded sessions,
 *   all aggregate metrics remain `null` and `sessionCount === 0`.
 */

export type ProficiencyLevel =
  | "native_deaf_isl"
  | "fluent_isl"
  | "certified_interpreter"
  | "pilot_demo";

export type ErrorTag =
  | "handshape"
  | "orientation"
  | "location"
  | "missing_nmm"
  | "speed";

export type GistScore = "full" | "partial" | "none";

export interface StudySignSpec {
  id: string;
  english: string;
  kannada: string;
  gloss: string;
  domain: string;
}

export interface StudySentenceSpec {
  id: string;
  domain: string;
  kannada: string;
  english: string;
  signIds: string[];
  glosses: string[];
}

export interface Task1Trial {
  trialNumber: number; // 1..18
  sign: StudySignSpec;
  options: StudySignSpec[]; // 4-AFC options (1 true + 3 distractors), shuffled
}

export interface Task1Response {
  signId: string;
  openEndedText: string;
  selectedOptionId: string | null;
  clarityRating: number | null; // 1..5
  errorTags: ErrorTag[];
  replayCount: number;
}

export interface Task2Response {
  sentenceId: string;
  openEndedGist: string;
  gistVerdict: GistScore | null;
  naturalnessRating: number | null; // 1..5
  replayCount: number;
  notes: string;
}

export interface Task3Response {
  scenarioId: string;
  usefulnessRating: number | null; // 1..5
  susRatings: Record<number, number | null>; // keys 1..10, values 1..5
  qualitativeFeedback: string;
}

export interface StudyParticipantMeta {
  participantId: string;
  proficiency: ProficiencyLevel;
  interpreterPresent: boolean;
  consentAcknowledged: boolean;
  sessionNotes: string;
}

export interface CompletedStudySession {
  sessionId: string;
  recordedAt: string;
  protocolVersion: string;
  participant: StudyParticipantMeta;
  task1: Array<Task1Response & { correctSignId: string; isCorrect4AFC: boolean }>;
  task2: Task2Response[];
  task3: Task3Response;
  summary: SessionMetrics;
}

export interface SessionMetrics {
  task1Answered: number;
  task1Correct4AFC: number;
  task1AccuracyPct: number | null;
  task1MeanClarity: number | null;
  task1ErrorTagCounts: Record<ErrorTag, number>;
  task2Answered: number;
  task2FullGistCount: number;
  task2PartialGistCount: number;
  task2GistScorePct: number | null; // full = 1.0, partial = 0.5, none = 0.0
  task2MeanNaturalness: number | null;
  usefulnessRating: number | null;
  susScore: number | null; // 0..100
}

export interface AggregateStudyMetrics {
  sessionCount: number;
  realDeafSessionCount: number; // excludes pilot_demo
  meanTask1AccuracyPct: number | null;
  meanTask1Clarity: number | null;
  meanTask2GistPct: number | null;
  meanTask2Naturalness: number | null;
  meanUsefulness: number | null;
  meanSusScore: number | null;
  errorTagTotals: Record<ErrorTag, number>;
  totalClipsEvaluated: number;
  totalSentencesEvaluated: number;
}

export const PROTOCOL_VERSION = "NCDTE-2026-v1.0";
export const STUDY_STORAGE_KEY = "silentbridge.deaf_isl_study_sessions.v1";

export const PROFICIENCY_LABELS: Record<ProficiencyLevel, string> = {
  native_deaf_isl: "Native Deaf ISL Signer",
  fluent_isl: "Fluent Deaf / HoH ISL User",
  certified_interpreter: "Certified ISL Interpreter",
  pilot_demo: "Pilot / Evaluator Walkthrough (Excluded from Deaf N)",
};

export const ERROR_TAG_LABELS: Record<ErrorTag, string> = {
  handshape: "Handshape",
  orientation: "Palm Orientation",
  location: "Signing Location",
  missing_nmm: "Missing NMM / Face",
  speed: "Speed / Timing",
};

export const ALL_ERROR_TAGS: ErrorTag[] = [
  "handshape",
  "orientation",
  "location",
  "missing_nmm",
  "speed",
];

/**
 * 18 verified dataset-derived ("captured") ISL clips stratified across 6 public-service
 * and daily-life semantic domains (3 signs per domain).
 */
export const TASK1_SIGN_BANK: StudySignSpec[] = [
  // Greetings & Courtesy
  { id: "namaskara", english: "Hello / Namaste", kannada: "ನಮಸ್ಕಾರ", gloss: "HELLO", domain: "Greetings" },
  { id: "thank_you", english: "Thank you", kannada: "ಧನ್ಯವಾದಗಳು", gloss: "THANK-YOU", domain: "Greetings" },
  { id: "help", english: "Help", kannada: "ಸಹಾಯ", gloss: "HELP", domain: "Greetings" },
  // Healthcare & Clinical
  { id: "doctor", english: "Doctor", kannada: "ವೈದ್ಯ", gloss: "DOCTOR", domain: "Healthcare" },
  { id: "hospital", english: "Hospital", kannada: "ಆಸ್ಪತ್ರೆ", gloss: "HOSPITAL", domain: "Healthcare" },
  { id: "medicine", english: "Medicine", kannada: "ಔಷಧಿ", gloss: "MEDICINE", domain: "Healthcare" },
  // Public Services & Travel
  { id: "bank", english: "Bank", kannada: "ಬ್ಯಾಂಕ್", gloss: "BANK", domain: "Public Counter" },
  { id: "police", english: "Police", kannada: "ಪೊಲೀಸ್", gloss: "POLICE", domain: "Public Counter" },
  { id: "railway_station", english: "Railway station", kannada: "ರೈಲು ನಿಲ್ದಾಣ", gloss: "TRAIN-STATION", domain: "Public Counter" },
  // Daily Actions
  { id: "eat", english: "Eat", kannada: "ತಿನ್ನು", gloss: "EAT", domain: "Daily Actions" },
  { id: "drink", english: "Drink", kannada: "ಕುಡಿ", gloss: "DRINK", domain: "Daily Actions" },
  { id: "sleep", english: "Sleep", kannada: "ನಿದ್ರೆ", gloss: "SLEEP", domain: "Daily Actions" },
  // People & Family
  { id: "mother", english: "Mother", kannada: "ತಾಯಿ", gloss: "MOTHER", domain: "People & Family" },
  { id: "teacher", english: "Teacher", kannada: "ಶಿಕ್ಷಕ", gloss: "TEACHER", domain: "People & Family" },
  { id: "friend", english: "Friend", kannada: "ಸ್ನೇಹಿತ", gloss: "FRIEND", domain: "People & Family" },
  // Time & States
  { id: "tomorrow", english: "Tomorrow", kannada: "ನಾಳೆ", gloss: "TOMORROW", domain: "Time & States" },
  { id: "happy", english: "Happy", kannada: "ಖುಷಿ", gloss: "HAPPY", domain: "Time & States" },
  { id: "sick", english: "Sick / unwell", kannada: "ಅನಾರೋಗ್ಯ", gloss: "SICK", domain: "Time & States" },
];

/**
 * Additional verified "captured" signs used exclusively as plausible 4-AFC distractors
 * so choices remain balanced across domains.
 */
export const TASK1_DISTRACTOR_POOL: StudySignSpec[] = [
  { id: "sorry", english: "Sorry", kannada: "ಕ್ಷಮಿಸಿ", gloss: "SORRY", domain: "Greetings" },
  { id: "welcome", english: "Welcome", kannada: "ಸುಸ್ವಾಗತ", gloss: "WELCOME", domain: "Greetings" },
  { id: "patient", english: "Patient", kannada: "ರೋಗಿ", gloss: "PATIENT", domain: "Healthcare" },
  { id: "healthy", english: "Healthy", kannada: "ಆರೋಗ್ಯಕರ", gloss: "HEALTHY", domain: "Healthcare" },
  { id: "office", english: "Office", kannada: "ಕಚೇರಿ", gloss: "OFFICE", domain: "Public Counter" },
  { id: "money", english: "Money", kannada: "ಹಣ", gloss: "MONEY", domain: "Public Counter" },
  { id: "school", english: "School", kannada: "ಶಾಲೆ", gloss: "SCHOOL", domain: "Public Counter" },
  { id: "study", english: "Study", kannada: "ಓದು", gloss: "STUDY", domain: "Daily Actions" },
  { id: "work", english: "Work", kannada: "ಕೆಲಸ", gloss: "WORK", domain: "Daily Actions" },
  { id: "write", english: "Write", kannada: "ಬರೆ", gloss: "WRITE", domain: "Daily Actions" },
  { id: "father", english: "Father", kannada: "ತಂದೆ", gloss: "FATHER", domain: "People & Family" },
  { id: "student", english: "Student", kannada: "ವಿದ್ಯಾರ್ಥಿ", gloss: "STUDENT", domain: "People & Family" },
  { id: "today", english: "Today", kannada: "ಇಂದು", gloss: "TODAY", domain: "Time & States" },
  { id: "yesterday", english: "Yesterday", kannada: "ನಿನ್ನೆ", gloss: "YESTERDAY", domain: "Time & States" },
  { id: "angry", english: "Angry", kannada: "ಕೋಪ", gloss: "ANGRY", domain: "Time & States" },
  { id: "good", english: "Good", kannada: "ಒಳ್ಳೆಯದು", gloss: "GOOD", domain: "Time & States" },
];

/**
 * 5 continuous Kannada-to-ISL sentences (3–5 signs each).
 * Every signId is verified to exist as a real `"captured"` clip in animation_mapping.json.
 */
export const TASK2_SENTENCES: StudySentenceSpec[] = [
  {
    id: "S1",
    domain: "Reception / Help Desk",
    kannada: "ನಮಸ್ಕಾರ, ನನಗೆ ಸಹಾಯ ಬೇಕು.",
    english: "Hello, I need help.",
    signIds: ["namaskara", "i_me", "help"],
    glosses: ["HELLO", "I/ME", "HELP"],
  },
  {
    id: "S2",
    domain: "Hospital Counter",
    kannada: "ಇಂದು ನಾನು ಆಸ್ಪತ್ರೆಗೆ ವೈದ್ಯರ ಬಳಿ ಹೋಗುತ್ತೇನೆ.",
    english: "Today I am going to see the doctor at the hospital.",
    signIds: ["today", "i_me", "hospital", "doctor"],
    glosses: ["TODAY", "I/ME", "HOSPITAL", "DOCTOR"],
  },
  {
    id: "S3",
    domain: "Pharmacy / Triage",
    kannada: "ಬೆಳಿಗ್ಗೆ ಅನಾರೋಗ್ಯ ರೋಗಿಗೆ ಔಷಧಿ ಬೇಕು.",
    english: "In the morning, the unwell patient needs medicine.",
    signIds: ["morning", "patient", "sick", "medicine"],
    glosses: ["MORNING", "PATIENT", "SICK", "MEDICINE"],
  },
  {
    id: "S4",
    domain: "Bank / Public Office",
    kannada: "ನಾಳೆ ಸ್ನೇಹಿತ ಬ್ಯಾಂಕ್ ಕಚೇರಿಗೆ ಬರುತ್ತಾರೆ.",
    english: "Tomorrow a friend is visiting the bank office.",
    signIds: ["tomorrow", "friend", "bank", "office"],
    glosses: ["TOMORROW", "FRIEND", "BANK", "OFFICE"],
  },
  {
    id: "S5",
    domain: "Classroom / School",
    kannada: "ಶುಭೋದಯ, ಶಿಕ್ಷಕ ಮತ್ತು ವಿದ್ಯಾರ್ಥಿ ಶಾಲೆಯಲ್ಲಿ ಪುಸ್ತಕ ಓದುತ್ತಾರೆ.",
    english: "Good morning, the teacher and student read a book at school.",
    signIds: ["good_morning", "teacher", "student", "school", "book"],
    glosses: ["GOOD-MORNING", "TEACHER", "STUDENT", "SCHOOL", "BOOK"],
  },
];

export const ROLEPLAY_SCENARIOS = [
  {
    id: "clinic_counter",
    title: "Hospital Outpatient Counter",
    prompt:
      "Sign a brief symptom or request on Live Recognition (ISL → Kannada), then let the counter clerk type or speak a Kannada reply (e.g., morning medicine / doctor room) and watch the 3D avatar.",
  },
  {
    id: "bank_counter",
    title: "Bank / Civic Service Desk",
    prompt:
      "Exchange a greeting and service request (e.g., help, bank, office, tomorrow) across both directions: Deaf user signs ISL → Kannada voice, clerk replies in Kannada → 3D ISL avatar.",
  },
  {
    id: "school_desk",
    title: "School / College Classroom Desk",
    prompt:
      "Practice a teacher–student check-in (good morning, book, study, question) using the live recognizer and the Kannada-to-Sign 3D avatar.",
  },
] as const;

/**
 * Standard 10-item Brooke (1996) System Usability Scale (SUS) questionnaire.
 * Odd items (1, 3, 5, 7, 9) are positively worded; even items (2, 4, 6, 8, 10) are negatively worded.
 */
export const SUS_ITEMS: ReadonlyArray<{ id: number; polarity: "positive" | "negative"; text: string }> = [
  { id: 1, polarity: "positive", text: "I think that I would like to use Silent Bridge frequently at public counters." },
  { id: 2, polarity: "negative", text: "I found the system unnecessarily complex." },
  { id: 3, polarity: "positive", text: "I thought the system was easy to use." },
  { id: 4, polarity: "negative", text: "I think that I would need technical support to use this system." },
  { id: 5, polarity: "positive", text: "I found the two-way translation and 3D avatar features well integrated." },
  { id: 6, polarity: "negative", text: "I thought there was too much inconsistency in the system." },
  { id: 7, polarity: "positive", text: "I imagine that most Deaf ISL users would learn to use this system quickly." },
  { id: 8, polarity: "negative", text: "I found the system very cumbersome to use." },
  { id: 9, polarity: "positive", text: "I felt very confident using the system during the counter dialogue." },
  { id: 10, polarity: "negative", text: "I needed to learn a lot of things before I could get going with this system." },
];

/** Deterministic 32-bit FNV-1a hash + Mulberry32 PRNG for reproducible trial ordering per participant. */
function hashSeed(seedText: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seedText: string): () => number {
  let state = hashSeed(seedText) || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generates the 18 randomized blind avatar trials for Task 1.
 * Each trial contains 1 target sign + 3 unique distractors (preferring at least 1 same-domain
 * distractor so 4-AFC comprehension is genuinely discriminative), deterministically ordered
 * from `seedKey` (e.g. participant ID).
 */
export function buildTask1Trials(seedKey: string): Task1Trial[] {
  const rng = createRng(seedKey.trim() || "P01");
  const orderedSigns = deterministicShuffle(TASK1_SIGN_BANK, rng);
  const fullPool = [...TASK1_SIGN_BANK, ...TASK1_DISTRACTOR_POOL];

  return orderedSigns.map((sign, idx) => {
    const sameDomain = deterministicShuffle(
      fullPool.filter((c) => c.id !== sign.id && c.domain === sign.domain),
      rng
    );
    const otherDomain = deterministicShuffle(
      fullPool.filter((c) => c.id !== sign.id && c.domain !== sign.domain),
      rng
    );

    const distractors: StudySignSpec[] = [];
    const seen = new Set<string>([sign.id]);
    for (const cand of [...sameDomain.slice(0, 2), ...otherDomain]) {
      if (distractors.length >= 3) break;
      if (!seen.has(cand.id)) {
        seen.add(cand.id);
        distractors.push(cand);
      }
    }

    const options = deterministicShuffle([sign, ...distractors], rng);
    return {
      trialNumber: idx + 1,
      sign,
      options,
    };
  });
}

/**
 * Computes standard Brooke (1996) System Usability Scale score (0–100).
 * Returns `null` unless all 10 items are answered with integers in [1, 5].
 */
export function computeSusScore(ratings: Record<number, number | null | undefined>): number | null {
  let sum = 0;
  for (const item of SUS_ITEMS) {
    const val = ratings[item.id];
    if (typeof val !== "number" || !Number.isFinite(val) || val < 1 || val > 5) {
      return null;
    }
    sum += item.polarity === "positive" ? val - 1 : 5 - val;
  }
  return Math.round(sum * 2.5 * 10) / 10;
}

export function emptyErrorTagCounts(): Record<ErrorTag, number> {
  return {
    handshape: 0,
    orientation: 0,
    location: 0,
    missing_nmm: 0,
    speed: 0,
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function computeSessionMetrics(
  trials: readonly Task1Trial[],
  task1Responses: Record<string, Task1Response>,
  task2Responses: Record<string, Task2Response>,
  task3: Task3Response
): SessionMetrics {
  const tagCounts = emptyErrorTagCounts();
  let t1Answered = 0;
  let t1Correct = 0;
  const clarityValues: number[] = [];

  for (const trial of trials) {
    const r = task1Responses[trial.sign.id];
    if (!r) continue;
    if (r.selectedOptionId) {
      t1Answered++;
      if (r.selectedOptionId === trial.sign.id) t1Correct++;
    }
    if (typeof r.clarityRating === "number" && r.clarityRating >= 1 && r.clarityRating <= 5) {
      clarityValues.push(r.clarityRating);
    }
    for (const tag of r.errorTags) {
      if (tag in tagCounts) tagCounts[tag] += 1;
    }
  }

  let t2Answered = 0;
  let t2Full = 0;
  let t2Partial = 0;
  let t2Points = 0;
  const natValues: number[] = [];

  for (const s of TASK2_SENTENCES) {
    const r = task2Responses[s.id];
    if (!r) continue;
    if (r.gistVerdict) {
      t2Answered++;
      if (r.gistVerdict === "full") {
        t2Full++;
        t2Points += 1;
      } else if (r.gistVerdict === "partial") {
        t2Partial++;
        t2Points += 0.5;
      }
    }
    if (typeof r.naturalnessRating === "number" && r.naturalnessRating >= 1 && r.naturalnessRating <= 5) {
      natValues.push(r.naturalnessRating);
    }
  }

  return {
    task1Answered: t1Answered,
    task1Correct4AFC: t1Correct,
    task1AccuracyPct: t1Answered > 0 ? round1((t1Correct / t1Answered) * 100) : null,
    task1MeanClarity:
      clarityValues.length > 0
        ? round1(clarityValues.reduce((a, b) => a + b, 0) / clarityValues.length)
        : null,
    task1ErrorTagCounts: tagCounts,
    task2Answered: t2Answered,
    task2FullGistCount: t2Full,
    task2PartialGistCount: t2Partial,
    task2GistScorePct: t2Answered > 0 ? round1((t2Points / t2Answered) * 100) : null,
    task2MeanNaturalness:
      natValues.length > 0 ? round1(natValues.reduce((a, b) => a + b, 0) / natValues.length) : null,
    usefulnessRating:
      typeof task3.usefulnessRating === "number" && task3.usefulnessRating >= 1 && task3.usefulnessRating <= 5
        ? task3.usefulnessRating
        : null,
    susScore: computeSusScore(task3.susRatings),
  };
}

/**
 * Aggregates recorded sessions strictly from real persisted submissions.
 * When `sessions.length === 0`, returns `sessionCount: 0` and `null` for every score.
 */
export function aggregateStudySessions(sessions: readonly CompletedStudySession[]): AggregateStudyMetrics {
  const errorTagTotals = emptyErrorTagCounts();
  if (sessions.length === 0) {
    return {
      sessionCount: 0,
      realDeafSessionCount: 0,
      meanTask1AccuracyPct: null,
      meanTask1Clarity: null,
      meanTask2GistPct: null,
      meanTask2Naturalness: null,
      meanUsefulness: null,
      meanSusScore: null,
      errorTagTotals,
      totalClipsEvaluated: 0,
      totalSentencesEvaluated: 0,
    };
  }

  const avg = (nums: Array<number | null>): number | null => {
    const valid = nums.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
    return valid.length > 0 ? round1(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
  };

  let realDeafSessionCount = 0;
  let totalClipsEvaluated = 0;
  let totalSentencesEvaluated = 0;

  for (const s of sessions) {
    if (s.participant.proficiency !== "pilot_demo") {
      realDeafSessionCount++;
    }
    totalClipsEvaluated += s.summary.task1Answered;
    totalSentencesEvaluated += s.summary.task2Answered;
    for (const tag of ALL_ERROR_TAGS) {
      errorTagTotals[tag] += s.summary.task1ErrorTagCounts[tag] || 0;
    }
  }

  return {
    sessionCount: sessions.length,
    realDeafSessionCount,
    meanTask1AccuracyPct: avg(sessions.map((s) => s.summary.task1AccuracyPct)),
    meanTask1Clarity: avg(sessions.map((s) => s.summary.task1MeanClarity)),
    meanTask2GistPct: avg(sessions.map((s) => s.summary.task2GistScorePct)),
    meanTask2Naturalness: avg(sessions.map((s) => s.summary.task2MeanNaturalness)),
    meanUsefulness: avg(sessions.map((s) => s.summary.usefulnessRating)),
    meanSusScore: avg(sessions.map((s) => s.summary.susScore)),
    errorTagTotals,
    totalClipsEvaluated,
    totalSentencesEvaluated,
  };
}

/** Anonymized JSON export ready for paper supplementary reporting (no raw PII). */
export function exportSessionsToJson(sessions: readonly CompletedStudySession[]): string {
  const aggregate = aggregateStudySessions(sessions);
  return JSON.stringify(
    {
      protocolVersion: PROTOCOL_VERSION,
      exportedAt: new Date().toISOString(),
      integrityNote:
        "Contains strictly locally recorded study sessions. Zero synthetic or fabricated participant scores.",
      aggregate,
      sessions,
    },
    null,
    2
  );
}

function csvCell(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Flat session-level CSV export for statistical analysis (SPSS / R / Python pandas). */
export function exportSessionsToCsv(sessions: readonly CompletedStudySession[]): string {
  const headers = [
    "session_id",
    "recorded_at",
    "participant_id",
    "proficiency",
    "interpreter_present",
    "task1_answered",
    "task1_correct_4afc",
    "task1_accuracy_pct",
    "task1_mean_clarity",
    "err_handshape",
    "err_orientation",
    "err_location",
    "err_missing_nmm",
    "err_speed",
    "task2_answered",
    "task2_full_gist",
    "task2_partial_gist",
    "task2_gist_pct",
    "task2_mean_naturalness",
    "task3_usefulness_1_5",
    "task3_sus_0_100",
    "qualitative_feedback",
  ];

  const rows = sessions.map((s) =>
    [
      s.sessionId,
      s.recordedAt,
      s.participant.participantId,
      s.participant.proficiency,
      s.participant.interpreterPresent,
      s.summary.task1Answered,
      s.summary.task1Correct4AFC,
      s.summary.task1AccuracyPct,
      s.summary.task1MeanClarity,
      s.summary.task1ErrorTagCounts.handshape,
      s.summary.task1ErrorTagCounts.orientation,
      s.summary.task1ErrorTagCounts.location,
      s.summary.task1ErrorTagCounts.missing_nmm,
      s.summary.task1ErrorTagCounts.speed,
      s.summary.task2Answered,
      s.summary.task2FullGistCount,
      s.summary.task2PartialGistCount,
      s.summary.task2GistScorePct,
      s.summary.task2MeanNaturalness,
      s.summary.usefulnessRating,
      s.summary.susScore,
      s.task3.qualitativeFeedback,
    ]
      .map(csvCell)
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function loadStoredSessions(): CompletedStudySession[] {
  try {
    const raw = localStorage.getItem(STUDY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CompletedStudySession[]) : [];
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions: readonly CompletedStudySession[]): void {
  try {
    localStorage.setItem(STUDY_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* ignore storage quota errors */
  }
}
