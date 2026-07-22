import { CalendarClock, Send, Users } from "lucide-react";
import type { CSSProperties, ReactNode, Ref } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, Button, Checkbox, EmptyState, Input, Modal, Select, Skeleton } from "../../../components/ui";
import type { NotificationApiContext } from "../notification.types";
import {
  interpretCreateError,
  REMIND_BEFORE_OPTIONS,
  validateScheduledNotification,
  VISIBILITY_OPTIONS,
} from "../scheduled-notification.adapter";
import { createScheduledNotification, listRecipientCandidates } from "../scheduled-notification.service";
import type {
  RecipientOption,
  ScheduledNotificationSourceType,
  ScheduledNotificationView,
  ScheduledNotificationVisibility,
} from "../scheduled-notification.types";

// Ω4C PR-04 (D-Ω4C-NOTIF-CENTRAL-SPLIT) — popup REUTILIZÁVEL de criação de notificação agendada. Recria o
// COMPORTAMENTO do modal "Cadastrar notificação (avulsa)" do AutEM (Data e Hora* · Antecedência · Título* ·
// Mensagem* · Tipo* PRIVADA/PÚBLICA/PERSONALIZADA, com picker de destinatários no PERSONALIZADA) no visual do
// ERP. Manutenção (PR-06) e Multa/Seguro (PR-09) vão invocá-lo depois via as props `defaults`/`source`.
// Modal com SEÇÕES tituladas (Quando · Conteúdo · Destinatários). §2.8: picker só nome/id. Feedback inline por
// Alert (o design system não tem toast).

const sectionStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-10)" };
const sectionTitleStyle: CSSProperties = {
  fontSize: "var(--text-xs)",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--text-secondary)",
  margin: 0,
  display: "flex",
  alignItems: "center",
  gap: "var(--space-6)",
};
const gridStyle: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-12)" };
const formStyle: CSSProperties = { display: "flex", flexDirection: "column", gap: "var(--space-16)", padding: "var(--space-4) 0" };
const hintStyle: CSSProperties = { fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0 };
const pickerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-8)",
  maxHeight: "220px",
  overflowY: "auto",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-8)",
  padding: "var(--space-12)",
  background: "var(--surface-panel)",
};
const actionsStyle: CSSProperties = { display: "flex", gap: "var(--space-8)", justifyContent: "flex-end", flexWrap: "wrap" };
const textareaStyle: CSSProperties = { resize: "vertical", minHeight: "84px" };

function SectionTitle({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <h3 style={sectionTitleStyle}>
      {icon}
      {children}
    </h3>
  );
}

// ── View pura (SSR-testável; totalmente controlada pelo container) ────────────────
export type CreateNotificationFormProps = {
  readonly notifyAt: string;
  readonly remindBefore: string;
  readonly title: string;
  readonly message: string;
  readonly visibility: ScheduledNotificationVisibility;
  readonly recipients: readonly RecipientOption[];
  readonly recipientsLoading: boolean;
  readonly recipientsUnavailable: boolean;
  readonly selectedRecipientIds: readonly string[];
  readonly feedback: { readonly tone: "success" | "danger"; readonly message: string } | null;
  readonly fieldError: string | null;
  readonly busy: boolean;
  readonly titleRef?: Ref<HTMLInputElement>;
  readonly onNotifyAtChange: (value: string) => void;
  readonly onRemindBeforeChange: (value: string) => void;
  readonly onTitleChange: (value: string) => void;
  readonly onMessageChange: (value: string) => void;
  readonly onVisibilityChange: (value: ScheduledNotificationVisibility) => void;
  readonly onToggleRecipient: (id: string) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
};

