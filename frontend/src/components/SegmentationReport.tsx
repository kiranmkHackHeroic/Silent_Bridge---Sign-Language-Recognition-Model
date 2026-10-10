import { useEffect, useState } from "react";
import { Card, Chip, Empty } from "./ui";

interface CondResult { reference_signs: number; substitutions: number; deletions: number; insertions: number; sign_error_rate: number }
interface Report {
  created: string;
  conditions: string[];
  validation_groups: string[];
  validation_mean_ser: Record<string, number>;
  chosen_on_validation: string;
  test_groups: string[];
  test_threshold: number;
  test_streams: number;
  test_classification_only: { recordings: number; accuracy_top1_accepted_and_correct: number };
  test: Record<string, Record<string, CondResult> & { mean_ser: number }>;
}

const COND_TEXT: Record<string, string> = {
  pause: "short hands-down pause",
  back_to_back: "back to back (recordings' own lead-in/out)",
  trimmed: "hands never lowered (synthetic)",
};

/** Continuous segmentation measured on held-out dataset recordings joined into streams with known boundaries. */
export function SegmentationReport() {
  const [reports, setReports] = useState<Record<string, Report> | null>(null);
  useEffect(() => {
    fetch("/api/reports/segmentation")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: Record<string, unknown>) => {
        // keep only well-formed reports (a missing or partial file must not break the page)
        const ok = Object.fromEntries(Object.entries(d ?? {}).filter(([, v]) => {
          const r = v as Partial<Report>;
          return r && typeof r === "object" && r.test && r.conditions && r.validation_groups && r.test_groups && r.test_classification_only;
        })) as Record<string, Report>;
        setReports(ok);
      })
      .catch(() => setReports({}));
  }, []);
  const list = reports ? Object.entries(reports) : [];
  return (
    <Card title="Continuous segmentation: measured" icon="flask"
      subtitle="Held-out recordings joined into 5-sign streams with exact boundaries, fed frame by frame through the live pipeline">
      {list.length === 0 ? <Empty icon="info">No report yet. Run <code>python tools/eval_segmentation.py</code> in backend/.</Empty> : list.map(([key, r]) => (
        <div key={key} className="stack">
          <div className="muted xs">
            {r.created} · variant chosen on validation groups ({r.validation_groups.join(", ")}): <strong>{r.chosen_on_validation}</strong> ·
            test: {r.test_streams} streams from {r.test_groups.join(", ")} · threshold {r.test_threshold}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Variant</th><th>Val. mean SER</th>{r.conditions.map((c) => <th key={c}>Test SER: {COND_TEXT[c] ?? c}</th>)}</tr>
              </thead>
              <tbody>
                {Object.entries(r.test).map(([name, res]) => (
                  <tr key={name}>
                    <td className="xs">{name} {name === r.chosen_on_validation && <Chip tone="info">chosen on validation</Chip>}</td>
                    <td className="xs">{r.validation_mean_ser[name]?.toFixed(3)}</td>
                    {r.conditions.map((c) => (
                      <td key={c} className="xs" title={`substitutions ${res[c].substitutions}, missed ${res[c].deletions}, extra ${res[c].insertions} of ${res[c].reference_signs}`}>
                        {res[c].sign_error_rate.toFixed(3)} <span className="muted">(S{res[c].substitutions} D{res[c].deletions} I{res[c].insertions})</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="small">
            Classifier alone with perfect boundaries: {(r.test_classification_only.accuracy_top1_accepted_and_correct * 100).toFixed(1)}% of {r.test_classification_only.recordings} test recordings.
            SER = (substitutions + deletions + insertions) / signs; lower is better.
          </div>
        </div>
      ))}
    </Card>
  );
}
