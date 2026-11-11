import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Accordion, Alert, Button, Input, Modal } from "../../../../components/ui";
import { getServiceItem } from "../../service-catalog/service-catalog.service";
import {
  APPROVE_FORM_MESSAGE_FIELD,
  createApproveSubmitter,
  loadDestinationRule,
  type ApproveErrorOutcome,
  type ApproveFormField,
  type ApproveFormInput,
  type DestinationRule,
} from "../service-quote-approve.model";
import { formatMoney } from "../service-quotes.adapter";
import { approveServiceQuote } from "../service-quotes.service";
import type { ServiceQuoteRow, ServiceQuotesApiContext } from "../service-quotes.types";

// B-SAN3-08 (item 40 do portão) — diálogo ÚNICO de aprovação de orçamento, usado pela aba Orçamento da OS e pela tela
// Orçamentos. Tela-modelo: `ServiceQuoteFormModal.tsx` (mesmo `Modal`, `Input`, `Alert`, `Button` da biblioteca, mesma grade
// e mesmo padrão de campo com erro); os campos e a cópia de origem e destino vêm dos cards de `WorkOrderForm.tsx`.
// Herda a aparência da tela que o abre, sem as 3 opções (decisão do dono, `D-PORTAO-7-RECOMENDACOES-1011`).
// A regra de negócio (validação, desfecho de cada recusa, trava de envio duplo) mora no modelo puro.

type FormState = Omit<ApproveFormInput, "destinationRule">;
type FieldKey = keyof FormState;

const FIELD_ID: Record<FieldKey, string> = {
  serviceAddress: "approve-field-service-address",
  serviceCity: "approve-field-service-city",
  serviceState: "approve-field-service-state",
  serviceZipCode: "approve-field-service-zip",
  serviceLatitude: "approve-field-service-lat",
  serviceLongitude: "approve-field-service-lng",
  destinationAddress: "approve-field-destination-address",
  destinationCity: "approve-field-destination-city",
  destinationState: "approve-field-destination-state",
  destinationZipCode: "approve-field-destination-zip",
  destinationLatitude: "approve-field-destination-lat",
  destinationLongitude: "approve-field-destination-lng",
  activationMode: "approve-field-activation-mode",
};

// Tempo máximo para saber se o serviço exige destino; passou disso, a regra fica "desconhecida" e o servidor decide.
const RULE_TIMEOUT_MS = 8000;

