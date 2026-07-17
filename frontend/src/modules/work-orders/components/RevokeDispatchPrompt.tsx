import { Ban } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

// Ω3F-9 (D-Ω3F-9-REVOGAR) — prompt de MOTIVO para revogar o envio (cancelar o despacho ativo). O motivo é
// OBRIGATÓRIO (o backend recusa 400 cancel_reason_required); o botão fica `disabled` com o campo vazio — o
// backend é só a rede de segurança. §3: "envio", NUNCA "despacho/dispatch"; nada de status cru/UUID na UI.

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
  padding: 16,
};
const panel: CSSProperties = {
  background: "#fff",
  borderRadius: 16,
  padding: 22,
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 20px 50px rgba(15,23,42,.25)",
};

export function RevokeDispatchPrompt({
  workOrderCode,
  submitting,
  errorMessage,
  onConfirm,
  onClose,
}: {
  workOrderCode: string;
  submitting: boolean;
  errorMessage?: string | null;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const disabled = submitting || !trimmed;

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-label={`Revogar envio da ${workOrderCode}`} onClick={onClose}>
      <div style={panel} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <Ban size={18} aria-hidden style={{ color: "var(--color-status-danger)" }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Revogar envio</div>
        </div>
        <div style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>
          O envio ativo da {workOrderCode} será revogado. Informe o motivo — ele fica registrado no histórico.
        </div>

        <label htmlFor="revoke-reason" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
          Motivo
        </label>
        <textarea
          id="revoke-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Ex.: cliente remarcou o atendimento"
          style={{
            width: "100%",
            padding: "9px 11px",
            borderRadius: 10,
            border: "1px solid #CBD5E1",
            fontSize: 13,
            fontFamily: "inherit",
            color: "#0F172A",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />

        {errorMessage ? <div style={{ marginTop: 10, fontSize: 12, color: "#B91C1C" }}>{errorMessage}</div> : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 15px",
              borderRadius: 10,
              border: "1px solid #E2E8F0",
              background: "#fff",
              color: "#334155",
              fontSize: 13,
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Voltar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={disabled}
            style={{
              padding: "9px 15px",
              borderRadius: 10,
              border: "none",
              background: disabled ? "#FCA5A5" : "var(--color-status-danger)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              cursor: disabled ? "default" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {submitting ? "Revogando…" : "Revogar envio"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default RevokeDispatchPrompt;
