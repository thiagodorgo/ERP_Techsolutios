import type { CSSProperties, ReactNode } from "react";

import { Input } from "../../../components/ui";

// Ω4C PR-08 — kit dos sub-modais de custódia. Diferenciação do AutEM: registro-principal (azul) ×
// registro-filho (laranja/âmbar). Faixa de destaque no topo, sem tocar o componente Modal compartilhado.

export const custodyGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
export const custodyFullWidth: CSSProperties = { gridColumn: "1 / -1" };
export const custodyFooterStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };

const accentStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--space-8)",
  marginBottom: "var(--space-12)",
  padding: "var(--space-8) var(--space-10)",
  borderLeft: "3px solid var(--color-status-warning)",
  borderRadius: "var(--radius-4)",
  background: "var(--surface-panel-muted)",
  fontSize: "var(--text-sm)",
  color: "var(--color-status-warning)",
  fontWeight: 700,
};

export function CustodyAccent({ children }: { readonly children: ReactNode }) {
  return <div style={accentStyle}>{children}</div>;
}

export function CustodyField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  maxLength,
  inputMode,
  helper,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly maxLength?: number;
  readonly inputMode?: "numeric" | "decimal";
  readonly helper?: string;
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        helper={helper}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <small className="form-error" id={`${id}-error`}>
          {error}
        </small>
      ) : null}
    </div>
  );
}

export function focusCustodyField(fieldIds: Record<string, string>, field: string) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(fieldIds[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
