import { useState } from "react";

import { Alert, Button } from "../../../../components/ui";
import { DispatchReassignForm } from "../../dispatches/components/DispatchReassignForm";
import { DispatchStatusActions } from "../../dispatches/components/DispatchStatusActions";
import { reassignDispatch, updateDispatchStatus } from "../../dispatches/dispatches.service";
import type { DispatchesApiContext } from "../../dispatches/dispatches.types";
import type { OperationsMapDispatch } from "../operations-map.types";

type ActionMode = "status" | "cancel" | "reassign" | null;
type ActionFeedback = {
  readonly action: Exclude<ActionMode, null>;
  readonly message: string;
};

export function OperationsDispatchActionsPanel({
  dispatch,
  context,
  canUpdate,
  canCancel,
  canReassign,
  onChanged,
}: {
  readonly dispatch: OperationsMapDispatch;
  readonly context: DispatchesApiContext;
  readonly canUpdate: boolean;
  readonly canCancel: boolean;
  readonly canReassign: boolean;
  readonly onChanged: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<ActionMode>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelObservation, setCancelObservation] = useState("Despacho cancelado pelo Mapa Operacional.");
  const [savingCancel, setSavingCancel] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingReassign, setSavingReassign] = useState(false);
  const [error, setError] = useState<ActionFeedback | null>(null);
  const [success, setSuccess] = useState<ActionFeedback | null>(null);

  async function refreshAfterChange() {
    await onChanged();
    setMode(null);
  }

  async function cancelDispatch() {
    if (savingCancel) return;
    if (!globalThis.window.confirm("Confirmar cancelamento do despacho?")) return;

    setSavingCancel(true);
    setError(null);
    setSuccess(null);
    try {
      await updateDispatchStatus(context, dispatch.id, {
        status: "cancelled",
        observation: cancelObservation,
        reason: cancelReason,
      });
      await refreshAfterChange();
      setCancelReason("");
      setSuccess({ action: "cancel", message: "Despacho cancelado. Mapa atualizado com a nova situacao." });
    } catch {
      setError({
        action: "cancel",
        message: "Nao foi possivel cancelar o despacho pelo mapa. O despacho nao foi alterado localmente.",
      });
    } finally {
      setSavingCancel(false);
    }
  }

  const canUseActions = canUpdate || canCancel || canReassign;
  const isTerminalDispatch = dispatch.status === "completed" || dispatch.status === "cancelled" || dispatch.status === "failed";

  if (!canUseActions) {
    return (
      <section className="operations-map-dispatch-actions" aria-label="Acoes do despacho">
        <Alert title="Sem acoes disponiveis" tone="info">
          Seu perfil pode acompanhar este despacho, mas nao pode alterar status, cancelar ou reatribuir pelo mapa.
        </Alert>
      </section>
    );
  }

  if (isTerminalDispatch) {
    return (
      <section className="operations-map-dispatch-actions" aria-label="Acoes do despacho">
        <Alert title="Despacho terminal" tone="info">
          Este despacho esta em status final e nao permite novas acoes operacionais pelo mapa.
        </Alert>
      </section>
    );
  }

  return (
    <section className="operations-map-dispatch-actions" aria-label="Acoes do despacho">
      <header>
        <strong>Acoes do despacho</strong>
        {mode ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setMode(null)}>
            Fechar
          </Button>
        ) : null}
      </header>

      {error ? (
        <Alert title="Acao nao concluida" tone="warning">
          {error.message}
        </Alert>
      ) : null}
      {success ? (
        <Alert title="Acao concluida" tone="info">
          {success.message}
        </Alert>
      ) : null}

      <div className="operations-map-dispatch-actions__toolbar">
        {canUpdate ? (
          <Button type="button" size="sm" variant={mode === "status" ? "primary" : "secondary"} onClick={() => setMode("status")}>
            Alterar status
          </Button>
        ) : null}
        {canReassign ? (
          <Button type="button" size="sm" variant={mode === "reassign" ? "primary" : "secondary"} onClick={() => setMode("reassign")}>
            Reatribuir
          </Button>
        ) : null}
        {canCancel ? (
          <Button type="button" size="sm" variant={mode === "cancel" ? "primary" : "secondary"} onClick={() => setMode("cancel")}>
            Cancelar
          </Button>
        ) : null}
      </div>

      {mode === "status" && canUpdate ? (
        <DispatchStatusActions
          currentStatus={dispatch.status}
          canCancel={canCancel}
          disabled={savingStatus}
          onSubmit={async (payload) => {
            if (savingStatus) return;
            setSavingStatus(true);
            setError(null);
            setSuccess(null);
            try {
              await updateDispatchStatus(context, dispatch.id, payload);
              await refreshAfterChange();
              setSuccess({ action: "status", message: "Status do despacho atualizado. Mapa atualizado com os dados mais recentes." });
            } catch {
              setError({
                action: "status",
                message: "Nao foi possivel alterar o status pelo mapa. O despacho nao foi alterado localmente.",
              });
            } finally {
              setSavingStatus(false);
            }
          }}
        />
      ) : null}

      {mode === "reassign" && canReassign ? (
        <DispatchReassignForm
          currentOperatorUserId={dispatch.operatorUserId}
          disabled={savingReassign}
          onSubmit={async (payload) => {
            if (savingReassign) return;
            setSavingReassign(true);
            setError(null);
            setSuccess(null);
            try {
              await reassignDispatch(context, dispatch.id, payload);
              await refreshAfterChange();
              setSuccess({ action: "reassign", message: "Despacho reatribuido. Mapa atualizado com o novo operador." });
            } catch {
              setError({
                action: "reassign",
                message: "Nao foi possivel reatribuir o despacho pelo mapa. O despacho nao foi alterado localmente.",
              });
            } finally {
              setSavingReassign(false);
            }
          }}
        />
      ) : null}

      {mode === "cancel" && canCancel ? (
        <div className="work-order-action-form">
          <label className="ui-field">
            <span>Observação</span>
            <textarea value={cancelObservation} onChange={(event) => setCancelObservation(event.target.value)} disabled={savingCancel} />
          </label>
          <label className="ui-field">
            <span>Motivo do cancelamento</span>
            <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} disabled={savingCancel} />
          </label>
          <Button type="button" onClick={cancelDispatch} disabled={savingCancel || !cancelReason.trim()}>
            {savingCancel ? "Cancelando..." : "Confirmar cancelamento"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
