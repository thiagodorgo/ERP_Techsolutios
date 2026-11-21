import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Modal } from "../../../../components/ui";
import { errorText } from "../billing-ops.errors";
import type { ActionResult } from "../useBillingOpsActions";

// B-ASS-10c-OPERACAO — a casca das janelas de escrita (cópia da casca do T5, `cloud-billing/components/dialog.shared.tsx`,
// para o módulo novo; não importada de outro módulo, §6.1 do plano). O fluxo é o da maquete aprovada (`DLG`):
//   formulário → (revisão, "Passo 2 de 2 · nada foi enviado ainda") → enviando → resultado.
// UMA requisição por confirmação (R-UMA): o botão de confirmar fica DESABILITADO enquanto envia (o navegador não dispara
// clique em botão desabilitado). Toda recusa aparece pelo texto da lista fechada (`errorText`), nunca pelo código.

export type Phase = "form" | "review" | "sending" | "final";
export type Notice = { readonly tone: "ok" | "warning" | "danger" | "info"; readonly title: string; readonly detail?: string };

export function NoticeBox({ notice }: { readonly notice: Notice | null }) {
  if (!notice) return null;
  const Icon = notice.tone === "ok" ? CheckCircle2 : notice.tone === "info" ? Info : notice.tone === "danger" ? XCircle : AlertTriangle;
  const tone = notice.tone === "ok" ? "info" : notice.tone;
  return (
    <div className={`ui-alert ui-alert--${tone} cb-notice`} role={notice.tone === "danger" || notice.tone === "warning" ? "alert" : "status"} data-aviso={notice.tone}>
      <Icon size={16} aria-hidden="true" />
      <span>
        <b>{notice.title}</b>
        {notice.detail ? ` ${notice.detail}` : null}
      </span>
    </div>
  );
}

/**
 * A moldura das janelas: ao abrir, o foco vai ao campo marcado `data-autofoco` (ou ao "Fechar" do cabeçalho); Escape
 * fecha (menos enquanto envia); ao fechar, o foco volta a quem abriu.
 */
export function DialogFrame({ title, onClose, children, footer, busy = false }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode; readonly footer: ReactNode; readonly busy?: boolean }) {
  const frame = useRef<HTMLDivElement | null>(null);
  const close = useRef(onClose);
  close.current = busy ? () => undefined : onClose;
  useEffect(() => {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return undefined;
    const opener = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const dialog = frame.current?.closest?.("[role='dialog']");
      const target = (dialog?.querySelector?.("[data-autofoco]") ?? dialog?.querySelector?.("header button")) as HTMLElement | null | undefined;
      if (typeof target?.focus === "function") target.focus();
    }, 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function" && (typeof document.contains !== "function" || document.contains(opener))) opener.focus();
    };
  }, []);
  return (
    <Modal title={title} open onClose={() => close.current()} size="md">
      <div className="cb-dialog" ref={frame}>
        {children}
        <div className="cb-dialog__footer">{footer}</div>
      </div>
    </Modal>
  );
}

