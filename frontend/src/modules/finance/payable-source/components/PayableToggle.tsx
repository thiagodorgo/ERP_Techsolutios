import { Banknote, Check, Undo2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Badge, Button, Checkbox, Input, Skeleton } from "../../../../components/ui";
import { ApiError } from "../../../../services/api/client";
import { formatBRL, parseAmountInput } from "../../titles/financial-titles.adapter";
import { launchPayable, removePayable } from "../payable-source.service";
import type { PayableSourceModule, PayableSourceSource, PayableTitleView } from "../payable-source.types";
import { usePayableSource } from "../usePayableSource";

// Ω4C PR-02 — PayableToggle: recria o COMPORTAMENTO do AutEM ("gerar lançamento em contas a pagar") no
// visual do ERP. DOIS modos:
//  • create — só o checkbox no cadastro; o parent captura a intenção e dispara `launchPayable` DEPOIS que
//    o create devolve o id da fonte (o id ainda não existe na hora do cadastro).
//  • edit   — consome usePayableSource(module,id): se lançado → badge "Lançado em contas a pagar" (verde)
//    + "Retirar" (DELETE, gated financial_titles:update); se não → "Lançar em contas a pagar" (mini-form
//    → POST, gated financial_titles:create). D-007: o badge é DERIVADO do backend (title!=null), nunca flag.
// §7: estados loading/acesso não permitido/dados desatualizados + feedback inline (Alert; o DS não tem toast).

const LAUNCH_LABEL = "Lançar em contas a pagar";
const LAUNCHED_LABEL = "Lançado em contas a pagar";
const REMOVE_LABEL = "Retirar";
const CREATE_CHECKBOX_LABEL = "Gerar lançamento em contas a pagar";

const wrapStyle: CSSProperties = {
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-8)",
  background: "var(--surface-panel)",
  padding: "var(--space-12)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-8)",
};
const titleRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-6)" };
const titleStyle: CSSProperties = { fontSize: "var(--text-sm)", fontWeight: 700, margin: 0 };
const hintStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0 };
const launchedRowStyle: CSSProperties = { display: "flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap", justifyContent: "space-between" };
const detailStyle: CSSProperties = { fontSize: "var(--text-sm)", color: "var(--text-secondary)" };
const formGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-10)" };
const formActionsStyle: CSSProperties = { display: "flex", gap: "var(--space-8)", justifyContent: "flex-end", flexWrap: "wrap" };

// Rótulo PT-BR do status do título (§3/§11.2: nunca o enum cru como texto principal).
const STATUS_LABEL: Record<string, string> = {
  open: "Em aberto",
  scheduled: "Agendado",
  partially_paid: "Parcial",
  paid: "Pago",
  in_dispute: "Em contestação",
  cancelled: "Cancelado",
};

function payableStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? "Em aberto";
}

function formatAmount(amount: number, currency: string): string {
  return currency === "BRL" ? formatBRL(amount) : `${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${currency}`;
}

function formatDueDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

// ── Dispatcher: escolhe o modo (create/edit) ─────────────────────────────────
export type PayableToggleProps =
  | { readonly mode: "create"; readonly checked: boolean; readonly onChange: (checked: boolean) => void; readonly disabled?: boolean }
  | {
      readonly mode: "edit";
      readonly module: PayableSourceModule;
      readonly id: string;
      readonly canLaunch: boolean;
      readonly canRemove: boolean;
      readonly defaults?: { readonly partyName?: string; readonly amount?: number };
    };

export function PayableToggle(props: PayableToggleProps) {
  if (props.mode === "create") {
    return <PayableCreateToggle checked={props.checked} onChange={props.onChange} disabled={props.disabled} />;
  }
  return <PayableEditToggle module={props.module} id={props.id} canLaunch={props.canLaunch} canRemove={props.canRemove} defaults={props.defaults} />;
}

// ── Modo CREATE: só o checkbox (a intenção é do parent; o POST vem após o create devolver o id) ──
export function PayableCreateToggle({
  checked,
  onChange,
  disabled,
}: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}) {
  return (
    <div style={wrapStyle}>
      <div style={titleRowStyle}>
        <Banknote size={15} aria-hidden style={{ color: "var(--text-secondary)" }} />
        <h4 style={titleStyle}>Financeiro</h4>
      </div>
      <Checkbox label={CREATE_CHECKBOX_LABEL} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <p style={hintStyle}>Ao salvar, este registro também gera um título a pagar no Financeiro.</p>
    </div>
  );
}

