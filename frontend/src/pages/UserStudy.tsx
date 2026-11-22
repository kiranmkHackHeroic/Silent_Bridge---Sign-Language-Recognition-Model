import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AvatarView, type AvatarHandle, type PlaybackState } from "../avatar/AvatarView";
import { Btn, Card, Empty, Notice, Spinner, Stat } from "../components/ui";
import { api } from "../services/api";
import type { AnimationClip } from "../services/types";
import {
  ALL_ERROR_TAGS,
  ERROR_TAG_LABELS,
  PROFICIENCY_LABELS,
  PROTOCOL_VERSION,
  ROLEPLAY_SCENARIOS,
  SUS_ITEMS,
  TASK2_SENTENCES,
  aggregateStudySessions,
  buildTask1Trials,
  computeSessionMetrics,
  computeSusScore,
  exportSessionsToCsv,
  exportSessionsToJson,
  loadStoredSessions,
  saveStoredSessions,
  type CompletedStudySession,
  type ErrorTag,
  type GistScore,
  type ProficiencyLevel,
  type StudyParticipantMeta,
  type Task1Response,
  type Task2Response,
  type Task3Response,
} from "../services/userStudy";

type StudyStep = "setup" | "task1" | "task2" | "task3" | "results";

const SPEEDS = [0.5, 0.75, 1, 1.25] as const;
const LIKERT_5 = [1, 2, 3, 4, 5] as const;

function nextParticipantId(existing: readonly CompletedStudySession[]): string {
  let maxNum = 0;
  for (const s of existing) {
    const m = /^P(\d+)$/i.exec(s.participant.participantId.trim());
    if (m) maxNum = Math.max(maxNum, Number(m[1]));
  }
  return `P${String(maxNum + 1).padStart(2, "0")}`;
}

function emptyTask1Response(signId: string): Task1Response {
  return {
    signId,
    openEndedText: "",
    selectedOptionId: null,
    clarityRating: null,
    errorTags: [],
    replayCount: 0,
  };
}

function emptyTask2Response(sentenceId: string): Task2Response {
  return {
    sentenceId,
    openEndedGist: "",
    gistVerdict: null,
    naturalnessRating: null,
    replayCount: 0,
    notes: "",
  };
}

