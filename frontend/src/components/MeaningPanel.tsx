import { useEffect, useState } from "react";
import { api, type GlossTranslation } from "../services/api";
import { Btn, Card, Chip, Notice, type Tone } from "./ui";

const STATUS: Record<string, { tone: Tone; text: string }> = {
  phrase: { tone: "ok", text: "phrase match" },
  phrases: { tone: "ok", text: "phrase matches" },
  partial: { tone: "warn", text: "partly word-by-word" },
  word_by_word: { tone: "warn", text: "word-by-word gloss: no sentence meaning known" },
  unsupported: { tone: "bad", text: "contains an unsupported sign" },
  empty: { tone: "muted", text: "no signs yet" },
};

/**
 * Recognised signs -> ISL gloss sequence -> English meaning -> Kannada, each shown separately.
 * The whole sequence is matched against the phrase table (meaning depends on the sequence), so correcting
 * a word in the transcript re-translates everything. Unknown or word-by-word parts are labelled, never guessed.
 */
export function MeaningPanel({ labels, onUseKannada }: { labels: string[]; onUseKannada: (text: string) => void }) {
  const [res, setRes] = useState<GlossTranslation | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [choice, setChoice] = useState<Record<number, number>>({});    // segment index -> alternative index
  const key = labels.join(" ");

  useEffect(() => {
    setChoice({});
    if (!labels.length) {
      setRes(null);
      return;
    }
    const t = window.setTimeout(() => {
      api.translateGlosses(labels).then((r) => { setRes(r); setErr(null); }).catch((e) => setErr(String(e.message || e)));
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const segText = (field: "english" | "kannada") =>
    (res?.segments ?? []).map((s, i) => {
      const alt = choice[i];
      if (alt !== undefined && s.alternatives[alt]) return s.alternatives[alt][field];
      if (s.type === "phrase") return s[field];
      if (s.type === "word") return field === "english" ? `[${s.english.split("/")[0].trim().toLowerCase()}]` : s.kannada;
      return field === "english" ? `[unknown sign ${s.glosses[0]}]` : "";
    }).filter(Boolean).join(" ");
  const st = STATUS[res?.status ?? "empty"] ?? STATUS.empty;

  return (
    <Card title="Meaning" icon="text" subtitle="ISL gloss sequence → English meaning → Kannada (phrase-level, whole sequence)">
      {!labels.length ? <span className="muted small">Recognised words appear here as a gloss sequence with their meaning.</span> : !res ? (
        err ? <Notice tone="bad">{err}</Notice> : <span className="muted small">Translating…</span>
      ) : (
        <div className="stack">
          <div className="meaning-row"><span className="meaning-label">ISL gloss</span>
            <span>{res.segments.map((s, i) => (
              <span key={i} className={`gloss-seg gloss-${s.type}`} title={s.source ?? "unknown sign"}>{s.glosses.join(" ")}</span>
            ))}</span>
          </div>
          <div className="meaning-row"><span className="meaning-label">English</span>
            <span>{segText("english")} <Chip tone={st.tone}>{st.text}</Chip></span>
          </div>
          <div className="meaning-row"><span className="meaning-label">ಕನ್ನಡ</span>
            <span className="meaning-kn" lang="kn">{segText("kannada") || "—"}</span>
          </div>
          {res.segments.some((s) => s.alternatives.length > 0) && (
            <div className="small">
              {res.segments.map((s, i) => s.alternatives.length > 0 && (
                <div key={i}>
                  <strong>{s.glosses.join(" ")}</strong> has more than one reading{s.notes ? ` (${s.notes})` : ""}:{" "}
                  <button className={`linkish ${choice[i] === undefined ? "strong" : ""}`} onClick={() => setChoice((c) => { const n = { ...c }; delete n[i]; return n; })}>{s.english}</button>
                  {s.alternatives.map((a, j) => (
                    <span key={j}> · <button className={`linkish ${choice[i] === j ? "strong" : ""}`} onClick={() => setChoice((c) => ({ ...c, [i]: j }))}>{a.english}</button></span>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div className="muted xs">
            Word-by-word baseline: <span lang="kn">{res.direct_kannada || "—"}</span> ·{" "}
            {res.verified ? "verified" : "unverified: AI-assisted Kannada and proposed ISL order, review pending"}
            {res.unknown.length > 0 && <> · unsupported: {res.unknown.join(", ")}</>}
          </div>
          <div className="toolbar">
            <Btn size="sm" icon="copy" onClick={() => onUseKannada(segText("kannada"))} disabled={!segText("kannada")}>Use this Kannada in the editable text</Btn>
            <span className="muted xs">Correct a sign in the transcript and the meaning is recomputed for the whole sequence.</span>
          </div>
        </div>
      )}
    </Card>
  );
}