// ── Modo EDIT: consome o hook e liga as ações (Lançar/Retirar) à view pura ──
export function PayableEditToggle({
  module,
  id,
  canLaunch,
  canRemove,
  defaults,
}: {
  readonly module: PayableSourceModule;
  readonly id: string;
  readonly canLaunch: boolean;
  readonly canRemove: boolean;
  readonly defaults?: { readonly partyName?: string; readonly amount?: number };
}) {
  const { title, loading, forbidden, source, context, refresh } = usePayableSource(module, id);

  const [formOpen, setFormOpen] = useState(false);
  const [partyName, setPartyName] = useState(defaults?.partyName ?? "");
  const [amount, setAmount] = useState(
    defaults?.amount != null ? defaults.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "",
  );
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function handleLaunch() {
    const problems = validatePayableForm(partyName, amount, dueDate);
    if (problems.length > 0) {
      setFormError(problems[0]);
      return;
    }
    setFormError(null);
    setFeedback(null);
    setBusy(true);
    try {
      await launchPayable(context, module, id, {
        partyName: partyName.trim(),
        amount: parseAmountInput(amount),
        dueDate: new Date(dueDate).toISOString(),
      });
      setFeedback({ tone: "success", text: "Lançamento gerado em contas a pagar." });
      setFormOpen(false);
      await refresh();
    } catch (err) {
      setFeedback({ tone: "danger", text: launchErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (typeof window !== "undefined" && typeof window.confirm === "function" && !window.confirm("Retirar este registro de contas a pagar?")) return;
    setFeedback(null);
    setBusy(true);
    try {
      await removePayable(context, module, id);
      setFeedback({ tone: "success", text: "Lançamento retirado de contas a pagar." });
      await refresh();
    } catch (err) {
      setFeedback({ tone: "danger", text: removeErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PayableToggleView
      title={title}
      loading={loading}
      forbidden={forbidden}
      source={source}
      canLaunch={canLaunch}
      canRemove={canRemove}
      busy={busy}
      feedback={feedback}
      formOpen={formOpen}
      partyName={partyName}
      amount={amount}
      dueDate={dueDate}
      formError={formError}
      onOpenForm={() => {
        setFeedback(null);
        setFormError(null);
        setFormOpen(true);
      }}
      onCancelForm={() => {
        setFormOpen(false);
        setFormError(null);
      }}
      onPartyNameChange={setPartyName}
      onAmountChange={setAmount}
      onDueDateChange={setDueDate}
      onLaunch={() => void handleLaunch()}
      onRemove={() => void handleRemove()}
    />
  );
}

// ── View pura (SSR-testável com estados explícitos §7) ───────────────────────
export function PayableToggleView({
  title,
  loading,
  forbidden,
  source,
  canLaunch,
  canRemove,
  busy,
  feedback,
  formOpen,
  partyName,
  amount,
  dueDate,
  formError,
  onOpenForm,
  onCancelForm,
  onPartyNameChange,
  onAmountChange,
  onDueDateChange,
  onLaunch,
  onRemove,
}: {
  readonly title: PayableTitleView | null;
  readonly loading: boolean;
  readonly forbidden: boolean;
  readonly source: PayableSourceSource;
  readonly canLaunch: boolean;
  readonly canRemove: boolean;
  readonly busy: boolean;
  readonly feedback?: { tone: "success" | "danger"; text: string } | null;
  readonly formOpen: boolean;
  readonly partyName: string;
  readonly amount: string;
  readonly dueDate: string;
  readonly formError?: string | null;
  readonly onOpenForm: () => void;
  readonly onCancelForm: () => void;
  readonly onPartyNameChange: (value: string) => void;
  readonly onAmountChange: (value: string) => void;
  readonly onDueDateChange: (value: string) => void;
  readonly onLaunch: () => void;
  readonly onRemove: () => void;
}) {
  return (
    <section style={wrapStyle} aria-label="Contas a pagar">
      <div style={titleRowStyle}>
        <Banknote size={15} aria-hidden style={{ color: "var(--text-secondary)" }} />
        <h4 style={titleStyle}>Contas a pagar</h4>
      </div>

      {feedback ? (
        <Alert title={feedback.tone === "success" ? "Tudo certo" : "Ação não concluída"} tone={feedback.tone === "success" ? "info" : "danger"}>
          {feedback.text}
        </Alert>
      ) : null}

      {forbidden ? (
        <p style={detailStyle} role="status">
          Acesso não permitido: você não tem permissão para ver o lançamento financeiro deste registro.
        </p>
      ) : loading && !title ? (
        <Skeleton lines={2} />
      ) : title ? (
        // LANÇADO — badge derivado do backend (title != null). D-007.
        <div style={launchedRowStyle}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-8)", flexWrap: "wrap" }}>
            <Badge tone="success">
              <Check size={12} aria-hidden /> {LAUNCHED_LABEL}
            </Badge>
            <span style={detailStyle}>
              {formatAmount(title.amount, title.currency)} · vence {formatDueDate(title.dueDate)} · {payableStatusLabel(title.status)}
            </span>
          </span>
          {canRemove ? (
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRemove} aria-label="Retirar lançamento de contas a pagar">
              <Undo2 size={14} aria-hidden /> {REMOVE_LABEL}
            </Button>
          ) : null}
        </div>
      ) : formOpen ? (
        // NÃO lançado + mini-form aberto.
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-10)" }}>
          {formError ? (
            <Alert title="Revise os campos" tone="danger">
              {formError}
            </Alert>
          ) : null}
          <div style={formGridStyle}>
            <Input label="Fornecedor *" value={partyName} maxLength={160} autoComplete="off" onChange={(event) => onPartyNameChange(event.target.value)} />
            <Input label="Valor (R$) *" value={amount} inputMode="decimal" maxLength={16} helper="Ex.: 312,90" onChange={(event) => onAmountChange(event.target.value)} />
            <Input label="Vencimento *" type="date" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} />
          </div>
          <div style={formActionsStyle}>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancelForm}>
              Cancelar
            </Button>
            <Button type="button" size="sm" disabled={busy} onClick={onLaunch}>
              {busy ? "Gerando…" : "Gerar lançamento"}
            </Button>
          </div>
        </div>
      ) : (
        // NÃO lançado — CTA para lançar (gated financial_titles:create pelo parent).
        <div style={launchedRowStyle}>
          <span style={detailStyle}>Este registro ainda não gerou título em contas a pagar.</span>
          {canLaunch ? (
            <Button type="button" size="sm" disabled={busy} onClick={onOpenForm} aria-label={LAUNCH_LABEL}>
              <Banknote size={14} aria-hidden /> {LAUNCH_LABEL}
            </Button>
          ) : null}
        </div>
      )}

      {source === "fallback" && !forbidden ? (
        <Alert title="Dados podem estar desatualizados" tone="warning">
          Não foi possível confirmar o lançamento financeiro deste registro agora. Reabra a tela para tentar de novo.
        </Alert>
      ) : null}
    </section>
  );
}

// Validação do mini-form (PURA — espelha o backend; feedback imediato antes do POST).
export function validatePayableForm(partyName: string, amount: string, dueDate: string): string[] {
  const found: string[] = [];
  if (!partyName.trim()) found.push("Informe o fornecedor.");
  const parsed = parseAmountInput(amount);
  if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) found.push("Informe um valor maior que zero.");
  if (!dueDate.trim() || Number.isNaN(Date.parse(dueDate))) found.push("Informe uma data de vencimento válida.");
  return found;
}

function launchErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 409) return "Este registro já tem um lançamento em contas a pagar.";
    if (err.status === 422) return "Período contábil fechado: não é possível lançar neste período.";
    if (err.status === 404) return "Registro não encontrado.";
    if (err.status === 400) return "Dados inválidos. Revise os campos e tente novamente.";
    return err.safeMessage;
  }
  return "Não foi possível gerar o lançamento.";
}

function removeErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return "Não há lançamento ativo para retirar.";
    if (err.status === 422) return "Período contábil fechado: não é possível retirar neste período.";
    return err.safeMessage;
  }
  return "Não foi possível retirar o lançamento.";
}

export default PayableToggle;
