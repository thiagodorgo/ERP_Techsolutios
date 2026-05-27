import { AlertTriangle, ChevronDown, Eye, EyeOff, Info, Search, X } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "pending" | "audit";

export function Button({
  children,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  return (
    <button className={`ui-button ui-button--${variant} ui-button--${size}`} {...props}>
      {children}
    </button>
  );
}

export function Input({ label, helper, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; helper?: string }) {
  return (
    <label className="ui-field">
      {label ? <span>{label}</span> : null}
      <input className="ui-input" {...props} />
      {helper ? <small>{helper}</small> : null}
    </label>
  );
}

export function PasswordInput({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="ui-field">
      {label ? <span>{label}</span> : null}
      <span className="ui-password">
        <input className="ui-input" type={visible ? "text" : "password"} {...props} />
        <button type="button" aria-label={visible ? "Ocultar senha" : "Mostrar senha"} onClick={() => setVisible((value) => !value)}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  return (
    <label className="ui-field">
      {label ? <span>{label}</span> : null}
      <span className="ui-select">
        <select {...props}>{children}</select>
        <ChevronDown size={16} aria-hidden />
      </span>
    </label>
  );
}

export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="ui-checkbox">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`ui-badge ui-tone-${tone}`}>{children}</span>;
}

export function Chip({ children, tone = "default" }: { children: ReactNode; tone?: Tone }) {
  return <span className={`ui-chip ui-tone-${tone}`}>{children}</span>;
}

export function Alert({ title, children, tone = "info" }: { title: string; children: ReactNode; tone?: "info" | "warning" | "danger" }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <section className={`ui-alert ui-alert--${tone}`}>
      <Icon size={18} />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </section>
  );
}

export function Card({ children, title, action }: { children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <section className="ui-card">
      {title || action ? (
        <header className="ui-card__header">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Drawer({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="ui-overlay" role="presentation">
      <aside className="ui-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="ui-overlay ui-overlay--center" role="presentation">
      <section className="ui-modal" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function Accordion({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="ui-accordion">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <span>{title}</span>
        <ChevronDown size={16} className={open ? "is-open" : ""} />
      </button>
      {open ? <div>{children}</div> : null}
    </section>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="ui-tooltip">
      {children}
      <span role="tooltip">{label}</span>
    </span>
  );
}

export function Table<T>({
  columns,
  rows,
  keyForRow,
  onRowClick,
}: {
  columns: Array<{ key: string; header: string; render: (row: T) => ReactNode }>;
  rows: T[];
  keyForRow: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={keyForRow(row)} onClick={() => onRowClick?.(row)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ id: string; label: string }>;
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" className={active === tab.id ? "is-active" : ""} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="ui-skeleton" aria-busy="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="ui-state">
      <strong>{title}</strong>
      <p>{detail}</p>
    </section>
  );
}

export function ErrorState({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="ui-state ui-state--error">
      <AlertTriangle size={20} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </section>
  );
}

export function SearchBar({ value, onChange, placeholder = "Buscar" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="ui-search">
      <Search size={16} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
