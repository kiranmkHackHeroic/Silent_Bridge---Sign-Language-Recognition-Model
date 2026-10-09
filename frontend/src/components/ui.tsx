import type { ReactNode } from "react";

export type Tone = "ok" | "warn" | "bad" | "info" | "muted" | "sim";

export function Chip({ tone = "muted", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function ConfidenceBar({ value, threshold }: { value: number | null; threshold?: number }) {
  const pct = value === null ? 0 : Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone = value === null ? "muted" : threshold !== undefined && value < threshold ? "warn" : "ok";
  return (
    <div className="conf" aria-label={value === null ? "no confidence" : `confidence ${pct}%`}>
      <div className={`conf-fill conf-${tone}`} style={{ width: `${pct}%` }} />
      {threshold !== undefined && <div className="conf-threshold" style={{ left: `${threshold * 100}%` }} title="threshold" />}
      <span className="conf-label">{value === null ? "—" : `${pct}%`}</span>
    </div>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={`notice notice-${tone}`} role={tone === "bad" ? "alert" : undefined}>{children}</div>;
}

export function Spinner() {
  return <span className="spinner" aria-hidden />;
}
