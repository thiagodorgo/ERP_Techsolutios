import { CheckCircle2, AlertTriangle, Info, Loader2 } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { Modal } from "../../../../components/ui";
import type { CloudBillingAccess } from "../cloud-billing.access";
import type { CloudBillingView } from "../cloud-billing.state";
import type { CloudBillingActions } from "../useCloudBillingActions";

// B-ASS-10b (T5) — peças comuns às 10 janelas da tela de custo e margem (plano v2 §4.1.6, §6.4). Cada janela faz no
// máximo UMA requisição que não é GET por confirmação (R-GRP); depois do sucesso, a tela relê o mês (`onDone`) e nenhum
// valor é "previsto" no front.

export type DialogProps = {
  readonly model: CloudBillingView;
  readonly access: CloudBillingAccess;
  readonly actions: CloudBillingActions;
  readonly onClose: () => void;
  /** Depois de uma escrita com sucesso: a tela relê o mês. */
  readonly onDone: () => void;
  readonly onMonth: (month: string) => void;
};

export type Phase = "form" | "sending" | "final";
export type Notice = { readonly tone: "ok" | "warning" | "danger" | "info"; readonly title: string; readonly detail?: string };

export function NoticeBox({ notice }: { readonly notice: Notice | null }) {
  if (!notice) return null;
  const Icon = notice.tone === "ok" ? CheckCircle2 : notice.tone === "info" ? Info : AlertTriangle;
  const tone = notice.tone === "ok" ? "info" : notice.tone;
  return (
    <div className={`ui-alert ui-alert--${tone} cb-notice`} role={notice.tone === "danger" ? "alert" : "status"} data-aviso={notice.tone}>
      <Icon size={16} aria-hidden="true" />
      <span>
        <b>{notice.title}</b>
        {notice.detail ? ` ${notice.detail}` : null}
      </span>
    </div>
  );
}

export function Sending({ text }: { readonly text: string }) {
  return (
    <div className="ui-alert ui-alert--info cb-notice" role="status" aria-busy="true">
      <Loader2 size={16} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

/**
 * A moldura das janelas, com o comportamento da referência (`abrirModal`/`fecharModal` da maquete): ao abrir, o foco vai
 * ao campo marcado `data-autofoco` (ou ao "Fechar" do cabeçalho); Escape fecha; ao fechar, o foco volta a quem abriu.
 * O `Modal` da biblioteca não faz isso, e a biblioteca está fora do escopo do bloco (achado da conferência, F11).
 */
export function DialogFrame({ title, onClose, children, footer, size = "md" }: { readonly title: string; readonly onClose: () => void; readonly children: ReactNode; readonly footer: ReactNode; readonly size?: "md" | "lg" }) {
  const frame = useRef<HTMLDivElement | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
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
    <Modal title={title} open onClose={onClose} size={size}>
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
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

export function CloseButton({ onClose, label = "Fechar" }: { readonly onClose: () => void; readonly label?: string }) {
  return (
    <button type="button" className="pat-btn" onClick={onClose}>
      {label}
    </button>
  );
}