export function CreateNotificationForm({
  notifyAt,
  remindBefore,
  title,
  message,
  visibility,
  recipients,
  recipientsLoading,
  recipientsUnavailable,
  selectedRecipientIds,
  feedback,
  fieldError,
  busy,
  titleRef,
  onNotifyAtChange,
  onRemindBeforeChange,
  onTitleChange,
  onMessageChange,
  onVisibilityChange,
  onToggleRecipient,
  onSubmit,
  onCancel,
}: CreateNotificationFormProps) {
  const selectedHint = visibility === "custom" ? `${selectedRecipientIds.length} destinatário(s) selecionado(s)` : null;

  return (
    <form
      style={formStyle}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {feedback ? (
        <Alert title={feedback.tone === "success" ? "Tudo certo" : "Ação não concluída"} tone={feedback.tone === "success" ? "info" : "danger"}>
          {feedback.message}
        </Alert>
      ) : null}
      {fieldError ? (
        <Alert title="Revise os campos" tone="warning">
          {fieldError}
        </Alert>
      ) : null}

      {/* Seção 1 — Quando */}
      <section style={sectionStyle}>
        <SectionTitle icon={<CalendarClock size={14} aria-hidden />}>Quando</SectionTitle>
        <div style={gridStyle}>
          <Input
            label="Data e Hora *"
            type="datetime-local"
            value={notifyAt}
            onChange={(event) => onNotifyAtChange(event.target.value)}
          />
          <Select label="Antecedência" value={remindBefore} onChange={(event) => onRemindBeforeChange(event.target.value)}>
            {REMIND_BEFORE_OPTIONS.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <p style={hintStyle}>A antecedência gera um lembrete antes da data e hora escolhidas.</p>
      </section>

      {/* Seção 2 — Conteúdo */}
      <section style={sectionStyle}>
        <SectionTitle icon={<Send size={14} aria-hidden />}>Conteúdo</SectionTitle>
        <label className="ui-field">
          <span>Título *</span>
          <input
            className="ui-input"
            value={title}
            maxLength={200}
            autoComplete="off"
            ref={titleRef}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>
        <label className="ui-field">
          <span>Mensagem *</span>
          <textarea
            className="ui-input"
            style={textareaStyle}
            value={message}
            maxLength={2000}
            rows={3}
            onChange={(event) => onMessageChange(event.target.value)}
          />
        </label>
      </section>

      {/* Seção 3 — Destinatários */}
      <section style={sectionStyle}>
        <SectionTitle icon={<Users size={14} aria-hidden />}>Destinatários</SectionTitle>
        <Select
          label="Tipo *"
          value={visibility}
          onChange={(event) => onVisibilityChange(event.target.value as ScheduledNotificationVisibility)}
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {`${option.label} — ${option.hint}`}
            </option>
          ))}
        </Select>

        {visibility === "custom" ? (
          <div style={pickerStyle} role="group" aria-label="Selecionar destinatários">
            {recipientsUnavailable ? (
              <Alert title="Destinatários indisponíveis" tone="warning">
                Não foi possível carregar os usuários da organização agora. Tente novamente mais tarde.
              </Alert>
            ) : recipientsLoading ? (
              <Skeleton lines={3} />
            ) : recipients.length === 0 ? (
              <EmptyState title="Nenhum usuário disponível" detail="Não há usuários ativos para selecionar nesta organização." />
            ) : (
              recipients.map((recipient) => (
                <Checkbox
                  key={recipient.id}
                  label={recipient.name}
                  checked={selectedRecipientIds.includes(recipient.id)}
                  onChange={() => onToggleRecipient(recipient.id)}
                />
              ))
            )}
          </div>
        ) : null}
        {selectedHint ? <p style={hintStyle}>{selectedHint}</p> : null}
      </section>

      <div style={actionsStyle}>
        <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Agendando…" : "Agendar notificação"}
        </Button>
      </div>
    </form>
  );
}

// ── Container: estado do formulário + Modal + submit ao backend ──────────────────
export type CreateNotificationDialogProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly context: NotificationApiContext;
  readonly onCreated?: (created: ScheduledNotificationView) => void;
  // Consumidores (Manutenção/Multa/Seguro) pré-preenchem o conteúdo e amarram a fonte (contrato foundation).
  readonly defaults?: { readonly title?: string; readonly message?: string; readonly notifyAt?: string };
  readonly source?: { readonly sourceType?: ScheduledNotificationSourceType; readonly sourceId?: string };
};

