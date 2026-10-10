import { useCallback, useEffect, useState } from "react";
import { api, WEBCAM_THRESHOLD_KEY, type LiveEvalReport } from "../services/api";
import { Btn, Card, Chip, Empty, Notice, Spinner, Stat } from "./ui";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${(v * 100).toFixed(1)}%`);

/** Live-performance report of the ACTIVE model on evaluation-only webcam recordings (never trained on). */
export function LiveEvalCard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.evaluationData>> | null>(null);
  const [rep, setRep] = useState<LiveEvalReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => api.evaluationData().then(setData).catch((e) => setErr(String(e.message || e))), []);
  useEffect(() => { load(); }, [load, refreshKey]);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      setRep(await api.evaluateLive());
    } catch (e) {
      setErr(String((e as Error).message || e));
    }
    setBusy(false);
  };
  const iso = rep?.isolated;
  const seq = rep?.sequences;

  return (
    <Card title="Live evaluation (your evaluation-only recordings)" icon="flask" className="span-all"
      subtitle="Recordings made with purpose “evaluation only” are stored separately and never trained on"
      actions={<Btn icon="play" size="sm" variant="primary" onClick={run} disabled={busy || !data || (data.isolated === 0 && data.sequences === 0)}>Evaluate active model</Btn>}>
      {data && (
        <div className="stats">
          <Stat label="Single-sign recordings" value={data.isolated} hint={`${data.per_label?._none ?? 0} non-sign (_none)`} />
          <Stat label="Sessions" value={data.sessions.length} />
          <Stat label="Sequences" value={data.sequences} hint={`${data.sequence_signs} signs in total`} />
        </div>
      )}
      {data && data.isolated === 0 && data.sequences === 0 && (
        <Empty icon="camera">
          No evaluation recordings yet. Record a few signs with <strong>Purpose: evaluation only</strong> in a NEW session (different day, lighting
          or distance), some <strong>_none</strong> movements, and a few sign sequences. Then evaluate here or run <code>python tools/evaluate_live.py</code>.
        </Empty>
      )}
      {busy && <Spinner label="Running the live pipeline on the evaluation recordings…" />}
      {err && <Notice tone="bad">{err}</Notice>}
      {rep && (
        <div className="stack">
          <div className="muted xs">Model {rep.model_version} · acceptance threshold {Math.round(rep.threshold * 100)}% · {rep.note}</div>
          {iso && iso.recordings > 0 && (
            <>
              <h3 className="small">Single signs</h3>
              <div className="stats">
                <Stat label="Accuracy" value={pct(iso.accuracy)} hint={`top-1 ignoring threshold ${pct(iso.top1_accuracy_ignoring_threshold)}`} />
                <Stat label="Macro precision" value={pct(iso.macro_precision)} />
                <Stat label="Macro recall" value={pct(iso.macro_recall)} />
                <Stat label="Macro-F1" value={iso.macro_f1?.toFixed(3) ?? "—"} />
                <Stat label="Rejected (uncertain)" value={iso.rejected_as_uncertain ?? 0} hint={`of ${iso.sign_recordings} sign recordings`} />
                <Stat label="False detections" value={iso.none_recordings ? `${iso.false_detections}/${iso.none_recordings}` : "no _none data"} hint="non-sign movements that produced a word" />
              </div>
              {iso.not_in_model_vocabulary > 0 && <Notice tone="warn">{iso.not_in_model_vocabulary} recording(s) are of signs the active model was not trained on (excluded from the metrics).</Notice>}
              {iso.thresholds && <ThresholdTable th={iso.thresholds} modelThreshold={rep.threshold} />}
              {iso.top_confusions && iso.top_confusions.length > 0 && (
                <div className="small">Most frequent confusions: {iso.top_confusions.slice(0, 6).map((c) => `${c.true} → ${c.predicted} (${c.count})`).join(" · ")}</div>
              )}
              {iso.accuracy_by_condition && Object.keys(iso.accuracy_by_condition).length > 0 && (
                <div className="small">
                  {Object.entries(iso.accuracy_by_condition).map(([k, vals]) => (
                    <div key={k}>Accuracy by {k}: {Object.entries(vals).map(([v, d]) => `${v} ${pct(d.accuracy)} (n=${d.n})`).join(" · ")}</div>
                  ))}
                </div>
              )}
            </>
          )}
          {seq && seq.sequences > 0 && (
            <>
              <h3 className="small">Consecutive-sign sequences (live segmentation, no button presses)</h3>
              <div className="stats">
                <Stat label="Sign error rate" value={seq.sign_error_rate?.toFixed(3) ?? "—"} />
                <Stat label="Substitutions" value={seq.substitutions} />
                <Stat label="Missed (deletions)" value={seq.deletions} />
                <Stat label="Extra words (insertions)" value={seq.insertions} />
                <Stat label="Exactly right" value={`${seq.exactly_right}/${seq.sequences}`} />
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Signed</th><th>Recognised</th><th>SER</th></tr></thead>
                  <tbody>
                    {seq.per_sequence.map((p) => (
                      <tr key={p.sequence_id}>
                        <td className="xs">{p.glosses.join(" ")}</td>
                        <td className="xs">{p.emitted.join(" ") || <span className="muted">nothing</span>}</td>
                        <td className="xs"><Chip tone={p.sign_error_rate === 0 ? "ok" : "warn"}>{p.sign_error_rate?.toFixed(2)}</Chip></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}


function ThresholdTable({ th, modelThreshold }: { th: NonNullable<LiveEvalReport["isolated"]["thresholds"]>; modelThreshold: number }) {
  const [msg, setMsg] = useState("");
  const shown = th.curve.filter((c) => [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85].includes(c.threshold));
  const sel = th.selection;
  const apply = (t: number) => {
    try {
      localStorage.setItem(WEBCAM_THRESHOLD_KEY, String(t));
      setMsg(`Live Recognition will use ${Math.round(t * 100)}% (reload the Live page). The slider can still change it.`);
    } catch {
      setMsg("This browser blocked local storage; set the slider on Live Recognition by hand.");
    }
  };
  return (
    <div className="stack">
      <h3 className="small">Threshold on your webcam recordings (model's validation threshold: {Math.round(modelThreshold * 100)}%)</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Threshold</th><th>Correct</th><th>Wrong words</th><th>Missed signs</th><th>False detections (_none)</th><th>Coverage</th><th>F1</th></tr></thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.threshold} className={Math.abs(c.threshold - modelThreshold) < 0.01 ? "row-hl" : ""}>
                <td className="xs">{Math.round(c.threshold * 100)}%</td><td className="xs">{c.correct}</td><td className="xs">{c.wrong_words}</td>
                <td className="xs">{c.missed_signs}</td><td className="xs">{c.false_detections}</td><td className="xs">{(c.coverage * 100).toFixed(0)}%</td>
                <td className="xs">{c.f1.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sel.possible && sel.recommended_threshold != null ? (
        <div className="small">
          Chosen per held-out session (leave-one-session-out): {sel.per_held_out_session?.map((h) => `${h.session}: ${Math.round(h.chosen_threshold * 100)}%`).join(", ")}.
          Held-out result: {sel.held_out_totals?.correct} correct, {sel.held_out_totals?.wrong_words} wrong, {sel.held_out_totals?.missed_signs} missed,
          {" "}{sel.held_out_totals?.false_detections} false detections.{" "}
          <Btn size="sm" onClick={() => apply(sel.recommended_threshold!)}>Use {Math.round(sel.recommended_threshold * 100)}% for live recognition</Btn>
        </div>
      ) : <div className="muted xs">{sel.reason}: record a second evaluation session to choose a webcam threshold fairly.</div>}
      {msg && <Notice tone="info">{msg}</Notice>}
    </div>
  );
}
