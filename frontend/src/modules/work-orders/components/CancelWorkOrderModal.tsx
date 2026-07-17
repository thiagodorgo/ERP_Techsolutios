import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";

import { Alert, Button, Modal } from "../../../components/ui";
import { ApiError } from "../../../services/api/client";
import { cancelWorkOrder } from "../work-orders.service";
import type { WorkOrderFinancialCancellationDecision, WorkOrdersApiContext } from "../work-orders.types";

// Ω3F-6b — cancelar a OS COM decisão financeira (contrato Ω3F-6a: POST /work-orders/:id/cancel).
// Cancelar aqui não é só mudar situação: decide o DESTINO DO DINHEIRO da OS. Por isso a decisão é
// obrigatória e SEM pré-seleção — o backend recusa default silencioso (422 invalid_financial_decision)
// e a UI não escolhe pelo gestor. C2 (J-Ω3F-6A): os rótulos abaixo são os do vídeo e os valores
// técnicos (keep/keep_unpaid/zero) SÓ existem no payload — nunca no texto da tela (§3).

const DECISIONS: readonly {
  readonly value: WorkOrderFinancialCancellationDecision;
  readonly label: string;
  readonly help: string;
}[] = [
  {
    value: "keep",
    label: "Manter valores",
    help: "os itens financeiros e o total desta OS continuam como estão",
  },
  {
    value: "keep_unpaid",
    label: "Manter sem remunerar o profissional",
    help: "os valores da OS continuam, mas o profissional que atendeu não recebe por ela",
  },
  {
    value: "zero",
    label: "Zerar itens",
    help: "os itens financeiros desta OS são removidos e o total vai a zero",
  },
];

const introStyle: CSSProperties = { fontSize: 13, color: "#475569", marginBottom: 14 };
const legendStyle: CSSProperties = { fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 8 };
const optionStyle: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 12px", border: "1px solid #E2E8F0", borderRadius: 10, cursor: "pointer", marginBottom: 8 };
const optionSelectedStyle: CSSProperties = { ...optionStyle, borderColor: "#2563EB", background: "#F8FAFF" };
const optionLabelStyle: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#0F172A" };
const optionHelpStyle: CSSProperties = { fontSize: 12, color: "#64748B", marginTop: 2 };
const textareaStyle: CSSProperties = { width: "100%", minHeight: 84, padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 9, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" };
const footerStyle: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 };

// Mapa de erro do backend → frase de negócio. A decisão e o motivo já são barrados antes do envio
// (guardas abaixo), então um 422 que CHEGA da rede é a OS não-cancelável (já cancelada/concluída).
function messageForCancelError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 422) return "Esta OS não pode ser cancelada. Ela pode já ter sido cancelada ou concluída.";
    if (err.status === 400) return "Informe o motivo do cancelamento.";
    if (err.status === 403) return "Você não tem permissão para cancelar esta ordem de serviço.";
    if (err.status === 404) return "Ordem de serviço não encontrada.";
    return err.safeMessage;
  }
  return "Não foi possível cancelar a ordem de serviço.";
}

export function CancelWorkOrderModal({
  workOrderId,
  workOrderCode,
  context,
  onClose,
  onCancelled,
}: {
  readonly workOrderId: string;
  readonly workOrderCode: string;
  readonly context: WorkOrdersApiContext;
  readonly onClose: () => void;
  readonly onCancelled: () => void;
}) {
  // Sem pré-seleção (null): a decisão financeira é uma escolha consciente do gestor.
  const [decision, setDecision] = useState<WorkOrderFinancialCancellationDecision | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!decision) {
      setError("Selecione a decisão financeira.");
      return;
    }
    if (!reason.trim()) {
      setError("Informe o motivo do cancelamento.");
      return;
    }

    setSaving(true);
    try {
      await cancelWorkOrder(context, workOrderId, { financialDecision: decision, reason: reason.trim() });
      onCancelled();
    } catch (err) {
      setError(messageForCancelError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Cancelar ordem de serviço" open onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate>
        {error ? (
          <Alert title="Não foi possível cancelar" tone="danger">
            {error}
          </Alert>
        ) : null}

        <p style={introStyle}>
          A OS {workOrderCode} será cancelada. Escolha o que acontece com os valores já lançados nela e registre o motivo.
        </p>

        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={legendStyle}>Decisão financeira *</legend>
          {DECISIONS.map((option) => {
            const selected = decision === option.value;
            return (
              <label key={option.value} style={selected ? optionSelectedStyle : optionStyle}>
                <input
                  type="radio"
                  name="wo-cancel-financial-decision"
                  checked={selected}
                  onChange={() => setDecision(option.value)}
                  style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: "#2563EB" }}
                />
                <span>
                  <span style={optionLabelStyle}>{option.label}</span>
                  <span style={{ ...optionHelpStyle, display: "block" }}>{option.help}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <label style={{ display: "block", marginTop: 14 }}>
          <span style={legendStyle}>Motivo *</span>
          <textarea
            id="wo-cancel-reason"
            value={reason}
            maxLength={1000}
            placeholder="Ex.: cliente desistiu do atendimento antes do deslocamento"
            aria-required
            style={textareaStyle}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>

        <footer style={footerStyle}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
          <Button type="submit" variant="danger" disabled={saving}>
            {saving ? "Cancelando…" : "Cancelar OS"}
          </Button>
        </footer>
      </form>
    </Modal>
  );
}

export default CancelWorkOrderModal;