export function CreateNotificationDialog({ open, onClose, context, onCreated, defaults, source }: CreateNotificationDialogProps) {
  const [notifyAt, setNotifyAt] = useState(defaults?.notifyAt ?? "");
  const [remindBefore, setRemindBefore] = useState("");
  const [title, setTitle] = useState(defaults?.title ?? "");
  const [message, setMessage] = useState(defaults?.message ?? "");
  const [visibility, setVisibility] = useState<ScheduledNotificationVisibility>("private");
  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [recipientsUnavailable, setRecipientsUnavailable] = useState(false);
  const [recipientsLoaded, setRecipientsLoaded] = useState(false);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // A11y — foco no primeiro campo textual ao abrir.
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // Carrega candidatos a destinatário SÓ quando o Tipo vira PERSONALIZADA (reuso de GET /users; §2.8 nome/id).
  useEffect(() => {
    if (!open || visibility !== "custom" || recipientsLoaded) return;
    let active = true;
    setRecipientsLoading(true);
    listRecipientCandidates(context)
      .then((result) => {
        if (!active) return;
        setRecipients(result.items);
        setRecipientsUnavailable(result.unavailable);
        setRecipientsLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setRecipients([]);
        setRecipientsUnavailable(true);
        setRecipientsLoaded(true);
      })
      .finally(() => {
        if (active) setRecipientsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, visibility, recipientsLoaded, context]);

  const toggleRecipient = useCallback((id: string) => {
    setSelectedRecipientIds((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  }, []);

  function resetForm() {
    setNotifyAt(defaults?.notifyAt ?? "");
    setRemindBefore("");
    setTitle(defaults?.title ?? "");
    setMessage(defaults?.message ?? "");
    setVisibility("private");
    setSelectedRecipientIds([]);
    setFieldError(null);
  }

  async function handleSubmit() {
    const problems = validateScheduledNotification({ title, message, notifyAt, visibility, selectedRecipientIds });
    if (problems.length > 0) {
      setFieldError(problems[0]);
      setFeedback(null);
      return;
    }
    setFieldError(null);
    setFeedback(null);
    setBusy(true);
    try {
      const created = await createScheduledNotification(context, {
        title,
        message,
        notifyAt,
        remindBeforeMinutes: remindBefore ? Number(remindBefore) : null,
        visibility,
        customRecipientIds: visibility === "custom" ? selectedRecipientIds : undefined,
        sourceType: source?.sourceType,
        sourceId: source?.sourceId,
      });
      setFeedback({ tone: "success", message: "Notificação agendada com sucesso." });
      resetForm();
      if (created) onCreated?.(created);
    } catch (err) {
      setFeedback({ tone: "danger", message: interpretCreateError(err) });
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setFeedback(null);
    setFieldError(null);
    onClose();
  }

  return (
    <Modal title="Nova notificação" open={open} onClose={handleClose}>
      <CreateNotificationForm
        notifyAt={notifyAt}
        remindBefore={remindBefore}
        title={title}
        message={message}
        visibility={visibility}
        recipients={recipients}
        recipientsLoading={recipientsLoading}
        recipientsUnavailable={recipientsUnavailable}
        selectedRecipientIds={selectedRecipientIds}
        feedback={feedback}
        fieldError={fieldError}
        busy={busy}
        titleRef={titleRef}
        onNotifyAtChange={setNotifyAt}
        onRemindBeforeChange={setRemindBefore}
        onTitleChange={setTitle}
        onMessageChange={setMessage}
        onVisibilityChange={(value) => {
          setVisibility(value);
          setFieldError(null);
        }}
        onToggleRecipient={toggleRecipient}
        onSubmit={() => void handleSubmit()}
        onCancel={handleClose}
      />
    </Modal>
  );
}

export default CreateNotificationDialog;