export function Summary({ items }: { readonly items: readonly { readonly label: string; readonly value: string }[] }) {
  return (
    <div className="cb-dialog__summary">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <b title={item.value}>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

/** O que a janela mostra depois da resposta de sucesso. */
export type SuccessView = { readonly message: string; readonly warning?: string; readonly extra?: { readonly label: string; readonly onClick: () => void } };

/** Como a janela reage a uma recusa: volta ao formulário (com algo a mais nele) ou mostra a recusa no resultado. */
export type RefusalHandling = "form" | "form-quiet" | "final";

export type ActionDialogProps<T> = {
  readonly title: string;
  /** Ação destrutiva: o confirmar usa a cor de perigo. */
  readonly danger?: boolean;
  /** Confirmação forte: o formulário vai a uma revisão ("Passo 2 de 2") antes de enviar. */
  readonly twoStep?: boolean;
  readonly confirmLabel: string;
  /** O formulário está pronto para seguir? (Inválido = o confirmar não envia.) */
  readonly valid: boolean;
  readonly form: ReactNode;
  readonly review?: ReactNode;
  /** Confirmação forte (emenda 1, E2): na revisão, o confirmar só habilita depois de o operador marcar que conferiu. */
  readonly reviewValid?: boolean;
  readonly onSubmit: () => Promise<ActionResult<T>>;
  readonly onSuccess: (value: T) => SuccessView;
  /** Recusa que volta ao formulário (ex.: o estorno que pede a caixa da nota; o ligar com a lista do que falta). */
  readonly onRefusal?: (reason: string, failed: readonly string[] | undefined) => RefusalHandling;
  /** Botões a mais no resultado de uma recusa (ex.: "Ver o canal"). */
  readonly refusalExtra?: (reason: string) => ReactNode;
  readonly onClose: () => void;
  /** Depois de uma escrita com sucesso: a tela relê. */
  readonly onDone: () => void;
};

export function ActionDialog<T>({ title, danger = false, twoStep = false, confirmLabel, valid, form, review, reviewValid = true, onSubmit, onSuccess, onRefusal, refusalExtra, onClose, onDone }: ActionDialogProps<T>) {
  const [phase, setPhase] = useState<Phase>("form");
  const [refusal, setRefusal] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const send = async () => {
    setPhase("sending");
    const result = await onSubmit();
    if (result.ok) {
      setSuccess(onSuccess(result.value));
      setPhase("final");
      onDone();
      return;
    }
    const handling = onRefusal?.(result.reason, result.failed) ?? "final";
    if (handling === "form" || handling === "form-quiet") {
      setRefusal(handling === "form" ? result.reason : null);
      setPhase("form");
    } else {
      setFailure(result.reason);
      setPhase("final");
    }
    // Recusa também relê: a situação do servidor pode ter mudado (a mensagem genérica promete isso).
    onDone();
  };

  const confirm = () => {
    if (phase === "form") {
      if (!valid) return;
      if (twoStep) {
        setPhase("review");
        return;
      }
    }
    if (phase === "review" && !reviewValid) return;
    void send();
  };

  const confirmClass = danger && (phase === "review" || !twoStep) ? "pat-btn cb-btn--danger-solid pat-btn--primary" : "pat-btn pat-btn--primary";
  let body: ReactNode;
  let footer: ReactNode;
  if (phase === "final") {
    body = success ? (
      <>
        <NoticeBox notice={{ tone: "ok", title: "Feito.", detail: success.message }} />
        {success.warning ? <NoticeBox notice={{ tone: "warning", title: "Atenção.", detail: success.warning }} /> : null}
      </>
    ) : (
      <NoticeBox notice={{ tone: "danger", title: "O servidor recusou. Nada foi alterado.", detail: errorText(failure) }} />
    );
    footer = (
      <>
        {success?.extra ? (
          <button type="button" className="pat-btn cb-btn--danger-solid pat-btn--primary" onClick={success.extra.onClick}>
            {success.extra.label}
          </button>
        ) : null}
        {!success && failure && refusalExtra ? refusalExtra(failure) : null}
        {!success ? (
          <button
            type="button"
            className="pat-btn"
            onClick={() => {
              setFailure(null);
              setPhase("form");
            }}
          >
            Voltar
          </button>
        ) : null}
        <button type="button" className="pat-btn pat-btn--primary" onClick={onClose} data-autofoco="">
          Fechar
        </button>
      </>
    );
  } else {
    const busyNow = phase === "sending";
    const reviewing = phase === "review" || (busyNow && twoStep);
    body =
      phase === "sending" ? (
        <div className="ui-alert ui-alert--info cb-notice" role="status" aria-busy="true">
          <Loader2 size={16} aria-hidden="true" />
          <span>Enviando ao servidor…</span>
        </div>
      ) : reviewing ? (
        review
      ) : (
        <>
          {form}
          {refusal ? <NoticeBox notice={{ tone: "danger", title: "O servidor recusou.", detail: errorText(refusal) }} /> : null}
        </>
      );
    footer = (
      <>
        <span className="cb-dialog__hint">{twoStep ? (reviewing ? "Passo 2 de 2 · nada foi enviado ainda" : "Passo 1 de 2") : ""}</span>
        {phase === "review" ? (
          <button type="button" className="pat-btn" onClick={() => setPhase("form")}>
            Voltar
          </button>
        ) : (
          <button type="button" className="pat-btn" onClick={onClose} disabled={busyNow}>
            Cancelar
          </button>
        )}
        <button type="button" className={confirmClass} onClick={confirm} disabled={phase === "sending"} aria-disabled={(phase === "form" && !valid) || (phase === "review" && !reviewValid) ? "true" : undefined} data-confirmar="">
          {phase === "sending" ? "Enviando…" : phase === "form" && twoStep ? "Revisar" : confirmLabel}
        </button>
      </>
    );
  }
  return (
    <DialogFrame title={title} onClose={onClose} footer={footer} busy={phase === "sending"}>
      {body}
    </DialogFrame>
  );
}

/** O campo de motivo (10 a 500 caracteres), com a contagem da maquete. */
export function ReasonField({ label, help, value, onChange, autoFocus = false }: { readonly label: string; readonly help: string; readonly value: string; readonly onChange: (value: string) => void; readonly autoFocus?: boolean }) {
  const length = value.length;
  const short = length > 0 && value.trim().length < 10;
  return (
    <label className="ui-field">
      <span>
        {label} <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span>
      </span>
      <textarea className="ui-input" rows={3} maxLength={500} value={value} onChange={(event) => onChange(event.currentTarget.value)} aria-invalid={short ? "true" : undefined} data-autofoco={autoFocus ? "" : undefined} />
      <small>
        {help} De 10 a 500 caracteres. {length} / 500{short ? ` · faltam ${10 - value.trim().length}` : ""}
      </small>
    </label>
  );
}

export const reasonOk = (value: string) => value.trim().length >= 10;
export const CHARGE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** O código da cobrança no painel do provedor (validado no campo, como o servidor). */
export function ChargeIdField({ value, onChange }: { readonly value: string; readonly onChange: (value: string) => void }) {
  const invalid = value.length > 0 && !CHARGE_ID.test(value);
  return (
    <label className="ui-field">
      <span>
        Código da cobrança no painel do provedor <span aria-hidden="true" style={{ color: "#b91c1c" }}>*</span>
      </span>
      <input className="ui-input pat-mono" autoComplete="off" spellCheck={false} value={value} onChange={(event) => onChange(event.currentTarget.value)} aria-invalid={invalid ? "true" : undefined} data-autofoco="" />
      {invalid ? (
        <span className="form-error" role="alert">
          {errorText("invalid_charge_id")}
        </span>
      ) : (
        <small>Copie do painel do provedor. Letras, números, hífen ou sublinhado, até 64 caracteres.</small>
      )}
    </label>
  );
}
