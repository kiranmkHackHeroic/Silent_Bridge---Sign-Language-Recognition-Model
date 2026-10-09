import type { MetricBlock, Metrics } from "../services/types";
import { Chip, Empty, Notice, Stat } from "./ui";

const pct = (v?: number | null) => (v === undefined || v === null ? "—" : `${(v * 100).toFixed(1)}%`);

export function ConfusionMatrix({ cm }: { cm: MetricBlock["confusion_matrix"] }) {
  return (
    <div className="table-wrap">
      <table className="cm" aria-label="Confusion matrix: rows are true labels, columns are predicted labels">
        <thead>
          <tr>
            <th className="rowh">true ↓ / predicted →</th>
            {cm.labels.map((l) => <th key={l}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {cm.matrix.map((row, i) => {
            const total = row.reduce((a, b) => a + b, 0) || 1;
            return (
              <tr key={cm.labels[i]}>
                <th className="rowh">{cm.labels[i]}</th>
                {row.map((v, j) => (
                  <td key={j} className={i === j ? "diag" : v ? "off" : ""} style={{ ["--a" as string]: v / total }}>{v || ""}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function PerClassTable({ perClass }: { perClass: MetricBlock["per_class"] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Class</th><th>Precision</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
        <tbody>
          {Object.entries(perClass).map(([c, r]) => (
            <tr key={c}>
              <td><code>{c}</code></td>
              <td>{pct(r.precision)}</td>
              <td>{pct(r.recall)}</td>
              <td>{r["f1-score"].toFixed(3)}{r.recall < 0.7 && <> <Chip tone="warn">weak</Chip></>}</td>
              <td>{r.support}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricsReport({ metrics, compact = false }: { metrics: Metrics | null; compact?: boolean }) {
  if (!metrics) return null;
  if (!metrics.available) {
    return (
      <Empty icon="flask">
        <strong>Not evaluated.</strong> No model has been trained yet, so there are no accuracy figures. Record real samples and train the model; measured results appear here automatically.
      </Empty>
    );
  }
  const test = metrics.test;
  return (
    <div className="stack">
      <div className="stats">
        <Stat label="Accuracy" value={pct(metrics.accuracy)} hint={metrics.headline_source} />
        <Stat label="Macro F1" value={metrics.macro_f1?.toFixed(3) ?? "—"} />
        <Stat label="Correct / wrong" value={`${metrics.correct} / ${metrics.incorrect}`} />
        <Stat label="Train · test" value={`${metrics.num_train_dev} · ${metrics.num_test || "CV"}`} hint="samples used for development / independent test" />
        <Stat label="Classifier latency" value={`${metrics.inference_latency_ms} ms`} />
      </div>
      <Notice tone={metrics.session_independent ? "info" : "warn"} title={`Measured on: ${metrics.headline_source}`}>
        {metrics.evaluation_strategy}. Model <code>{metrics.model_version}</code>: {metrics.architecture}.
      </Notice>
      {metrics.warnings?.map((w) => <Notice key={w} tone="warn">{w}</Notice>)}

      {metrics.candidates && (
        <>
          <h3 className="small">Model comparison (same session-grouped validation folds)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Candidate</th><th>Accuracy</th><th>Macro F1</th><th></th></tr></thead>
              <tbody>
                {Object.entries(metrics.candidates).map(([k, v]) => (
                  <tr key={k} className={k === metrics.model_type ? "selected" : ""}>
                    <td><code>{k}</code><div className="muted xs">{v.architecture}</div></td>
                    <td>{pct(v.accuracy)}</td>
                    <td>{v.macro_f1.toFixed(3)}</td>
                    <td>{k === metrics.model_type ? <Chip tone="ok">selected</Chip> : k === "logreg" ? <Chip tone="muted">baseline</Chip> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {test ? (
        <>
          <h3 className="small">Independent held-out session <code>{test.session}</code> ({test.num_examples} recordings)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Model</th><th>Accuracy</th><th>Macro F1</th></tr></thead>
              <tbody>
                {Object.entries(test.models).map(([k, b]) => (
                  <tr key={k}><td><code>{k}</code> {k === metrics.model_type && <Chip tone="ok">selected</Chip>} {k === "logreg" && <Chip tone="muted">baseline</Chip>}</td><td>{pct(b.accuracy)}</td><td>{b.macro_f1.toFixed(3)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {test.continuous_stream && (
            <Notice tone="info" title="Continuous-stream test (held-out recordings replayed back-to-back through the live pipeline)">
              {test.continuous_stream.reference_signs} signs performed → {test.continuous_stream.emitted_signs} added ·
              substitutions {test.continuous_stream.substitutions}, missed {test.continuous_stream.deletions}, extra {test.continuous_stream.insertions} ·
              sign error rate <strong>{pct(test.continuous_stream.sign_error_rate)}</strong> at threshold {Math.round(test.continuous_stream.threshold * 100)}%.
            </Notice>
          )}
        </>
      ) : (
        !compact && <p className="muted xs">No independent test session yet (needs 3+ recording sessions). Figures above are out-of-fold cross-validation results.</p>
      )}

      {!compact && metrics.per_class && (
        <>
          <h3 className="small">Per-class results</h3>
          <PerClassTable perClass={metrics.per_class} />
        </>
      )}
      {!compact && metrics.confusion_matrix && (
        <>
          <h3 className="small">Confusion matrix</h3>
          <ConfusionMatrix cm={metrics.confusion_matrix} />
        </>
      )}
      {metrics.confused_pairs && metrics.confused_pairs.length > 0 && (
        <>
          <h3 className="small">Error analysis: most confused signs</h3>
          <ul className="list">
            {metrics.confused_pairs.slice(0, 5).map((p) => (
              <li key={`${p.true}-${p.predicted}`}><code>{p.true}</code> predicted as <code>{p.predicted}</code> × {p.count}. Check for a similar handshape, location or movement, and record more varied examples.</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
