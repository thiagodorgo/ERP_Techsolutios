import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useState } from "react";

import { bounceReasonRequired, CHEQUE_ACTION_LABELS, directionLabel } from "../cheque-actions";
import { cashImpactText, formatMoney, type CashImpact } from "../cheque-cash-impact";
import type { Cheque } from "../cheques.types";
import type { StateAction } from "../useChequeActions";

// B-SAN3-24 (24a, R-CAIXA) — a confirmação de 2 passos de toda ação de estado do cheque (depositar, compensar, devolver,
// cancelar, excluir), IGUAL nas 3 aparências. O texto do caixa sai SÓ do texto do `CashImpact` (cheque-cash-impact.ts), calculado pela
// direção do cheque: a tela nunca escreve o sentido do dinheiro. Devolver pede o motivo (obrigatório no cheque
// depositado vinculado a título, opcional nos demais).

const CONFIRM_LABELS: Readonly<Record<StateAction, string>> = {
  deposit: "Confirmar depósito",
  clear: "Confirmar compensação",
  bounce: "Confirmar devolução",
  cancel: "Confirmar cancelamento",
  delete: "Confirmar exclusão",
};

const TONES = {
  in: { bg: "#ECFDF5", border: "#A7F3D0", fg: "#047857", Icon: ArrowUpRight },
  out: { bg: "#FEF2F2", border: "#FECACA", fg: "#B91C1C", Icon: ArrowDownRight },
  none: { bg: "#F8FAFC", border: "#E2E8F0", fg: "#475569", Icon: Minus },
} as const;

export function ChequeClearConfirm({
  cheque,
  action,
  impact,
  accountLoading = false,
  busy,
  message,
  onConfirm,
  onCancel,
}: {
  readonly cheque: Cheque;
  readonly action: StateAction;
  readonly impact: CashImpact;
  /** J-547 C3-05 — o nome da conta ainda está carregando: o texto diz "na conta do cheque" e aparece o marcador. */
  readonly accountLoading?: boolean;
  readonly busy: boolean;
  readonly message?: string | null;
  readonly onConfirm: (reason: string) => void;
  readonly onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const reasonRequired = action === "bounce" && bounceReasonRequired(cheque);
  const tone = TONES[impact.movement];
  const Icon = tone.Icon;
  return (
    <div style={{ display: "grid", gap: 14, padding: "4px 2px 2px", color: "#0F172A" }}>
      <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
        <b>{`Cheque ${cheque.chequeNumber}`}</b>
        {` · ${cheque.bank} · ${formatMoney(cheque.amount)} · ${directionLabel(cheque.direction)}`}
      </p>
      <div
        role="status"
        data-impacto={impact.movement}
        style={{ display: "flex", gap: 10, alignItems: "flex-start", background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 10, padding: "12px 14px" }}
      >
        <Icon size={18} color={tone.fg} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13.5, fontWeight: 700, color: tone.fg, lineHeight: 1.45 }}>{cashImpactText(impact)}</span>
      </div>
      {accountLoading && impact.movement !== "none" ? (
        <p role="status" aria-busy="true" data-state="loading" style={{ display: "flex", alignItems: "center", gap: 8, margin: "-6px 0 0", fontSize: 12, color: "#64748B" }}>
          <span className="pat-skel" aria-hidden="true" style={{ display: "inline-block", width: 96, height: 10 }} />
          Carregando o nome da conta…
        </p>
      ) : null}
      {action === "bounce" ? (
        <label style={{ display: "grid", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
          {reasonRequired ? "Motivo da devolução (obrigatório)" : "Motivo da devolução (opcional)"}
          <textarea
            value={reason}
            maxLength={500}
            rows={3}
            onChange={(event) => setReason(event.currentTarget.value)}
            style={{ font: "inherit", fontWeight: 400, border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 10px", resize: "vertical" }}
          />
        </label>
      ) : null}
      {message ? (
        <p role="alert" className="pat-banner pat-banner--error" style={{ margin: 0 }}>
          {message}
        </p>
      ) : null}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="pat-btn" onClick={onCancel} disabled={busy}>
          Voltar
        </button>
        <button
          type="button"
          className="pat-btn pat-btn--primary"
          disabled={busy || (reasonRequired && reason.trim() === "")}
          aria-label={`${CONFIRM_LABELS[action]} do cheque ${cheque.chequeNumber}`}
          onClick={() => onConfirm(reason)}
        >
          {busy ? "Enviando…" : CONFIRM_LABELS[action]}
        </button>
      </div>
    </div>
  );
}

export function confirmTitle(action: StateAction): string {
  return `${CHEQUE_ACTION_LABELS[action]} cheque`;
}
