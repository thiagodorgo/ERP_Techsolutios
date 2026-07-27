import type { CSSProperties } from "react";
import { useState } from "react";

import { Alert, Button, Card, EmptyState } from "../../../../components/ui";
import { actionsFrom, isTransitionSubmitEnabled, transitionProcess, TransitionError, type FsmAction } from "../fsm";
import type { ImpoundStatus, ProcessesApiContext } from "../processes.types";

// (6) Painel de transições da FSM — exibe botão SÓ para as arestas HABILITADAS a partir do estado atual (descritor
// estático `FSM_ACTIONS`, espelho de ENABLED_EDGES). A UI molda/valida (I3, reason); o backend é a AUTORIDADE
// (re-checa a vistoria real e o fundamento) e devolve 409 defensivo → transitionErrorMessage traduz para PT-BR.
const actionBox: CSSProperties = { border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, display: "flex", flexDirection: "column", gap: 8 };
const headRow: CSSProperties = { display: "flex", alignItems: "center", gap: 8 };
const hintStyle: CSSProperties = { fontSize: 12, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "6px 10px" };
const descStyle: CSSProperties = { fontSize: 13, color: "#475569", margin: 0 };

export function TransicaoFsmPanel({
  processId,
  status,
  inspectionComplete,
  canTransition,
  context,
  onDone,
}: {
  readonly processId: string;
  readonly status: ImpoundStatus;
  readonly inspectionComplete: boolean;
  readonly canTransition: boolean;
  readonly context: ProcessesApiContext;
  readonly onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<ImpoundStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = actionsFrom(status);

  async function submit(action: FsmAction) {
    if (busy !== null) return; // B1 — guarda de reentrância (belt-and-suspenders sobre o disabled): duplo-clique.
    setError(null);
    setBusy(action.to);
    try {
      await transitionProcess(context, processId, action.to, action.reasonRequired ? reason : undefined);
      setReason("");
      onDone();
    } catch (err) {
      setError(err instanceof TransitionError ? err.message : "Não foi possível concluir a transição.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Transição de estado">
      {!canTransition ? (
        <EmptyState
          title="Somente leitura"
          detail="Você não tem permissão para alterar o estado deste processo de custódia."
        />
      ) : actions.length === 0 ? (
        <EmptyState
          title="Nenhuma transição disponível"
          detail="Não há ação de custódia habilitada a partir do estado atual do processo."
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {error ? (
            <Alert title="Não foi possível concluir" tone="danger">
              {error}
            </Alert>
          ) : null}

          {actions.map((action) => {
            const Icon = action.icon;
            const inspectionBlocked = action.requiresInspection && !inspectionComplete;
            const enabled = isTransitionSubmitEnabled(action, { reason, inspectionComplete });
            const reasonFieldId = `fsm-reason-${action.to}`;
            return (
              <div key={action.to} style={actionBox}>
                <div style={headRow}>
                  <Icon size={16} aria-hidden color={action.tone === "danger" ? "#DC2626" : "#2563EB"} />
                  <strong style={{ fontSize: 14, color: "#0F172A" }}>{action.label}</strong>
                </div>
                <p style={descStyle}>{action.description}</p>

                {inspectionBlocked ? <p style={hintStyle}>Conclua a vistoria de recepção para habilitar esta ação.</p> : null}

                {action.reasonRequired ? (
                  <label className="ui-field" htmlFor={reasonFieldId}>
                    <span>Fundamento *</span>
                    <textarea
                      id={reasonFieldId}
                      className="ui-input"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      rows={3}
                      maxLength={400}
                      placeholder="Fundamento do ato (ex.: nº e vara da ordem judicial)."
                    />
                  </label>
                ) : null}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    type="button"
                    variant={action.tone === "danger" ? "danger" : "primary"}
                    onClick={() => void submit(action)}
                    disabled={!enabled || busy !== null}
                    aria-label={action.label}
                  >
                    {busy === action.to ? "Registrando…" : action.label}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default TransicaoFsmPanel;