const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-12)" };
const fullWidth: CSSProperties = { gridColumn: "1 / -1" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: "var(--space-8)", marginTop: "var(--space-16)" };
const bodyStyle: CSSProperties = { display: "grid", gap: "var(--space-12)", maxHeight: "min(64vh, 560px)", overflowY: "auto", paddingRight: "var(--space-4)" };
const sectionTitleStyle: CSSProperties = { margin: 0, fontSize: "var(--text-sm)", fontWeight: 800, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" };
const summaryStyle: CSSProperties = { margin: "0 0 var(--space-12)", fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const statusStyle: CSSProperties = { margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const touchTarget: CSSProperties = { minHeight: 44 };

export function ServiceQuoteApproveDialog({
  context,
  quote,
  destinationRule,
  onApproved,
  onReload,
  onNotice,
  onClose,
}: {
  readonly context: ServiceQuotesApiContext;
  readonly quote: Pick<ServiceQuoteRow, "id" | "serviceCatalogId" | "number" | "frozenTotal" | "frozenCurrency">;
  // Regra já conhecida (teste, SSR). Sem ela, o diálogo lê o serviço do catálogo ao abrir.
  readonly destinationRule?: DestinationRule;
  readonly onApproved: (workOrderId: string | null) => void;
  readonly onReload: () => void;
  // Mensagem para a tela que abriu o diálogo: "info" é aviso, "danger" é erro.
  readonly onNotice: (text: string, tone: "info" | "danger") => void;
  readonly onClose: () => void;
}) {
  const [rule, setRule] = useState<DestinationRule | "loading">(destinationRule ?? "loading");
  const [form, setForm] = useState<FormState>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ApproveFormField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);

  const contextRef = useRef(context);
  contextRef.current = context;

  // Envio com trava de envio duplo (R-A2). Um submetedor por orçamento aberto.
  const submit = useMemo(
    () => createApproveSubmitter({ approve: (payload) => approveServiceQuote(contextRef.current, quote.id, payload) }),
    [quote.id],
  );

  useEffect(() => {
    if (destinationRule) return;
    let cancelled = false;
    void loadDestinationRule(() => withTimeout(getServiceItem(contextRef.current, quote.serviceCatalogId), RULE_TIMEOUT_MS)).then((loaded) => {
      // A recusa do servidor ("exige destino") nunca é desfeita por uma leitura que chegou depois.
      if (!cancelled) setRule((current) => (current === "loading" ? loaded : current));
    });
    return () => {
      cancelled = true;
    };
  }, [destinationRule, quote.serviceCatalogId]);

  useEffect(() => {
    if (!focusTarget) return;
    focusField(focusTarget);
    setFocusTarget(null);
  }, [focusTarget]);

  const destinationRequired = rule === "required";
  const loadingRule = rule === "loading";

  function update(key: FieldKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyOutcome(outcome: ApproveErrorOutcome) {
    switch (outcome.action) {
      case "keep_open_require_destination":
        setRule("required");
        setServerError(outcome.message);
        setFocusTarget(FIELD_ID.destinationAddress);
        return;
      case "keep_open":
        setServerError(outcome.message);
        return;
      case "blocked":
        setServerError(outcome.message);
        setBlocked(true);
        return;
      case "close_and_reload":
      case "close_and_reload_notice":
        onNotice(outcome.message, outcome.action === "close_and_reload_notice" ? "info" : "danger");
        onReload();
        onClose();
        return;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loadingRule || blocked) return;
    setServerError(null);
    setSaving(true);
    const result = await submit({ ...form, destinationRule: rule });
    if (result.kind === "ignored") return;
    setSaving(false);
    if (result.kind === "invalid") {
      const errors: Partial<Record<ApproveFormField, string>> = {};
      for (const message of result.errors) {
        const field = APPROVE_FORM_MESSAGE_FIELD[message];
        if (field && !errors[field]) errors[field] = message;
      }
      setFieldErrors(errors);
      const first = APPROVE_FORM_MESSAGE_FIELD[result.errors[0]];
      if (first) setFocusTarget(FIELD_ID[first]);
      return;
    }
    setFieldErrors({});
    if (result.kind === "approved") {
      onApproved(result.workOrderId);
      return;
    }
    applyOutcome(result.outcome);
  }

  const destinationFields = (
    <div style={gridStyle}>
      <div style={fullWidth}>
        <Field
          id={FIELD_ID.destinationAddress}
          label="Endereço de destino"
          required={destinationRequired}
          value={form.destinationAddress ?? ""}
          onChange={(value) => update("destinationAddress", value)}
          error={fieldErrors.destinationAddress}
          helper={destinationRequired ? "Informe o endereço ou a latitude e a longitude do destino." : undefined}
        />
      </div>
      <Field id={FIELD_ID.destinationCity} label="Cidade" value={form.destinationCity ?? ""} onChange={(value) => update("destinationCity", value)} />
      <Field id={FIELD_ID.destinationState} label="Estado" value={form.destinationState ?? ""} onChange={(value) => update("destinationState", value)} maxLength={2} />
      <Field id={FIELD_ID.destinationZipCode} label="CEP" value={form.destinationZipCode ?? ""} onChange={(value) => update("destinationZipCode", value)} />
      <div />
      <Field
        id={FIELD_ID.destinationLatitude}
        label="Latitude"
        value={form.destinationLatitude ?? ""}
        onChange={(value) => update("destinationLatitude", value)}
        error={fieldErrors.destinationLatitude}
        inputMode="decimal"
      />
      <Field
        id={FIELD_ID.destinationLongitude}
        label="Longitude"
        value={form.destinationLongitude ?? ""}
        onChange={(value) => update("destinationLongitude", value)}
        error={fieldErrors.destinationLongitude}
        inputMode="decimal"
      />
    </div>
  );

  return (
    <Modal title="Aprovar orçamento" open onClose={saving ? () => undefined : onClose}>
      <form onSubmit={handleSubmit} noValidate>
        <p style={summaryStyle}>
          {quote.number ?? "Orçamento sem número"} · Total {formatMoney(quote.frozenTotal, quote.frozenCurrency)}
        </p>

        <div style={bodyStyle}>
          <Alert title="Será criada uma nova ordem de serviço." tone="info">
            A ordem de serviço nasce com os endereços informados aqui e com o preço congelado deste orçamento.
          </Alert>

          {serverError ? (
            <div role="alert">
              <Alert title="Não foi possível aprovar" tone="danger">
                {serverError}
              </Alert>
            </div>
          ) : null}

          {loadingRule ? (
            <p style={statusStyle} role="status">
              Conferindo se este serviço exige endereço de destino…
            </p>
          ) : null}

          {rule === "unknown" ? (
            <Alert title="Não foi possível confirmar se este serviço exige destino" tone="warning">
              Se exigir, a aprovação vai pedir o endereço de destino antes de criar a ordem de serviço.
            </Alert>
          ) : null}

          <h3 style={sectionTitleStyle}>Origem do atendimento</h3>
          <div style={gridStyle}>
            <div style={fullWidth}>
              <Field id={FIELD_ID.serviceAddress} label="Endereço de origem" value={form.serviceAddress ?? ""} onChange={(value) => update("serviceAddress", value)} />
            </div>
            <Field id={FIELD_ID.serviceCity} label="Cidade" value={form.serviceCity ?? ""} onChange={(value) => update("serviceCity", value)} />
            <Field id={FIELD_ID.serviceState} label="Estado" value={form.serviceState ?? ""} onChange={(value) => update("serviceState", value)} maxLength={2} />
            <Field id={FIELD_ID.serviceZipCode} label="CEP" value={form.serviceZipCode ?? ""} onChange={(value) => update("serviceZipCode", value)} />
            <div />
            <Field
              id={FIELD_ID.serviceLatitude}
              label="Latitude"
              value={form.serviceLatitude ?? ""}
              onChange={(value) => update("serviceLatitude", value)}
              error={fieldErrors.serviceLatitude}
              inputMode="decimal"
            />
            <Field
              id={FIELD_ID.serviceLongitude}
              label="Longitude"
              value={form.serviceLongitude ?? ""}
              onChange={(value) => update("serviceLongitude", value)}
              error={fieldErrors.serviceLongitude}
              inputMode="decimal"
            />
          </div>

          {rule === "optional" ? (
            <Accordion title="Adicionar destino">{destinationFields}</Accordion>
          ) : loadingRule ? null : (
            <>
              <h3 style={sectionTitleStyle}>Destino</h3>
              {destinationFields}
            </>
          )}

          <Input
            id={FIELD_ID.activationMode}
            label="Modo de acionamento (opcional)"
            value={form.activationMode ?? ""}
            maxLength={120}
            helper="Texto livre, até 120 caracteres."
            onChange={(event) => update("activationMode", event.target.value)}
          />
        </div>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" style={touchTarget} onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" style={touchTarget} disabled={saving || loadingRule || blocked}>
            {saving ? "Aprovando…" : "Aprovar"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  required,
  helper,
  maxLength,
  inputMode,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly required?: boolean;
  readonly helper?: string;
  readonly maxLength?: number;
  readonly inputMode?: "decimal";
}) {
  return (
    <div>
      <Input
        id={id}
        label={required ? `${label} *` : label}
        value={value}
        helper={helper}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function focusField(id: string) {
  if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
  const element = document.getElementById(id);
  if (element && typeof (element as HTMLElement).focus === "function") {
    (element as HTMLElement).focus();
  }
}
