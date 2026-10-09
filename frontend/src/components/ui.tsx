import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type Tone = "ok" | "warn" | "bad" | "info" | "muted" | "sim" | "accent";

export function Chip({ tone = "muted", children, title, icon }: { tone?: Tone; children: ReactNode; title?: string; icon?: IconName }) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  );
}

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`dot dot-${tone}`} aria-hidden />;
}

export function ConfidenceBar({ value, threshold, label = "Confidence" }: { value: number | null; threshold?: number; label?: string }) {
  if (value === null) return null;
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  const tone = threshold !== undefined && value < threshold ? "warn" : "ok";
  return (
    <div className="conf-wrap">
      <div className="conf-head">
        <span>{label}</span>
        <strong>{pct}%</strong>
      </div>
      <div className="conf" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`conf-fill conf-${tone}`} style={{ width: `${pct}%` }} />
        {threshold !== undefined && <div className="conf-threshold" style={{ left: `${threshold * 100}%` }} title={`Threshold ${Math.round(threshold * 100)}%`} />}
      </div>
    </div>
  );
}

export function Card({ title, icon, actions, children, className = "", subtitle }: {
  title?: ReactNode; icon?: IconName; actions?: ReactNode; children: ReactNode; className?: string; subtitle?: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          <div className="card-title">
            {icon && <span className="card-icon"><Icon name={icon} size={16} /></span>}
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p className="card-sub">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Notice({ tone = "info", children, title }: { tone?: Tone; children: ReactNode; title?: ReactNode }) {
  const icon: IconName = tone === "bad" || tone === "warn" ? "alert" : tone === "ok" ? "check" : "info";
  return (
    <div className={`notice notice-${tone}`} role={tone === "bad" ? "alert" : undefined}>
      <Icon name={icon} size={16} />
      <div>
        {title && <strong className="notice-title">{title}</strong>}
        {children}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden />
      {label && <span>{label}</span>}
    </span>
  );
}

export function Btn({ icon, children, variant = "default", size = "md", ...rest }: {
  icon?: IconName; children?: ReactNode; variant?: "default" | "primary" | "ghost" | "danger"; size?: "sm" | "md" | "lg";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`btn btn-${variant} btn-${size}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat" title={hint}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function Empty({ icon = "info", children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={22} />
      <div>{children}</div>
    </div>
  );
}