function emptyTask3Response(): Task3Response {
  return {
    scenarioId: ROLEPLAY_SCENARIOS[0].id,
    usefulnessRating: null,
    susRatings: {},
    qualitativeFeedback: "",
  };
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function UserStudy() {
  const [sessions, setSessions] = useState<CompletedStudySession[]>(() => loadStoredSessions());
  const [step, setStep] = useState<StudyStep>("setup");

  // Participant session setup
  const [participant, setParticipant] = useState<StudyParticipantMeta>(() => ({
    participantId: nextParticipantId(loadStoredSessions()),
    proficiency: "native_deaf_isl",
    interpreterPresent: true,
    consentAcknowledged: false,
    sessionNotes: "",
  }));

  // Active trial / sentence cursors
  const [t1Index, setT1Index] = useState(0);
  const [t2Index, setT2Index] = useState(0);
  const [revealSentenceKey, setRevealSentenceKey] = useState(false);

  // Recorded responses for the current active session
  const [t1Responses, setT1Responses] = useState<Record<string, Task1Response>>({});
  const [t2Responses, setT2Responses] = useState<Record<string, Task2Response>>({});
  const [t3Response, setT3Response] = useState<Task3Response>(emptyTask3Response);

  // Avatar playback state (shared when viewing Task 1 or Task 2)
  const avatarRef = useRef<AvatarHandle | null>(null);
  const clipCacheRef = useRef<Map<string, AnimationClip>>(new Map());
  const [speed, setSpeed] = useState<number>(1);
  const [playback, setPlayback] = useState<PlaybackState>({
    playing: false,
    paused: false,
    index: -1,
    progress: 0,
  });
  const [clipLoading, setClipLoading] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);

  // UI feedback states (never window.alert / window.confirm)
  const [statusMessage, setStatusMessage] = useState<{ tone: "ok" | "warn" | "info"; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Deterministic 18 blind trials seeded by participantId
  const trials = useMemo(() => buildTask1Trials(participant.participantId), [participant.participantId]);
  const currentTrial = trials[t1Index] ?? trials[0];
  const currentSentence = TASK2_SENTENCES[t2Index] ?? TASK2_SENTENCES[0];

  const currentT1 = t1Responses[currentTrial.sign.id] ?? emptyTask1Response(currentTrial.sign.id);
  const currentT2 = t2Responses[currentSentence.id] ?? emptyTask2Response(currentSentence.id);

  const liveMetrics = useMemo(
    () => computeSessionMetrics(trials, t1Responses, t2Responses, t3Response),
    [trials, t1Responses, t2Responses, t3Response]
  );

  const aggregate = useMemo(() => aggregateStudySessions(sessions), [sessions]);

  const fetchClip = useCallback(async (signId: string): Promise<AnimationClip> => {
    const cached = clipCacheRef.current.get(signId);
    if (cached) return cached;
    const clip = await api.animation(signId);
    clipCacheRef.current.set(signId, clip);
    return clip;
  }, []);

  const playBlindTrialClip = useCallback(
    async (signId: string, countReplay: boolean) => {
      setClipLoading(true);
      setClipError(null);
      try {
        const clip = await fetchClip(signId);
        avatarRef.current?.play([clip]);
        if (countReplay) {
          setT1Responses((prev) => {
            const existing = prev[signId] ?? emptyTask1Response(signId);
            return { ...prev, [signId]: { ...existing, replayCount: existing.replayCount + 1 } };
          });
        }
      } catch (err) {
        setClipError(
          err instanceof Error ? err.message : "Could not load 3D avatar clip from backend."
        );
      } finally {
        setClipLoading(false);
      }
    },
    [fetchClip]
  );

  const playSentenceClips = useCallback(
    async (sentenceId: string, signIds: readonly string[], countReplay: boolean) => {
      setClipLoading(true);
      setClipError(null);
      try {
        const clips = await Promise.all(signIds.map((id) => fetchClip(id)));
        avatarRef.current?.play(clips);
        if (countReplay) {
          setT2Responses((prev) => {
            const existing = prev[sentenceId] ?? emptyTask2Response(sentenceId);
            return { ...prev, [sentenceId]: { ...existing, replayCount: existing.replayCount + 1 } };
          });
        }
      } catch (err) {
        setClipError(
          err instanceof Error ? err.message : "Could not load continuous sentence avatar clips."
        );
      } finally {
        setClipLoading(false);
      }
    },
    [fetchClip]
  );

  // Stop playback cleanly when switching trials or steps
  useEffect(() => {
    setClipError(null);
    if (step !== "task1" && step !== "task2") {
      avatarRef.current?.stop();
    }
  }, [step]);

  useEffect(() => {
    setRevealSentenceKey(false);
    setClipError(null);
  }, [t2Index]);

  useEffect(() => {
    setClipError(null);
  }, [t1Index]);

  const updateT1 = (patch: Partial<Task1Response>) => {
    const id = currentTrial.sign.id;
    setT1Responses((prev) => {
      const base = prev[id] ?? emptyTask1Response(id);
      return { ...prev, [id]: { ...base, ...patch } };
    });
  };

  const toggleErrorTag = (tag: ErrorTag) => {
    const has = currentT1.errorTags.includes(tag);
    updateT1({
      errorTags: has ? currentT1.errorTags.filter((t) => t !== tag) : [...currentT1.errorTags, tag],
    });
  };

  const updateT2 = (patch: Partial<Task2Response>) => {
    const id = currentSentence.id;
    setT2Responses((prev) => {
      const base = prev[id] ?? emptyTask2Response(id);
      return { ...prev, [id]: { ...base, ...patch } };
    });
  };

  const setSusItem = (itemId: number, value: number) => {
    setT3Response((prev) => ({
      ...prev,
      susRatings: { ...prev.susRatings, [itemId]: value },
    }));
  };

  const handleSaveSession = () => {
    const pid = participant.participantId.trim();
    if (!pid) {
      setStatusMessage({ tone: "warn", text: "Enter an anonymized Participant ID (e.g., P01) in Setup before saving." });
      setStep("setup");
      return;
    }
    if (!participant.consentAcknowledged) {
      setStatusMessage({
        tone: "warn",
        text: "Confirm informed consent & de-identification in Setup before saving this session.",
      });
      setStep("setup");
      return;
    }

    const summary = computeSessionMetrics(trials, t1Responses, t2Responses, t3Response);
    if (summary.task1Answered === 0 && summary.task2Answered === 0 && summary.susScore === null) {
      setStatusMessage({
        tone: "warn",
        text: "Record at least one evaluation response before saving a session.",
      });
      return;
    }

    const completed: CompletedStudySession = {
      sessionId: `SB-${Date.now().toString(36).toUpperCase()}`,
      recordedAt: new Date().toISOString(),
      protocolVersion: PROTOCOL_VERSION,
      participant: { ...participant, participantId: pid },
      task1: trials.map((tr) => {
        const r = t1Responses[tr.sign.id] ?? emptyTask1Response(tr.sign.id);
        return {
          ...r,
          correctSignId: tr.sign.id,
          isCorrect4AFC: r.selectedOptionId === tr.sign.id,
        };
      }),
      task2: TASK2_SENTENCES.map((s) => t2Responses[s.id] ?? emptyTask2Response(s.id)),
      task3: { ...t3Response, susRatings: { ...t3Response.susRatings } },
      summary,
    };

    const updated = [completed, ...sessions];
    setSessions(updated);
    saveStoredSessions(updated);

    // Reset active form cleanly for the next participant
    setParticipant({
      participantId: nextParticipantId(updated),
      proficiency: "native_deaf_isl",
      interpreterPresent: true,
      consentAcknowledged: false,
      sessionNotes: "",
    });
    setT1Responses({});
    setT2Responses({});
    setT3Response(emptyTask3Response());
    setT1Index(0);
    setT2Index(0);
    setStatusMessage({
      tone: "ok",
      text: `Saved anonymized session ${completed.sessionId} (${completed.participant.participantId}). Ready to export JSON/CSV.`,
    });
    setStep("results");
  };

  const handleClearAllSessions = () => {
    setSessions([]);
    saveStoredSessions([]);
    setConfirmClear(false);
    setParticipant((prev) => ({ ...prev, participantId: "P01" }));
    setStatusMessage({
      tone: "info",
      text: "Cleared local study sessions. Stored count is now 0 (zero fabricated scores).",
    });
  };

  const susAnsweredCount = SUS_ITEMS.filter((i) => typeof t3Response.susRatings[i.id] === "number").length;
  const liveSus = computeSusScore(t3Response.susRatings);

  return (
    <div className="stack">
      {/* Page Header */}
      <header className="page-head">
        <div>
          <h2>Deaf ISL User Study Protocol</h2>
          <p>
            Interactive three-task evaluation harness implementing Section 5.2 of the NCDTE conference
            paper: blind 18-clip avatar understandability, 5 continuous Kannada-to-ISL sentences, and
            counter-dialogue usefulness with Brooke (1996) SUS scoring.
          </p>
        </div>
        <div className="meta-line">
          <span className="meta-item">
            Protocol <strong>{PROTOCOL_VERSION}</strong>
          </span>
          <span className="meta-sep" aria-hidden="true">·</span>
          <span className="meta-item">
            Target <strong>N = 8–12 Deaf ISL</strong>
          </span>
          <span className="meta-sep" aria-hidden="true">·</span>
          <span className="meta-item">
            Recorded <strong className="tabular">{sessions.length}</strong>
          </span>
        </div>
      </header>

      {/* Stepper Navigation */}
      <nav className="study-steps" aria-label="User study workflow steps">
        {(
          [
            { id: "setup", label: "1. Setup & Consent", meta: participant.participantId || "ID" },
            { id: "task1", label: "2. Blind Clips", meta: `${liveMetrics.task1Answered}/18` },
            { id: "task2", label: "3. Sentences", meta: `${liveMetrics.task2Answered}/5` },
            { id: "task3", label: "4. Usefulness & SUS", meta: liveSus !== null ? `SUS ${liveSus}` : `${susAnsweredCount}/10` },
            { id: "results", label: "5. Results & Export", meta: `N = ${sessions.length}` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`study-step-btn ${step === tab.id ? "active" : ""}`}
            onClick={() => {
              setStatusMessage(null);
              setStep(tab.id);
            }}
            aria-current={step === tab.id ? "step" : undefined}
          >
            <span className="study-step-label">{tab.label}</span>
            <span className="study-step-meta tabular">{tab.meta}</span>
          </button>
        ))}
      </nav>

      {statusMessage && (
        <Notice tone={statusMessage.tone} title={statusMessage.tone === "ok" ? "Session Recorded" : "Protocol Notice"}>
          {statusMessage.text}
        </Notice>
      )}

      {/* =====================================================================
          STEP 1: SESSION SETUP & ACADEMIC INTEGRITY GUARD
         ===================================================================== */}
      {step === "setup" && (
        <div className="two-col">
          <Card
            title="Participant Session Setup"
            subtitle="De-identified metadata recorded with each evaluation session (zero video or PII stored)."
            icon="settings"
          >
            <div className="form-grid">
              <label className="field">
                Anonymized Participant ID
                <input
                  type="text"
                  value={participant.participantId}
                  onChange={(e) => setParticipant((p) => ({ ...p, participantId: e.target.value }))}
                  placeholder="e.g., P01"
                  maxLength={24}
                />
                <span className="hint">
                  Used strictly as a de-identified code and deterministic seed to randomize the 18 blind clips.
                </span>
              </label>

              <label className="field">
                ISL Proficiency Group
                <select
                  value={participant.proficiency}
                  onChange={(e) =>
                    setParticipant((p) => ({ ...p, proficiency: e.target.value as ProficiencyLevel }))
                  }
                >
                  {(Object.keys(PROFICIENCY_LABELS) as ProficiencyLevel[]).map((key) => (
                    <option key={key} value={key}>
                      {PROFICIENCY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={participant.interpreterPresent}
                  onChange={(e) => setParticipant((p) => ({ ...p, interpreterPresent: e.target.checked }))}
                />
                <span>Accredited ISL interpreter present to brief participant & score open-ended gist</span>
              </label>

              <label className="switch">
                <input
                  type="checkbox"
                  checked={participant.consentAcknowledged}
                  onChange={(e) => setParticipant((p) => ({ ...p, consentAcknowledged: e.target.checked }))}
                />
                <span>Informed consent confirmed (anonymous scores only, voluntary participation, may stop anytime)</span>
              </label>

              <label className="field">
                Session Context Notes (optional)
                <textarea
                  rows={2}
                  value={participant.sessionNotes}
                  onChange={(e) => setParticipant((p) => ({ ...p, sessionNotes: e.target.value }))}
                  placeholder="e.g., BMSCE lab laptop, 15-inch display, Bengaluru Deaf Association cohort"
                />
              </label>
            </div>

            <div className="toolbar">
              <Btn
                variant="primary"
                icon="play"
                onClick={() => {
                  setStatusMessage(null);
                  setStep("task1");
                }}
              >
                Begin Task 1 (18 Blind Clips)
              </Btn>
              <Btn variant="ghost" onClick={() => setStep("results")}>
                View Recorded Results ({sessions.length})
              </Btn>
            </div>
          </Card>

          <Card
            title="Pre-Registered Protocol & Integrity Guard"
            subtitle="Matches Section 5.2 of the revised 6-page NCDTE conference paper."
            icon="flask"
          >
            <Notice tone="info" title="Zero Fabricated Human Scores">
              This module ships with <strong>0 pre-seeded participant records</strong>. Aggregate
              understandability, gist, and SUS scores are computed strictly from real sessions
              submitted on this device. Pilot walkthroughs are tagged separately and excluded from
              Deaf participant counts.
            </Notice>

            <div className="study-protocol-list">
              <div className="study-protocol-item">
                <strong>Task 1 · Blind Avatar Understandability (18 Clips)</strong>
                <p className="muted small">
                  Plays 18 randomized dataset-derived (&ldquo;captured&rdquo;) cleaned 3D avatar clips
                  across 6 public-service domains without displaying text or gloss labels. Captures
                  open-ended ID, 4-AFC comprehension, 1–5 visual clarity, and 5 linguistic error tags.
                </p>
              </div>
              <div className="study-protocol-item">
                <strong>Task 2 · Continuous Sentence Comprehension (5 Sentences)</strong>
                <p className="muted small">
                  Plays 5 continuous Kannada-to-ISL sequences (3–5 signs each) with parabolic
                  co-articulation blending. Captures open-ended gist, interpreter-scored gist verdict
                  (Full / Partial / None), and 1–5 transition naturalness.
                </p>
              </div>
              <div className="study-protocol-item">
                <strong>Task 3 · Counter-Dialogue Usefulness &amp; 10-Item SUS</strong>
                <p className="muted small">
                  Guides a live public-counter role-play (hospital, bank, or classroom), records 1–5
                  perceived usefulness, standard Brooke (1996) SUS (0–100), and interpreter-mediated
                  qualitative feedback with one-click anonymized JSON/CSV export.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          STEP 2: TASK 1 — BLIND AVATAR UNDERSTANDABILITY (18 RANDOMIZED CLIPS)
         ===================================================================== */}
      {step === "task1" && (
        <div className="k2s-layout">
          <div className="avatar-col stack">
            <Card
              title={`Blind Clip ${currentTrial.trialNumber} of ${trials.length}`}
              subtitle="Sign label & gloss are hidden during playback to prevent text leakage."
              icon="eye"
              actions={
                <span className="small muted tabular">
                  Replays: <strong>{currentT1.replayCount}</strong>
                </span>
              }
            >
              <div className="avatar-stage blind-study-stage">
                <AvatarView ref={avatarRef} onState={setPlayback} speed={speed} />
                {clipLoading && (
                  <div className="avatar-loading">
                    <Spinner label="Loading cleaned 3D avatar clip…" />
                  </div>
                )}
                <div className="avatar-hud">
                  <div className="avatar-now">
                    <span className="gloss">Blind Evaluation Mode</span>
                    <strong className="tabular">
                      {playback.playing
                        ? playback.paused
                          ? `Paused · Clip #${currentTrial.trialNumber}`
                          : `Playing Clip #${currentTrial.trialNumber} / ${trials.length}`
                        : `Clip #${currentTrial.trialNumber} ready (label hidden)`}
                    </strong>
                  </div>
                </div>
              </div>

              {clipError && <Notice tone="bad" title="Clip Load Error">{clipError}</Notice>}

              <div className="toolbar">
                <Btn
                  variant="primary"
                  icon={currentT1.replayCount > 0 ? "replay" : "play"}
                  disabled={clipLoading}
                  onClick={() => playBlindTrialClip(currentTrial.sign.id, true)}
                >
                  {currentT1.replayCount > 0 ? "Replay Clip" : "Play Blind Clip"}
                </Btn>
                <Btn
                  icon={playback.paused ? "play" : "pause"}
                  disabled={!playback.playing}
                  onClick={() => (playback.paused ? avatarRef.current?.resume() : avatarRef.current?.pause())}
                >
                  {playback.paused ? "Resume" : "Pause"}
                </Btn>
                <Btn icon="stop" disabled={!playback.playing} onClick={() => avatarRef.current?.stop()}>
                  Stop
                </Btn>
                <div className="grow" />
                <div className="seg" role="group" aria-label="Avatar playback speed">
                  {SPEEDS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      className={speed === sp ? "on" : ""}
                      onClick={() => setSpeed(sp)}
                    >
                      {sp}×
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card
              title="Task 1 Response Sheet"
              subtitle="Complete open-ended identification first, then select the closest 4-AFC option and rate clarity."
              icon="edit"
              actions={
                <span className="small muted tabular">
                  Answered <strong>{liveMetrics.task1Answered}/18</strong>
                </span>
              }
            >
              {/* Quick-jump trial grid */}
              <div className="study-trial-grid" role="group" aria-label="Jump to blind clip trial">
                {trials.map((tr, i) => {
                  const ans = t1Responses[tr.sign.id];
                  const done = Boolean(ans?.selectedOptionId && ans?.clarityRating);
                  return (
                    <button
                      key={tr.sign.id}
                      type="button"
                      className={`study-trial-pill tabular ${i === t1Index ? "current" : ""} ${done ? "done" : ""}`}
                      onClick={() => {
                        avatarRef.current?.stop();
                        setT1Index(i);
                      }}
                      title={`Trial ${tr.trialNumber}${done ? " (completed)" : ""}`}
                    >
                      {tr.trialNumber}
                    </button>
                  );
                })}
              </div>

              <hr className="divider" />

              {/* (a) Open-ended identification */}
              <label className="field">
                (a) Open-Ended Sign Identification (record before 4-AFC)
                <input
                  type="text"
                  value={currentT1.openEndedText}
                  onChange={(e) => updateT1({ openEndedText: e.target.value })}
                  placeholder="Type what the participant signed or reported (English or Kannada)…"
                />
              </label>

              {/* (b) 4-AFC comprehension */}
              <div className="field">
                <span>(b) 4-Alternative Forced Choice (4-AFC)</span>
                <div className="study-afc-grid" role="radiogroup" aria-label="4-AFC sign meaning options">
                  {currentTrial.options.map((opt, idx) => {
                    const selected = currentT1.selectedOptionId === opt.id;
                    const letter = String.fromCharCode(65 + idx);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className={`study-afc-btn ${selected ? "selected" : ""}`}
                        onClick={() => updateT1({ selectedOptionId: opt.id })}
                      >
                        <span className="study-afc-key">{letter}</span>
                        <span className="study-afc-text">
                          <strong>{opt.english}</strong>
                          <span className="kn small muted" lang="kn">{opt.kannada}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* (c) Visual clarity 1-5 */}
              <div className="field">
                <span>(c) Visual Clarity Rating (1 = Unclear · 5 = Crystal Clear)</span>
                <div className="study-likert-row" role="radiogroup" aria-label="Visual clarity 1 to 5">
                  {LIKERT_5.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={currentT1.clarityRating === n}
                      className={`study-likert-btn tabular ${currentT1.clarityRating === n ? "selected" : ""}`}
                      onClick={() => updateT1({ clarityRating: n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* (d) Error-type tags */}
              <div className="field">
                <span>(d) Observed Articulation Issues (select all that apply, if any)</span>
                <div className="study-tag-row">
                  {ALL_ERROR_TAGS.map((tag) => {
                    const active = currentT1.errorTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        aria-pressed={active}
                        className={`study-tag-btn ${active ? "selected" : ""}`}
                        onClick={() => toggleErrorTag(tag)}
                      >
                        {ERROR_TAG_LABELS[tag]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="divider" />

              <div className="toolbar">
                <Btn
                  disabled={t1Index === 0}
                  onClick={() => {
                    avatarRef.current?.stop();
                    setT1Index((i) => Math.max(0, i - 1));
                  }}
                >
                  Previous Clip
                </Btn>
                <div className="grow" />
                {t1Index < trials.length - 1 ? (
                  <Btn
                    variant="primary"
                    onClick={() => {
                      avatarRef.current?.stop();
                      setT1Index((i) => Math.min(trials.length - 1, i + 1));
                    }}
                  >
                    Next Clip ({t1Index + 2}/{trials.length})
                  </Btn>
                ) : (
                  <Btn variant="primary" icon="check" onClick={() => setStep("task2")}>
                    Proceed to Task 2 (Sentences)
                  </Btn>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 3: TASK 2 — CONTINUOUS SENTENCE COMPREHENSION (5 SENTENCES)
         ===================================================================== */}
      {step === "task2" && (
        <div className="k2s-layout">
          <div className="avatar-col stack">
            <Card
              title={`Sentence ${currentSentence.id} of ${TASK2_SENTENCES.length} · ${currentSentence.domain}`}
              subtitle={`Continuous ${currentSentence.signIds.length}-sign sequence with parabolic co-articulation blending.`}
              icon="text"
              actions={
                <span className="small muted tabular">
                  Replays: <strong>{currentT2.replayCount}</strong>
                </span>
              }
            >
              <div className="avatar-stage blind-study-stage">
                <AvatarView ref={avatarRef} onState={setPlayback} speed={speed} />
                {clipLoading && (
                  <div className="avatar-loading">
                    <Spinner label="Loading continuous sentence sequence…" />
                  </div>
                )}
                <div className="avatar-hud">
                  <div className="avatar-now">
                    <span className="gloss">Continuous Sequence</span>
                    <strong className="tabular">
                      {playback.playing
                        ? `Playing sign ${Math.max(1, playback.index + 1)} / ${currentSentence.signIds.length}`
                        : `${currentSentence.signIds.length} signs ready (${currentSentence.id})`}
                    </strong>
                  </div>
                </div>
              </div>

              {clipError && <Notice tone="bad" title="Sequence Load Error">{clipError}</Notice>}

              <div className="toolbar">
                <Btn
                  variant="primary"
                  icon={currentT2.replayCount > 0 ? "replay" : "play"}
                  disabled={clipLoading}
                  onClick={() => playSentenceClips(currentSentence.id, currentSentence.signIds, true)}
                >
                  {currentT2.replayCount > 0 ? "Replay Sentence" : "Play Sentence"}
                </Btn>
                <Btn
                  icon={playback.paused ? "play" : "pause"}
                  disabled={!playback.playing}
                  onClick={() => (playback.paused ? avatarRef.current?.resume() : avatarRef.current?.pause())}
                >
                  {playback.paused ? "Resume" : "Pause"}
                </Btn>
                <Btn icon="stop" disabled={!playback.playing} onClick={() => avatarRef.current?.stop()}>
                  Stop
                </Btn>
                <div className="grow" />
                <div className="seg" role="group" aria-label="Sentence playback speed">
                  {SPEEDS.map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      className={speed === sp ? "on" : ""}
                      onClick={() => setSpeed(sp)}
                    >
                      {sp}×
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="stack">
            <Card
              title="Task 2 Sentence Comprehension Sheet"
              subtitle="Play the sequence without revealing the text, record the participant's gist, then score with the interpreter."
              icon="edit"
              actions={
                <span className="small muted tabular">
                  Scored <strong>{liveMetrics.task2Answered}/{TASK2_SENTENCES.length}</strong>
                </span>
              }
            >
              {/* Sentence quick selector */}
              <div className="study-sentence-tabs" role="group" aria-label="Select study sentence">
                {TASK2_SENTENCES.map((s, idx) => {
                  const done = Boolean(t2Responses[s.id]?.gistVerdict && t2Responses[s.id]?.naturalnessRating);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={`study-trial-pill ${idx === t2Index ? "current" : ""} ${done ? "done" : ""}`}
                      onClick={() => {
                        avatarRef.current?.stop();
                        setT2Index(idx);
                      }}
                    >
                      {s.id} ({s.signIds.length})
                    </button>
                  );
                })}
              </div>

              {/* Interpreter-only key toggle */}
              <div className="study-key-box">
                <div className="toolbar">
                  <span className="small muted">
                    Reference Kannada &amp; ISL gloss key (keep hidden while participant watches)
                  </span>
                  <div className="grow" />
                  <Btn size="sm" variant="ghost" onClick={() => setRevealSentenceKey((r) => !r)}>
                    {revealSentenceKey ? "Hide Key" : "Reveal Key (Interpreter)"}
                  </Btn>
                </div>
                {revealSentenceKey && (
                  <div className="study-key-reveal">
                    <div className="kn" lang="kn">
                      <strong>{currentSentence.kannada}</strong>
                    </div>
                    <div className="small">{currentSentence.english}</div>
                    <div className="xs muted">
                      ISL Glosses: <code>{currentSentence.glosses.join(" → ")}</code>
                    </div>
                  </div>
                )}
              </div>

              <label className="field">
                (a) Participant&apos;s Reported Gist (open-ended)
                <textarea
                  rows={2}
                  value={currentT2.openEndedGist}
                  onChange={(e) => updateT2({ openEndedGist: e.target.value })}
                  placeholder="Write what the participant understood from the signed sentence…"
                />
              </label>

              <div className="field">
                <span>(b) Interpreter-Scored Gist Comprehension</span>
                <div className="study-gist-row" role="radiogroup" aria-label="Sentence gist comprehension">
                  {(
                    [
                      { id: "full", label: "Full Gist (1.0)", desc: "Core meaning understood accurately" },
                      { id: "partial", label: "Partial Gist (0.5)", desc: "Some signs understood; key detail missed" },
                      { id: "none", label: "Not Understood (0.0)", desc: "Meaning unclear or misread" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={currentT2.gistVerdict === opt.id}
                      className={`study-gist-btn ${currentT2.gistVerdict === opt.id ? "selected" : ""}`}
                      onClick={() => updateT2({ gistVerdict: opt.id as GistScore })}
                    >
                      <strong>{opt.label}</strong>
                      <span className="xs muted">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>(c) Transition Naturalness Rating (1 = Robotic/Abrupt · 5 = Smooth &amp; Natural)</span>
                <div className="study-likert-row" role="radiogroup" aria-label="Transition naturalness 1 to 5">
                  {LIKERT_5.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={currentT2.naturalnessRating === n}
                      className={`study-likert-btn tabular ${currentT2.naturalnessRating === n ? "selected" : ""}`}
                      onClick={() => updateT2({ naturalnessRating: n })}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                Transition / Co-Articulation Notes (optional)
                <input
                  type="text"
                  value={currentT2.notes}
                  onChange={(e) => updateT2({ notes: e.target.value })}
                  placeholder="e.g., Smooth blend between HOSPITAL and DOCTOR; pause too brief"
                />
              </label>

              <hr className="divider" />

              <div className="toolbar">
                <Btn
                  disabled={t2Index === 0}
                  onClick={() => {
                    avatarRef.current?.stop();
                    setT2Index((i) => Math.max(0, i - 1));
                  }}
                >
                  Previous Sentence
                </Btn>
                <div className="grow" />
                {t2Index < TASK2_SENTENCES.length - 1 ? (
                  <Btn
                    variant="primary"
                    onClick={() => {
                      avatarRef.current?.stop();
                      setT2Index((i) => Math.min(TASK2_SENTENCES.length - 1, i + 1));
                    }}
                  >
                    Next Sentence ({TASK2_SENTENCES[t2Index + 1].id})
                  </Btn>
                ) : (
                  <Btn variant="primary" icon="check" onClick={() => setStep("task3")}>
                    Proceed to Task 3 (Usefulness &amp; SUS)
                  </Btn>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* =====================================================================
          STEP 4: TASK 3 — REAL-WORLD USEFULNESS & 10-ITEM BROOKE SUS (0–100)
         ===================================================================== */}
      {step === "task3" && (
        <div className="stack">
          <div className="two-col">
            <Card
              title="Counter-Dialogue Role-Play & Usefulness"
              subtitle="Complete a short bidirectional exchange before scoring overall usefulness."
              icon="hand"
            >
              <div className="field">
                <span>Role-Play Scenario</span>
                <div className="stack">
                  {ROLEPLAY_SCENARIOS.map((sc) => {
                    const active = t3Response.scenarioId === sc.id;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        className={`study-scenario-btn ${active ? "selected" : ""}`}
                        onClick={() => setT3Response((prev) => ({ ...prev, scenarioId: sc.id }))}
                      >
                        <strong>{sc.title}</strong>
                        <span className="xs muted">{sc.prompt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="field">
                <span>Perceived Real-World Counter Usefulness (1 = Not Useful · 5 = Very Useful)</span>
                <div className="study-likert-row" role="radiogroup" aria-label="Perceived usefulness 1 to 5">
                  {LIKERT_5.map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={t3Response.usefulnessRating === n}
                      className={`study-likert-btn tabular ${t3Response.usefulnessRating === n ? "selected" : ""}`}
                      onClick={() => setT3Response((prev) => ({ ...prev, usefulnessRating: n }))}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <Card
              title="Interpreter-Mediated Qualitative Feedback"
              subtitle="Record participant comments on avatar clarity, facial cues, speed, and counter trust."
              icon="edit"
            >
              <label className="field">
                Qualitative Notes &amp; Improvement Priorities
                <textarea
                  rows={6}
                  value={t3Response.qualitativeFeedback}
                  onChange={(e) =>
                    setT3Response((prev) => ({ ...prev, qualitativeFeedback: e.target.value }))
                  }
                  placeholder="Summarize participant feedback (e.g., which signs were immediately clear, where facial non-manual markers or slower speed helped, preferred counter use cases)…"
                />
              </label>

              <div className="stats">
                <Stat
                  label="Task 1 Progress"
                  value={`${liveMetrics.task1Answered} / 18`}
                />
                <Stat
                  label="Task 2 Progress"
                  value={`${liveMetrics.task2Answered} / 5`}
                />
                <Stat
                  label="Live SUS Score"
                  value={liveSus !== null ? `${liveSus} / 100` : `${susAnsweredCount} / 10`}
                />
              </div>
            </Card>
          </div>

          <Card
            title="System Usability Scale (SUS — Brooke, 1996)"
            subtitle="Rate each statement from 1 (Strongly Disagree) to 5 (Strongly Agree). Standard alternating odd/even scoring (0–100)."
            icon="flask"
            actions={
              <span className="small muted tabular">
                SUS: <strong>{liveSus !== null ? `${liveSus} / 100` : "Incomplete"}</strong>
              </span>
            }
          >
            <div className="study-sus-list">
              {SUS_ITEMS.map((item) => {
                const currentVal = t3Response.susRatings[item.id] ?? null;
                return (
                  <div key={item.id} className="study-sus-row">
                    <div className="study-sus-text">
                      <span className="study-sus-num tabular">{item.id}.</span>
                      <span>{item.text}</span>
                    </div>
                    <div className="study-sus-scale" role="radiogroup" aria-label={`SUS item ${item.id}`}>
                      {LIKERT_5.map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={currentVal === n}
                          className={`study-likert-btn compact tabular ${currentVal === n ? "selected" : ""}`}
                          onClick={() => setSusItem(item.id, n)}
                          title={n === 1 ? "Strongly Disagree" : n === 5 ? "Strongly Agree" : `Score ${n}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="toolbar">
              <Btn variant="ghost" onClick={() => setStep("task2")}>
                Back to Task 2
              </Btn>
              <div className="grow" />
              <Btn variant="primary" icon="check" onClick={handleSaveSession}>
                Save Completed Session ({participant.participantId || "P01"})
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* =====================================================================
          STEP 5: RECORDED RESULTS & ANONYMIZED EXPORT
         ===================================================================== */}
      {step === "results" && (
        <div className="stack">
          <Card
            title="Recorded Study Results & Anonymized Export"
            subtitle="All aggregate statistics below are calculated strictly from real submitted sessions in this browser."
            icon="database"
            actions={
              <div className="toolbar">
                <Btn
                  size="sm"
                  icon="download"
                  disabled={sessions.length === 0}
                  onClick={() =>
                    downloadBlob(
                      exportSessionsToJson(sessions),
                      `silent_bridge_deaf_isl_study_${sessions.length}sessions.json`,
                      "application/json"
                    )
                  }
                >
                  Export JSON
                </Btn>
                <Btn
                  size="sm"
                  icon="download"
                  disabled={sessions.length === 0}
                  onClick={() =>
                    downloadBlob(
                      exportSessionsToCsv(sessions),
                      `silent_bridge_deaf_isl_study_${sessions.length}sessions.csv`,
                      "text/csv;charset=utf-8"
                    )
                  }
                >
                  Export CSV
                </Btn>
                {sessions.length > 0 && !confirmClear && (
                  <Btn size="sm" variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
                    Clear Local
                  </Btn>
                )}
              </div>
            }
          >
            {confirmClear && (
              <Notice tone="warn" title="Confirm Clearing Local Sessions">
                <div className="toolbar" style={{ marginTop: 6 }}>
                  <span className="small">
                    Remove all {sessions.length} locally stored study session(s) from this browser?
                    Export JSON/CSV first if you need to keep them.
                  </span>
                  <div className="grow" />
                  <Btn size="sm" variant="danger" onClick={handleClearAllSessions}>
                    Yes, Clear All
                  </Btn>
                  <Btn size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </Btn>
                </div>
              </Notice>
            )}

            {sessions.length === 0 ? (
              <Empty icon="flask">
                <strong>0 sessions recorded — zero fabricated human scores.</strong>
                <div className="small muted" style={{ marginTop: 4 }}>
                  Complete a real Deaf ISL participant evaluation (or pilot walkthrough) starting in{" "}
                  <button type="button" className="linkish" onClick={() => setStep("setup")}>
                    Step 1: Setup &amp; Consent
                  </button>{" "}
                  to populate live comprehension, clarity, gist, usefulness, and SUS aggregates.
                </div>
              </Empty>
            ) : (
              <>
                <div className="study-kpi-grid">
                  <Stat label="Total Sessions" value={aggregate.sessionCount} />
                  <Stat
                    label="Deaf / Interpreter N"
                    value={aggregate.realDeafSessionCount}
                    hint="Excludes pilot walkthroughs"
                  />
                  <Stat
                    label="Task 1 · 4-AFC Acc."
                    value={
                      aggregate.meanTask1AccuracyPct !== null
                        ? `${aggregate.meanTask1AccuracyPct}%`
                        : "—"
                    }
                  />
                  <Stat
                    label="Task 1 · Clarity"
                    value={
                      aggregate.meanTask1Clarity !== null ? `${aggregate.meanTask1Clarity} / 5` : "—"
                    }
                  />
                  <Stat
                    label="Task 2 · Gist"
                    value={
                      aggregate.meanTask2GistPct !== null ? `${aggregate.meanTask2GistPct}%` : "—"
                    }
                  />
                  <Stat
                    label="Task 2 · Naturalness"
                    value={
                      aggregate.meanTask2Naturalness !== null
                        ? `${aggregate.meanTask2Naturalness} / 5`
                        : "—"
                    }
                  />
                  <Stat
                    label="Task 3 · Usefulness"
                    value={aggregate.meanUsefulness !== null ? `${aggregate.meanUsefulness} / 5` : "—"}
                  />
                  <Stat
                    label="Task 3 · Mean SUS"
                    value={aggregate.meanSusScore !== null ? `${aggregate.meanSusScore} / 100` : "—"}
                  />
                </div>

                {/* Error-tag frequency breakdown */}
                <div className="study-error-summary">
                  <strong className="small">Task 1 Reported Articulation Error Tags (Total Counts)</strong>
                  <div className="study-error-bars">
                    {ALL_ERROR_TAGS.map((tag) => {
                      const count = aggregate.errorTagTotals[tag];
                      const maxVal = Math.max(1, ...ALL_ERROR_TAGS.map((t) => aggregate.errorTagTotals[t]));
                      const pct = Math.round((count / maxVal) * 100);
                      return (
                        <div key={tag} className="study-error-bar-row">
                          <span className="small">{ERROR_TAG_LABELS[tag]}</span>
                          <div className="mini-bar">
                            <div style={{ width: `${count > 0 ? Math.max(6, pct) : 0}%` }} />
                          </div>
                          <strong className="small tabular">{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Per-session table */}
                <div className="study-table-wrap">
                  <table className="study-table">
                    <thead>
                      <tr>
                        <th>Participant</th>
                        <th>Cohort</th>
                        <th>Interp.</th>
                        <th>4-AFC Acc.</th>
                        <th>Clarity</th>
                        <th>Gist</th>
                        <th>Naturalness</th>
                        <th>Usefulness</th>
                        <th>SUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.sessionId}>
                          <td>
                            <strong>{s.participant.participantId}</strong>
                            <div className="xs muted tabular">
                              {new Date(s.recordedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="small">{PROFICIENCY_LABELS[s.participant.proficiency]}</td>
                          <td className="small">{s.participant.interpreterPresent ? "Yes" : "No"}</td>
                          <td className="tabular">
                            {s.summary.task1AccuracyPct !== null
                              ? `${s.summary.task1AccuracyPct}% (${s.summary.task1Correct4AFC}/${s.summary.task1Answered})`
                              : "—"}
                          </td>
                          <td className="tabular">
                            {s.summary.task1MeanClarity !== null ? `${s.summary.task1MeanClarity}/5` : "—"}
                          </td>
                          <td className="tabular">
                            {s.summary.task2GistScorePct !== null ? `${s.summary.task2GistScorePct}%` : "—"}
                          </td>
                          <td className="tabular">
                            {s.summary.task2MeanNaturalness !== null ? `${s.summary.task2MeanNaturalness}/5` : "—"}
                          </td>
                          <td className="tabular">
                            {s.summary.usefulnessRating !== null ? `${s.summary.usefulnessRating}/5` : "—"}
                          </td>
                          <td className="tabular">
                            <strong>{s.summary.susScore !== null ? s.summary.susScore : "—"}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
