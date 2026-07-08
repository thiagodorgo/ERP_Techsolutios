import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Input, Modal } from "../../../../components/ui";
import { interpretMaintenanceSubmitError, parsePtBrNumber, validateCompletion } from "../maintenance-orders.adapter";
import { updateMaintenanceOrder } from "../maintenance-orders.service";
import type {
  MaintenanceCompletionDraft,
  MaintenanceCompletionField,
  MaintenanceOrder,
  MaintenanceOrdersApiContext,
} from "../maintenance-orders.types";

const FIELD_ID: Record<MaintenanceCompletionField, string> = {
  cost: "maintenance-complete-cost",
  completedAt: "maintenance-complete-date",
};

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const introStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)", marginBottom: "var(--space-12)" };

function todayDate(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Conclusão exige custo (R$) + data — espelha o 422 completion_requires_cost_and_date sob os campos.
export function MaintenanceCompletionModal({
  order,
  context,
  onClose,
  onCompleted,
}: {
  readonly order: MaintenanceOrder;
  readonly context: MaintenanceOrdersApiContext;
  readonly onClose: () => void;
  readonly onCompleted: (saved?: MaintenanceOrder) => void;
}) {
  const [cost, setCost] = useState(order.cost != null ? order.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  const [completedAt, setCompletedAt] = useState(order.completedAt ? order.completedAt.slice(0, 10) : todayDate());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<MaintenanceCompletionField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function buildDraft(): MaintenanceCompletionDraft {
    return { cost: parsePtBrNumber(cost), completedAt: completedAt.trim() || undefined };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    const draft = buildDraft();
    const errors = validateCompletion(draft);
    if (errors.length > 0) {
      setFieldErrors(Object.fromEntries(errors.map((error) => [error.field, error.message])) as Partial<Record<MaintenanceCompletionField, string>>);
      focusField(errors[0].field);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const saved = await updateMaintenanceOrder(context, order.id, {
        status: "concluida",
        cost: draft.cost as number,
        // data local (YYYY-MM-DD) → ISO na fronteira.
        completedAt: new Date(`${draft.completedAt}T00:00:00`).toISOString(),
      });
      onCompleted(saved ?? undefined);
    } catch (error) {
      // 422 de conclusão: completion_requires_cost_and_date sob o campo; invalid_status_transition
      // (concorrência) e odometer_regressive aparecem como Alerta de perigo.
      const feedback = interpretMaintenanceSubmitError(error, "completion");
      if (feedback.field === "cost" || feedback.field === "completedAt") {
        setFieldErrors((prev) => ({ ...prev, [feedback.field as MaintenanceCompletionField]: feedback.message }));
        focusField(feedback.field as MaintenanceCompletionField);
      }
      setServerError(feedback.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Concluir manutenção" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {serverError ? (
          <Alert title="Não foi possível concluir" tone="danger">
            {serverError}
          </Alert>
        ) : null}

        <p style={introStyle}>Informe o custo e a data para registrar a conclusão desta manutenção.</p>

        <div style={gridStyle}>
          <div>
            <Input
              id={FIELD_ID.cost}
              label="Custo (R$) *"
              value={cost}
              maxLength={14}
              inputMode="decimal"
              helper="Em reais. Ex.: 1.250,00"
              required
              aria-required
              aria-invalid={fieldErrors.cost ? true : undefined}
              aria-describedby={fieldErrors.cost ? `${FIELD_ID.cost}-error` : undefined}
              onChange={(event) => setCost(event.target.value)}
            />
            {fieldErrors.cost ? (
              <small className="form-error" id={`${FIELD_ID.cost}-error`}>
                {fieldErrors.cost}
              </small>
            ) : null}
          </div>

          <div>
            <Input
              id={FIELD_ID.completedAt}
              label="Concluída em *"
              type="date"
              value={completedAt}
              max={todayDate()}
              required
              aria-required
              aria-invalid={fieldErrors.completedAt ? true : undefined}
              aria-describedby={fieldErrors.completedAt ? `${FIELD_ID.completedAt}-error` : undefined}
              onChange={(event) => setCompletedAt(event.target.value)}
            />
            {fieldErrors.completedAt ? (
              <small className="form-error" id={`${FIELD_ID.completedAt}-error`}>
                {fieldErrors.completedAt}
              </small>
            ) : null}
          </div>
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Concluindo…" : "Concluir manutenção"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function focusField(field: MaintenanceCompletionField) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(FIELD_ID[field]);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
